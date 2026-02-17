import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("user_id") ?? user.id;
  const type = searchParams.get("type") ?? "following"; // "following" | "followers"
  const cursor = searchParams.get("cursor");
  const limit = 30;

  if (type === "following") {
    // このユーザーがフォローしている人一覧
    let query = supabase
      .from("follows")
      .select("id, following_id, created_at, profiles!follows_following_id_fkey(id, display_name, avatar_url, avatar_emoji, rank_id, cumulative_points)")
      .eq("follower_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (cursor) {
      query = query.lt("created_at", cursor);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 自分がフォローしているかチェック
    const targetIds = (data ?? []).map((f: any) => f.following_id);
    const { data: myFollows } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", user.id)
      .in("following_id", targetIds);

    const myFollowSet = new Set((myFollows ?? []).map((f) => f.following_id));

    const users = (data ?? []).map((f: any) => ({
      id: f.following_id,
      ...(f.profiles ?? {}),
      is_following: myFollowSet.has(f.following_id),
      follow_created_at: f.created_at,
    }));

    const nextCursor = data && data.length === limit ? data[data.length - 1].created_at : null;

    return NextResponse.json({ users, next_cursor: nextCursor });
  } else {
    // このユーザーのフォロワー一覧
    let query = supabase
      .from("follows")
      .select("id, follower_id, created_at, profiles!follows_follower_id_fkey(id, display_name, avatar_url, avatar_emoji, rank_id, cumulative_points)")
      .eq("following_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (cursor) {
      query = query.lt("created_at", cursor);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 自分がフォローしているかチェック
    const targetIds = (data ?? []).map((f: any) => f.follower_id);
    const { data: myFollows } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", user.id)
      .in("following_id", targetIds);

    const myFollowSet = new Set((myFollows ?? []).map((f) => f.following_id));

    const users = (data ?? []).map((f: any) => ({
      id: f.follower_id,
      ...(f.profiles ?? {}),
      is_following: myFollowSet.has(f.follower_id),
      follow_created_at: f.created_at,
    }));

    const nextCursor = data && data.length === limit ? data[data.length - 1].created_at : null;

    return NextResponse.json({ users, next_cursor: nextCursor });
  }
}
