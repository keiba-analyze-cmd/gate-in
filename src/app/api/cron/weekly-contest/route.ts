import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/admin";
import { sendContestWinnerEmail } from "@/lib/email/contest-winner";

/**
 * 週間予想大会自動作成 Cron API
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

  // 前週の大会をクローズ（active → finished）
  const { data: prevContests } = await admin
    .from("contests")
    .select("id, name")
    .eq("type", "weekly")
    .eq("status", "active");

  for (const pc of prevContests ?? []) {
    await admin.from("contests")
      .update({ status: "finished" })
      .eq("id", pc.id);
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
      prize_1st: 5000,
      prize_2nd: 3000,
      prize_3rd: 2000,
      started_at: `${sundayStr}T00:00:00+09:00`,
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
    .select("id, race_date, race_number, venue")
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

  // 前週TOP3に通知＋景品案内＋メール送信
  const emailsSent: string[] = [];
  for (const pc of prevContests ?? []) {
    const { data: topEntries } = await admin
      .from("contest_entries")
      .select("user_id, total_points")
      .eq("contest_id", pc.id)
      .eq("is_eligible", true)
      .order("total_points", { ascending: false })
      .order("hit_race_count", { ascending: false })
      .order("earliest_vote_at", { ascending: true })
      .limit(3);

    if (topEntries) {
      const prizes = [5000, 3000, 2000];
      for (let i = 0; i < topEntries.length; i++) {
        const userId = topEntries[i].user_id;
        
        // アプリ内通知
        await admin.from("notifications").insert({
          user_id: userId,
          type: "contest_result",
          title: `週間大会 ${i + 1}位入賞！🏆`,
          body: `${pc.name}で${i + 1}位になりました！Amazonギフト券¥${prizes[i].toLocaleString()}をお送りします。`,
          is_read: false,
        });

        // ユーザー情報を取得してメール送信
        const { data: profile } = await admin
          .from("profiles")
          .select("display_name")
          .eq("id", userId)
          .single();

        const { data: authUser } = await admin.auth.admin.getUserById(userId);

        if (authUser?.user?.email && profile) {
          const result = await sendContestWinnerEmail({
            to: authUser.user.email,
            displayName: profile.display_name,
            rank: i + 1,
            prizeAmount: prizes[i],
            contestName: pc.name,
          });
          if (result.success) {
            emailsSent.push(authUser.user.email);
          }
        }
      }
    }
  }

  return NextResponse.json({
    message: `${contestName} を作成しました`,
    contest_id: contest.id,
    linked_races: sundayRaces?.length ?? 0,
    emails_sent: emailsSent.length,
  });
}
