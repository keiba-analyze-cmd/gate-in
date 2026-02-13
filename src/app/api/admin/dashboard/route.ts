import { createAdminClient, requireAdmin } from "@/lib/admin";
import { NextResponse } from "next/server";

export async function GET() {
  try { await requireAdmin(); } catch (res) { return res as Response; }
  const admin = createAdminClient();

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const thisMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const lastWeekStart = new Date(now.getTime() - 7 * 86400_000).toISOString();

  // 総ユーザー数
  const { count: totalUsers } = await admin.from("profiles").select("*", { count: "exact", head: true });

  // 今週の新規ユーザー
  const { count: newUsersWeek } = await admin.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", lastWeekStart);

  // 総投票数
  const { count: totalVotes } = await admin.from("votes").select("*", { count: "exact", head: true });

  // 今月の投票数
  const { count: monthlyVotes } = await admin.from("votes").select("*", { count: "exact", head: true }).gte("created_at", thisMonthStart);

  // 今日の投票数
  const { count: todayVotes } = await admin.from("votes").select("*", { count: "exact", head: true }).gte("created_at", todayStart);

  // 今日のアクティブユーザー（投票 or コメントした人）
  const { data: todayVoters } = await admin.from("votes").select("user_id").gte("created_at", todayStart);
  const { data: todayCommenters } = await admin.from("comments").select("user_id").gte("created_at", todayStart).eq("is_deleted", false);
  const activeToday = new Set([
    ...(todayVoters ?? []).map((v) => v.user_id),
    ...(todayCommenters ?? []).map((c) => c.user_id),
  ]).size;

  // 総コメント数
  const { count: totalComments } = await admin.from("comments").select("*", { count: "exact", head: true }).eq("is_deleted", false);

  // 今月のコメント数
  const { count: monthlyComments } = await admin.from("comments").select("*", { count: "exact", head: true }).eq("is_deleted", false).gte("created_at", thisMonthStart);

  // アクティブレース（投票受付中）
  const { count: activeRaces } = await admin.from("races").select("*", { count: "exact", head: true }).eq("status", "voting_open");

  // 総レース数
  const { count: totalRaces } = await admin.from("races").select("*", { count: "exact", head: true });

  // 未対応通報
  const { count: pendingReports } = await admin.from("comment_reports").select("*", { count: "exact", head: true }).eq("status", "pending");

  // 未対応お問い合わせ
  const { count: pendingInquiries } = await admin.from("inquiries").select("*", { count: "exact", head: true }).eq("status", "new");

  // フォロー総数
  const { count: totalFollows } = await admin.from("follows").select("*", { count: "exact", head: true });

  // 日別投票数（直近7日）
  const { data: recentVotes } = await admin.from("votes").select("created_at").gte("created_at", lastWeekStart).order("created_at");
  const dailyVotes: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400_000);
    const key = d.toISOString().split("T")[0];
    dailyVotes[key] = 0;
  }
  (recentVotes ?? []).forEach((v) => {
    const key = v.created_at.split("T")[0];
    if (dailyVotes[key] !== undefined) dailyVotes[key]++;
  });

  return NextResponse.json({
    total_users: totalUsers ?? 0,
    new_users_week: newUsersWeek ?? 0,
    total_votes: totalVotes ?? 0,
    monthly_votes: monthlyVotes ?? 0,
    today_votes: todayVotes ?? 0,
    active_today: activeToday,
    total_comments: totalComments ?? 0,
    monthly_comments: monthlyComments ?? 0,
    active_races: activeRaces ?? 0,
    total_races: totalRaces ?? 0,
    pending_reports: pendingReports ?? 0,
    pending_inquiries: pendingInquiries ?? 0,
    total_follows: totalFollows ?? 0,
    daily_votes: dailyVotes,
  });
}
