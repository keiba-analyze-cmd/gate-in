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
