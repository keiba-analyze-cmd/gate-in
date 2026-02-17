import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/admin";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const week = searchParams.get("week") ?? "this";

  const admin = createAdminClient();

  // 週の開始日・終了日を計算
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? 6 : day - 1;

  let startDate: Date;
  let endDate: Date;

  if (week === "last") {
    // 先週の月曜日〜日曜日
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday - 7);
    endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday - 1, 23, 59, 59);
  } else {
    // 今週の月曜日〜今日
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday);
    endDate = now;
  }

  const formatDate = (d: Date) => {
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  // 週間ポイントを集計
  const { data: transactions } = await admin
    .from("points_transactions")
    .select("user_id, amount")
    .gte("created_at", startDate.toISOString())
    .lte("created_at", endDate.toISOString());

  // ユーザーごとに集計
  const userPoints = new Map<string, number>();
  for (const tx of transactions ?? []) {
    const current = userPoints.get(tx.user_id) ?? 0;
    userPoints.set(tx.user_id, current + tx.amount);
  }

  // ポイント順にソート
  const sortedUsers = Array.from(userPoints.entries())
    .filter(([_, points]) => points > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  if (sortedUsers.length === 0) {
    return NextResponse.json({
      period: week,
      start_date: formatDate(startDate),
      end_date: formatDate(endDate),
      mvp: null,
      rankings: [],
    });
  }

  // ユーザー情報を取得
  const userIds = sortedUsers.map(([id]) => id);
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, display_name, avatar_url, avatar_emoji, rank_id")
    .in("id", userIds);

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  // MVP（1位）の詳細情報を取得
  const mvpUserId = sortedUsers[0][0];
  const mvpPoints = sortedUsers[0][1];
  const mvpProfile = profileMap.get(mvpUserId);

  // MVPの投票データを取得
  const { data: mvpVotes } = await admin
    .from("votes")
    .select("status, is_perfect")
    .eq("user_id", mvpUserId)
    .gte("settled_at", startDate.toISOString())
    .lte("settled_at", endDate.toISOString())
    .neq("status", "pending");

  const totalVotes = mvpVotes?.length ?? 0;
  const hitVotes = mvpVotes?.filter((v) => v.status === "settled_hit").length ?? 0;
  const perfectCount = mvpVotes?.filter((v) => v.is_perfect).length ?? 0;
  const hitRate = totalVotes > 0 ? Math.round((hitVotes / totalVotes) * 100) : 0;

  // ランキングデータを作成
  const rankings = sortedUsers.map(([userId, points], index) => {
    const profile = profileMap.get(userId);
    return {
      rank: index + 1,
      user_id: userId,
      display_name: profile?.display_name ?? "匿名",
      avatar_url: profile?.avatar_url, avatar_emoji: profile?.avatar_emoji ?? null,
      rank_id: profile?.rank_id ?? "beginner_1",
      weekly_points: points,
    };
  });

  return NextResponse.json({
    period: week,
    start_date: formatDate(startDate),
    end_date: formatDate(endDate),
    mvp: mvpProfile ? {
      user_id: mvpUserId,
      display_name: mvpProfile.display_name,
      avatar_url: mvpProfile.avatar_url, avatar_emoji: mvpProfile.avatar_emoji,
      rank_id: mvpProfile.rank_id,
      weekly_points: mvpPoints,
      hit_rate: hitRate,
      perfect_count: perfectCount,
      total_votes: totalVotes,
    } : null,
    rankings,
  });
}
