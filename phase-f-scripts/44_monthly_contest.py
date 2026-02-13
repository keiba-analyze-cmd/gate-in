#!/usr/bin/env python3
"""
Task #44: 月次大会の自動作成
- /api/cron/monthly-contest/route.ts: 毎月1日に contest を自動作成
- Vercel Cron Job 設定 (vercel.json)
"""

import os, re, json

# ============================================================
# 1. 月次大会自動作成 API
# ============================================================
MONTHLY_CONTEST_API = '''\
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/admin";

/**
 * 月次大会自動作成 Cron API
 * 毎月1日 0:05 JST に実行
 * Vercel Cron: "5 15 1 * *" (UTC 15:05 = JST 0:05)
 */
export async function GET(request: Request) {
  // Cron Secret チェック（Vercel Cron Jobs は CRON_SECRET ヘッダーを送る）
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();
  const jstNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
  const year = jstNow.getFullYear();
  const month = jstNow.getMonth() + 1;

  // 既存の大会チェック
  const { data: existing } = await admin
    .from("contests")
    .select("id")
    .eq("year", year)
    .eq("month", month)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({
      message: `${year}年${month}月の大会は既に存在します`,
      contest_id: existing.id,
    });
  }

  // 大会作成
  const contestName = `${year}年${month}月 月間予想大会`;
  const { data: contest, error } = await admin
    .from("contests")
    .insert({
      name: contestName,
      year,
      month,
      status: "active",
      started_at: `${year}-${String(month).padStart(2, "0")}-01T00:00:00+09:00`,
    })
    .select()
    .single();

  if (error) {
    console.error("Contest creation failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 前月の大会をクローズ
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  await admin
    .from("contests")
    .update({ status: "finished" })
    .eq("year", prevYear)
    .eq("month", prevMonth)
    .eq("status", "active");

  // 前月の月間TOP3にバッジ付与
  const { data: topEntries } = await admin
    .from("contest_entries")
    .select("user_id, total_points, contests!inner(year, month, status)")
    .eq("contests.year", prevYear)
    .eq("contests.month", prevMonth)
    .order("total_points", { ascending: false })
    .limit(3);

  if (topEntries && topEntries.length > 0) {
    for (const entry of topEntries) {
      // monthly_top3 バッジ付与
      const { data: existing } = await admin
        .from("user_badges")
        .select("id")
        .eq("user_id", entry.user_id)
        .eq("badge_id", "monthly_top3")
        .maybeSingle();

      if (!existing) {
        await admin.from("user_badges").insert({
          user_id: entry.user_id,
          badge_id: "monthly_top3",
          earned_at: new Date().toISOString(),
        });
      }

      // 通知
      await admin.from("notifications").insert({
        user_id: entry.user_id,
        type: "contest_result",
        title: "月間大会結果 🏆",
        body: `${prevYear}年${prevMonth}月の月間大会でTOP3に入りました！おめでとうございます！`,
        is_read: false,
      });
    }
  }

  return NextResponse.json({
    message: `${contestName} を作成しました`,
    contest_id: contest.id,
    prev_month_closed: true,
  });
}
'''

cron_dir = "src/app/api/cron/monthly-contest"
os.makedirs(cron_dir, exist_ok=True)
with open(f"{cron_dir}/route.ts", "w") as f:
    f.write(MONTHLY_CONTEST_API)
print(f"✅ {cron_dir}/route.ts")

# ============================================================
# 2. vercel.json に Cron 設定追加
# ============================================================
vercel_json = "vercel.json"
cron_entry = {
    "path": "/api/cron/monthly-contest",
    "schedule": "5 15 1 * *"  # UTC 15:05 = JST 0:05
}

if os.path.exists(vercel_json):
    with open(vercel_json, "r") as f:
        config = json.load(f)
else:
    config = {}

if "crons" not in config:
    config["crons"] = []

# 既に同じ path があれば追加しない
existing_paths = [c.get("path") for c in config["crons"]]
if cron_entry["path"] not in existing_paths:
    config["crons"].append(cron_entry)

with open(vercel_json, "w") as f:
    json.dump(config, f, indent=2, ensure_ascii=False)
print(f"✅ {vercel_json} に monthly-contest cron 追加")

print("\n🏁 Task #44 完了")
print("📌 Vercel に CRON_SECRET 環境変数を設定してください")
