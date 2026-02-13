#!/usr/bin/env python3
"""
Task #45: 月次ポイントリセット
- /api/cron/monthly-reset/route.ts: 毎月1日に monthly_points リセット
- contest_entries に前月ポイントを記録
- vercel.json にCron追加
"""

import os, re, json

# ============================================================
# 1. 月次ポイントリセット API
# ============================================================
MONTHLY_RESET_API = '''\
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/admin";

/**
 * 月次ポイントリセット Cron API
 * 毎月1日 0:10 JST に実行（月次大会作成の5分後）
 * Vercel Cron: "10 15 1 * *" (UTC 15:10 = JST 0:10)
 */
export async function GET(request: Request) {
  // Cron Secret チェック
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();
  const jstNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
  const year = jstNow.getFullYear();
  const month = jstNow.getMonth() + 1;

  // 前月情報
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;

  // 前月の大会を取得
  const { data: prevContest } = await admin
    .from("contests")
    .select("id")
    .eq("year", prevYear)
    .eq("month", prevMonth)
    .maybeSingle();

  // 全ユーザーの monthly_points を取得してから contest_entries に記録
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, monthly_points")
    .gt("monthly_points", 0);

  let recorded = 0;

  if (profiles && profiles.length > 0 && prevContest) {
    // contest_entries に前月の最終ポイントを記録（upsert）
    const entries = profiles.map((p) => ({
      contest_id: prevContest.id,
      user_id: p.id,
      total_points: p.monthly_points,
    }));

    // バッチで upsert（500件ずつ）
    for (let i = 0; i < entries.length; i += 500) {
      const batch = entries.slice(i, i + 500);
      const { error } = await admin
        .from("contest_entries")
        .upsert(batch, { onConflict: "contest_id,user_id" });
      if (error) {
        console.error(`Contest entries upsert error (batch ${i}):`, error);
      } else {
        recorded += batch.length;
      }
    }
  }

  // 全ユーザーの monthly_points をリセット
  const { error: resetError, count: resetCount } = await admin
    .from("profiles")
    .update({ monthly_points: 0 })
    .gt("monthly_points", 0);

  if (resetError) {
    console.error("Monthly points reset error:", resetError);
    return NextResponse.json({ error: resetError.message }, { status: 500 });
  }

  // ポイント履歴に記録
  if (profiles && profiles.length > 0) {
    const txRows = profiles.map((p) => ({
      user_id: p.id,
      amount: 0,
      description: `${prevYear}年${prevMonth}月 月間ポイントリセット（前月: ${p.monthly_points}P）`,
      reason: "monthly_reset",
    }));

    // バッチ挿入
    for (let i = 0; i < txRows.length; i += 500) {
      await admin.from("points_transactions").insert(txRows.slice(i, i + 500));
    }
  }

  // 今月の大会に全アクティブユーザーを参加登録
  const { data: currentContest } = await admin
    .from("contests")
    .select("id")
    .eq("year", year)
    .eq("month", month)
    .eq("status", "active")
    .maybeSingle();

  let enrolled = 0;
  if (currentContest) {
    // 直近30日以内に投票したアクティブユーザーを自動参加
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: activeUsers } = await admin
      .from("votes")
      .select("user_id")
      .gte("created_at", thirtyDaysAgo);

    const uniqueUsers = [...new Set((activeUsers ?? []).map((v) => v.user_id))];

    if (uniqueUsers.length > 0) {
      const enrollRows = uniqueUsers.map((uid) => ({
        contest_id: currentContest.id,
        user_id: uid,
        total_points: 0,
      }));

      for (let i = 0; i < enrollRows.length; i += 500) {
        const { error } = await admin
          .from("contest_entries")
          .upsert(enrollRows.slice(i, i + 500), { onConflict: "contest_id,user_id" });
        if (!error) enrolled += enrollRows.slice(i, i + 500).length;
      }
    }
  }

  return NextResponse.json({
    message: `${prevYear}年${prevMonth}月のポイントをリセットしました`,
    reset_users: resetCount ?? 0,
    contest_entries_recorded: recorded,
    current_contest_enrolled: enrolled,
  });
}
'''

cron_dir = "src/app/api/cron/monthly-reset"
os.makedirs(cron_dir, exist_ok=True)
with open(f"{cron_dir}/route.ts", "w") as f:
    f.write(MONTHLY_RESET_API)
print(f"✅ {cron_dir}/route.ts")

# ============================================================
# 2. vercel.json に Cron 設定追加
# ============================================================
vercel_json = "vercel.json"
cron_entry = {
    "path": "/api/cron/monthly-reset",
    "schedule": "10 15 1 * *"  # UTC 15:10 = JST 0:10
}

if os.path.exists(vercel_json):
    with open(vercel_json, "r") as f:
        config = json.load(f)
else:
    config = {}

if "crons" not in config:
    config["crons"] = []

existing_paths = [c.get("path") for c in config["crons"]]
if cron_entry["path"] not in existing_paths:
    config["crons"].append(cron_entry)

with open(vercel_json, "w") as f:
    json.dump(config, f, indent=2, ensure_ascii=False)
print(f"✅ {vercel_json} に monthly-reset cron 追加")

# ============================================================
# 3. DB マイグレーション: contest_entries に unique 制約追加
# ============================================================
MIGRATION_SQL = """\
-- contest_entries に unique 制約追加（upsert用）
ALTER TABLE contest_entries
  ADD CONSTRAINT IF NOT EXISTS contest_entries_contest_user_unique
  UNIQUE (contest_id, user_id);

-- points_transactions に reason カラム追加
ALTER TABLE points_transactions
  ADD COLUMN IF NOT EXISTS reason TEXT;
"""

os.makedirs("supabase/migrations", exist_ok=True)
with open("supabase/migrations/add_contest_unique_and_pt_reason.sql", "w") as f:
    f.write(MIGRATION_SQL)
print("✅ supabase/migrations/add_contest_unique_and_pt_reason.sql")

print("\n🏁 Task #45 完了")
print("📌 次のステップ:")
print("   1. Supabase SQL Editor で supabase/migrations/add_contest_unique_and_pt_reason.sql を実行")
print("   2. Vercel に CRON_SECRET 環境変数を設定")
print("   3. Vercel Pro プラン以上で Cron Jobs が使えることを確認")
