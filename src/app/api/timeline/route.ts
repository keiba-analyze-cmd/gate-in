import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });

  const rl = rateLimit(`timeline:${user.id}`, { limit: 60, windowMs: 60_000 });
  if (!rl.ok) return rateLimitResponse();

  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor");
  const filter = searchParams.get("filter") ?? "all";
  const limit = 20;

  const { data: follows } = await supabase.from("follows").select("following_id").eq("follower_id", user.id);
  const followingIds = follows?.map((f) => f.following_id) ?? [];

  const { data: blockedUsers } = await supabase.from("blocks").select("blocked_id").eq("blocker_id", user.id);
  const blockedIds = new Set(blockedUsers?.map((b) => b.blocked_id) ?? []);
  const targetIds = [user.id, ...followingIds.filter((id) => !blockedIds.has(id))];

  let voteItems: any[] = [];
  if (filter === "all" || filter === "vote") {
    let q = supabase.from("votes")
      .select("id, user_id, race_id, status, earned_points, is_perfect, settled_at, created_at, profiles(display_name, avatar_url, rank_id), races(name, grade, course_name)")
      .in("user_id", targetIds).neq("status", "pending").order("settled_at", { ascending: false }).limit(limit);
    if (cursor) q = q.lt("settled_at", cursor);
    const { data } = await q;
    voteItems = (data ?? []).map((v) => ({ type: "vote_result", id: `vote-${v.id}`, user: v.profiles, user_id: v.user_id, race: v.races, race_id: v.race_id, earned_points: v.earned_points, is_perfect: v.is_perfect, status: v.status, timestamp: v.settled_at ?? v.created_at }));
  }

  let commentItems: any[] = [];
  if (filter === "all" || filter === "comment") {
    let q = supabase.from("comments")
      .select("id, user_id, race_id, body, sentiment, created_at, profiles(display_name, avatar_url, rank_id), races(name, grade, course_name)")
      .in("user_id", targetIds).is("parent_id", null).eq("is_deleted", false).order("created_at", { ascending: false }).limit(limit);
    if (cursor) q = q.lt("created_at", cursor);
    const { data } = await q;
    commentItems = (data ?? []).map((c) => ({ type: "comment", id: `comment-${c.id}`, comment_id: c.id, user: c.profiles, user_id: c.user_id, race: c.races, race_id: c.race_id, body: c.body, sentiment: c.sentiment, timestamp: c.created_at }));
  }

  const allItems = [...voteItems, ...commentItems].filter((item) => !blockedIds.has(item.user_id))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, limit);
  const newCursor = allItems.length === limit ? allItems[allItems.length - 1].timestamp : null;
  return NextResponse.json({ items: allItems, next_cursor: newCursor });
}
