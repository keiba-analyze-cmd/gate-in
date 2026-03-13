import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/admin";
import { sendContestWinnerEmail } from "@/lib/email/contest-winner";

/**
 * 週間予想大会 入賞者メール通知
 * 毎週水曜 10:00 JST に実行
 * Vercel Cron: "0 1 * * 3" (UTC 01:00 Wed = JST 10:00 Wed)
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // 最新のfinishedで、まだ通知していない大会を取得
  const { data: finishedContests } = await admin
    .from("contests")
    .select("id, name, notified_at")
    .eq("type", "weekly")
    .eq("status", "finished")
    .is("notified_at", null)
    .order("week_start", { ascending: false })
    .limit(1);

  if (!finishedContests || finishedContests.length === 0) {
    return NextResponse.json({ message: "通知対象の大会がありません" });
  }

  const contest = finishedContests[0];
  const emailsSent: string[] = [];
  const prizes = [5000, 3000, 2000];

  // TOP3を取得
  const { data: topEntries } = await admin
    .from("contest_entries")
    .select("user_id, total_points")
    .eq("contest_id", contest.id)
    .eq("is_eligible", true)
    .order("total_points", { ascending: false })
    .order("hit_race_count", { ascending: false })
    .order("earliest_vote_at", { ascending: true })
    .limit(3);

  if (topEntries) {
    for (let i = 0; i < topEntries.length; i++) {
      const userId = topEntries[i].user_id;

      // アプリ内通知
      await admin.from("notifications").insert({
        user_id: userId,
        type: "contest_rank",
        title: `週間大会 ${i + 1}位入賞！🏆`,
        body: `${contest.name}で${i + 1}位になりました！Amazonギフト券¥${prizes[i].toLocaleString()}をお送りします。`,
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
          contestName: contest.name,
        });
        if (result.success) {
          emailsSent.push(authUser.user.email);
        }
      }
    }
  }

  // 通知済みフラグを更新
  await admin
    .from("contests")
    .update({ notified_at: new Date().toISOString() })
    .eq("id", contest.id);

  return NextResponse.json({
    message: `${contest.name} の入賞者に通知しました`,
    contest_id: contest.id,
    emails_sent: emailsSent.length,
  });
}
