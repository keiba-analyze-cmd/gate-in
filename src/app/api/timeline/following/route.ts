import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/admin";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ votes: [] });
  }

  const admin = createAdminClient();

  // フォロー中のユーザーIDを取得
  const { data: follows } = await admin
    .from("follows")
    .select("following_id")
    .eq("follower_id", user.id);

  const followingIds = (follows ?? []).map((f) => f.following_id);

  if (followingIds.length === 0) {
    return NextResponse.json({ votes: [] });
  }

  // フォロー中ユーザーの最新投票を取得
  const { data: votes } = await admin
    .from("votes")
    .select(`
      id,
      user_id,
      race_id,
      status,
      earned_points,
      like_count,
      created_at,
      profiles!votes_user_id_fkey(display_name, avatar_url, rank_id),
      races(name, grade, course_name, race_number),
      vote_picks(pick_type, race_entries(post_number, horses(name)))
    `)
    .in("user_id", followingIds)
    .order("created_at", { ascending: false })
    .limit(10);

  // データを整形
  const formatted = (votes ?? []).map((vote: any) => ({
    id: vote.id,
    user_id: vote.user_id,
    race_id: vote.race_id,
    status: vote.status,
    earned_points: vote.earned_points ?? 0,
    like_count: vote.like_count ?? 0,
    created_at: vote.created_at,
    user: {
      display_name: vote.profiles?.display_name ?? "匿名",
      avatar_url: vote.profiles?.avatar_url,
      rank_id: vote.profiles?.rank_id ?? "beginner_1",
    },
    race: {
      name: vote.races?.name ?? "",
      grade: vote.races?.grade,
      course_name: vote.races?.course_name ?? "",
      race_number: vote.races?.race_number,
    },
    picks: (vote.vote_picks ?? []).map((p: any) => ({
      pick_type: p.pick_type,
      post_number: p.race_entries?.post_number ?? 0,
      horse_name: p.race_entries?.horses?.name ?? "",
    })),
  }));

  return NextResponse.json({ votes: formatted });
}
