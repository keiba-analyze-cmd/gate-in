import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/admin";
import { sendKPIReport } from "@/lib/slack";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && !request.headers.get("x-vercel-cron")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();
  const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  
  // 昨日の日付（JSTで0:00に実行されるので、前日分を集計）
  const yesterday = new Date(jstNow);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const dateStr = yesterday.toISOString().split("T")[0];
  const displayDate = `${yesterday.getUTCMonth() + 1}/${yesterday.getUTCDate()}`;

  try {
    // DAU（昨日アクティブだったユーザー数）
    const { count: dau } = await admin
      .from("votes")
      .select("user_id", { count: "exact", head: true })
      .gte("created_at", dateStr + "T00:00:00+09:00")
      .lte("created_at", dateStr + "T23:59:59+09:00");

    // 新規登録ユーザー数
    const { count: newUsers } = await admin
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("created_at", dateStr + "T00:00:00+09:00")
      .lte("created_at", dateStr + "T23:59:59+09:00");

    // 累計ユーザー数
    const { count: totalUsers } = await admin
      .from("profiles")
      .select("*", { count: "exact", head: true });

    // 昨日の投票数
    const { count: votes } = await admin
      .from("votes")
      .select("*", { count: "exact", head: true })
      .gte("created_at", dateStr + "T00:00:00+09:00")
      .lte("created_at", dateStr + "T23:59:59+09:00");

    // 的中率（昨日の投票のうち、earned_points > 0 の割合）
    const { data: votesData } = await admin
      .from("votes")
      .select("earned_points")
      .gte("created_at", dateStr + "T00:00:00+09:00")
      .lte("created_at", dateStr + "T23:59:59+09:00")
      .not("earned_points", "is", null);
    
    const hitVotes = votesData?.filter(v => (v.earned_points ?? 0) > 0).length ?? 0;
    const totalVotesWithResult = votesData?.length ?? 0;
    const hitRate = totalVotesWithResult > 0 ? Math.round((hitVotes / totalVotesWithResult) * 100) : 0;

    // 昨日のレース数
    const { count: races } = await admin
      .from("races")
      .select("*", { count: "exact", head: true })
      .eq("race_date", dateStr);

    // 昨日のX投稿数
    const { count: xPosts } = await admin
      .from("x_scheduled_posts")
      .select("*", { count: "exact", head: true })
      .eq("status", "posted")
      .gte("posted_at", dateStr + "T00:00:00+09:00")
      .lte("posted_at", dateStr + "T23:59:59+09:00");

    await sendKPIReport({
      date: displayDate,
      dau: dau ?? 0,
      newUsers: newUsers ?? 0,
      totalUsers: totalUsers ?? 0,
      votes: votes ?? 0,
      hitRate,
      races: races ?? 0,
      xPosts: xPosts ?? 0,
    });

    return NextResponse.json({ success: true, date: dateStr });
  } catch (error: any) {
    console.error("Daily report error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
