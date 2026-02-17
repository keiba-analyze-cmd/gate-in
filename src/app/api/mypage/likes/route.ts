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
  const cursor = searchParams.get("cursor");
  const limit = 20;

  const admin = createAdminClient();

  // いいねした予想を取得
  let query = admin
    .from("vote_likes")
    .select(`
      id,
      created_at,
      votes(
        id,
        user_id,
        race_id,
        status,
        earned_points,
        is_perfect,
        like_count,
        created_at,
        profiles!votes_user_id_fkey(display_name, avatar_url, avatar_emoji, rank_id),
        races(name, grade, course_name, race_number, race_date),
        vote_picks(pick_type, race_entries(post_number, horses(name)))
      )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  const { data: likes, error } = await query;

  if (error) {
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }

  // データを整形
  const items = (likes ?? [])
    .filter((like: any) => like.votes) // votesが存在するもののみ
    .map((like: any) => {
      const vote = like.votes;
      return {
        like_id: like.id,
        liked_at: like.created_at,
        vote_id: vote.id,
        user_id: vote.user_id,
        race_id: vote.race_id,
        status: vote.status,
        earned_points: vote.earned_points ?? 0,
        is_perfect: vote.is_perfect,
        like_count: vote.like_count ?? 0,
        created_at: vote.created_at,
        user: {
          display_name: vote.profiles?.display_name ?? "匿名",
          avatar_url: vote.profiles?.avatar_url, avatar_emoji: vote.profiles?.avatar_emoji,
          rank_id: vote.profiles?.rank_id ?? "beginner_1",
        },
        race: {
          name: vote.races?.name ?? "",
          grade: vote.races?.grade,
          course_name: vote.races?.course_name ?? "",
          race_number: vote.races?.race_number,
          race_date: vote.races?.race_date,
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
      };
    });

  const nextCursor = items.length === limit ? likes[likes.length - 1].created_at : null;

  return NextResponse.json({ items, next_cursor: nextCursor });
}
