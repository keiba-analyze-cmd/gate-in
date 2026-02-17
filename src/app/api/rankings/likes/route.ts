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
  const period = searchParams.get("period") ?? "week";

  const admin = createAdminClient();

  // 期間の開始日を計算
  const now = new Date();
  let startDate: Date;

  switch (period) {
    case "today":
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case "month":
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case "week":
    default:
      // 今週の月曜日
      const day = now.getDay();
      const diff = day === 0 ? 6 : day - 1;
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff);
      break;
  }

  // いいね数が多い投票を取得
  const { data: votes } = await admin
    .from("votes")
    .select(`
      id,
      user_id,
      race_id,
      status,
      earned_points,
      is_perfect,
      like_count,
      created_at,
      profiles!votes_user_id_fkey(display_name, avatar_url, avatar_emoji, rank_id),
      races(name, grade, course_name, race_date),
      vote_picks(pick_type, race_entries(post_number, horses(name)))
    `)
    .gte("created_at", startDate.toISOString())
    .gt("like_count", 0)
    .order("like_count", { ascending: false })
    .limit(20);

  // データ整形
  const formattedVotes = (votes ?? []).map((vote: any) => ({
    vote_id: vote.id,
    user_id: vote.user_id,
    race_id: vote.race_id,
    like_count: vote.like_count ?? 0,
    status: vote.status,
    earned_points: vote.earned_points ?? 0,
    is_perfect: vote.is_perfect,
    user: {
      display_name: vote.profiles?.display_name ?? "匿名",
      avatar_url: vote.profiles?.avatar_url, avatar_emoji: vote.profiles?.avatar_emoji,
      rank_id: vote.profiles?.rank_id ?? "beginner_1",
    },
    race: {
      name: vote.races?.name ?? "",
      grade: vote.races?.grade,
      course_name: vote.races?.course_name ?? "",
      race_date: vote.races?.race_date ?? "",
    },
    picks: (vote.vote_picks ?? [])
      .map((p: any) => ({
        pick_type: p.pick_type,
        post_number: p.race_entries?.post_number ?? 0,
        horse_name: p.race_entries?.horses?.name ?? "",
      }))
      .sort((a: any, b: any) => {
        const order: Record<string, number> = { win: 0, place: 1, back: 2, danger: 3 };
        return (order[a.pick_type] ?? 9) - (order[b.pick_type] ?? 9);
      }),
  }));

  return NextResponse.json({ votes: formattedVotes });
}
