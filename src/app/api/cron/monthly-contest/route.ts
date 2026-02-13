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
