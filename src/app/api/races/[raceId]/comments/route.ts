import { createNotification } from "@/lib/notify";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { validateComment } from "@/lib/validation";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type Props = { params: Promise<{ raceId: string }>; };

export async function GET(request: Request, { params }: Props) {
  const { raceId } = await params;
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor");
  const parentId = searchParams.get("parent_id");
  const orderAsc = searchParams.get("order") === "asc";
  const limit = 20;

  const { data: { user: currentUser } } = await supabase.auth.getUser();
  let blockedIds: string[] = [];
  if (currentUser) {
    const { data: bk } = await supabase.from("blocks").select("blocked_id").eq("blocker_id", currentUser.id);
    blockedIds = bk?.map((b) => b.blocked_id) ?? [];
  }

  let query = supabase.from("comments")
    .select("*, profiles(display_name, avatar_url, rank_id), comment_reactions(emoji_type, user_id)")
    .eq("race_id", raceId).eq("is_deleted", false).eq("is_hidden", false);
  if (parentId) { query = query.eq("parent_id", parentId); } else { query = query.is("parent_id", null); }
  query = query.order("created_at", { ascending: orderAsc }).limit(limit);
  if (cursor) query = query.lt("created_at", cursor);

  const { data: comments, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const withReplies = await Promise.all((comments ?? []).map(async (c) => {
    const { count } = await supabase.from("comments").select("*", { count: "exact", head: true }).eq("parent_id", c.id).eq("is_deleted", false);
    return { ...c, reply_count: count ?? 0 };
  }));

  const filtered = blockedIds.length > 0 ? withReplies.filter((c) => !blockedIds.includes(c.user_id)) : withReplies;
  const nextCursor = comments && comments.length === limit ? comments[comments.length - 1].created_at : null;
  return NextResponse.json({ comments: filtered, next_cursor: nextCursor });
}

export async function POST(request: Request, { params }: Props) {
  const { raceId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });

  const rl = rateLimit(`comments:${user.id}`, { limit: 10, windowMs: 60_000 });
  if (!rl.ok) return rateLimitResponse();

  const body = await request.json();
  const validation = validateComment(body.body);
  if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 });

  const { data, error } = await supabase.from("comments")
    .insert({ user_id: user.id, race_id: raceId, parent_id: body.parent_id ?? null, body: body.body.trim(), sentiment: body.sentiment ?? null })
    .select("*, profiles(display_name, avatar_url, rank_id)").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 返信通知（parent_idがある場合）
  if (body.parent_id) {
    const { data: parentComment } = await supabase
      .from("comments")
      .select("user_id, race_id")
      .eq("id", body.parent_id)
      .single();
    if (parentComment && parentComment.user_id !== user.id) {
      const { createNotification: notify } = await import("@/lib/notify");
      await notify({
        userId: parentComment.user_id,
        type: "reply",
        title: "コメントに返信",
        body: `あなたのコメントに返信がありました: ${body.body.trim().slice(0, 50)}`,
        link: `/races/${raceId}`,
      });
    }
  }
  return NextResponse.json(data, { status: 201 });
}
