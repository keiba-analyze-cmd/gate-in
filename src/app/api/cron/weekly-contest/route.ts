import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/admin";

/**
 * 週間予想大会 新規作成
 * 毎週金曜 16:05 JST に実行
 * Vercel Cron: "5 7 * * 5" (UTC 07:05 Fri = JST 16:05 Fri)
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  const now = new Date();
  const jstNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));

  // 今週の日曜日を計算（金曜から2日後）
  const nextSunday = new Date(jstNow);
  const dayOfWeek = jstNow.getDay();
  const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
  nextSunday.setDate(jstNow.getDate() + daysUntilSunday);
  const sundayStr = nextSunday.toISOString().split("T")[0];
  const yearMonth = sundayStr.slice(0, 7);

  // 同じ日曜の大会が既にあるかチェック
  const { data: existing } = await admin
    .from("contests")
    .select("id")
    .eq("type", "weekly")
    .eq("week_start", sundayStr)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({
      message: `${sundayStr} の週間大会は既に存在します`,
      contest_id: existing.id,
    });
  }

  // 今週の大会を作成
  const contestName = `週間予想大会 ${sundayStr.replace(/-/g, "/")}`;
  const { data: contest, error } = await admin
    .from("contests")
    .insert({
      name: contestName,
      type: "weekly",
      status: "active",
      week_start: sundayStr,
      week_end: sundayStr,
      year_month: sundayStr,
      start_date: sundayStr,
      end_date: sundayStr,
      prize_1st: 5000,
      prize_2nd: 3000,
      prize_3rd: 2000,
    })
    .select()
    .single();

  if (error) {
    console.error("Weekly contest creation failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // WIN5対象レースを紐付け
  const { data: sundayRaces } = await admin
    .from("races")
    .select("id, race_date, race_number, course_name")
    .eq("race_date", sundayStr)
    .eq("is_win5", true)
    .order("post_time", { ascending: true });

  if (sundayRaces && sundayRaces.length > 0) {
    const contestRaces = sundayRaces.map((r, i) => ({
      contest_id: contest.id,
      race_id: r.id,
      race_order: i + 1,
    }));
    await admin.from("contest_races").insert(contestRaces);
  }

  return NextResponse.json({
    message: `${contestName} を作成しました`,
    contest_id: contest.id,
    linked_races: sundayRaces?.length ?? 0,
  });
}
