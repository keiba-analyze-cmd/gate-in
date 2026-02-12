import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type Props = {
  params: Promise<{ raceId: string }>;
};

export async function GET(request: Request, { params }: Props) {
  const { raceId } = await params;
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor");
  const limit = 20;

  let query = supabase
    .from("comments")
    .select("*, profiles(display_name, avatar_url, rank_id), comment_reactions(emoji_type, user_id)")
    .eq("race_id", raceId)
    .is("parent_id", null)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  const { data: comments, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // リプライ数を取得
  const commentIds = comments?.map((c) => c.id) ?? [];
  const commentsWithReplyCounts = await Promise.all(
    (comments ?? []).map(async (comment) => {
      const { count } = await supabase
        .from("comments")
        .select("*", { count: "exact", head: true })
        .eq("parent_id", comment.id)
        .eq("is_deleted", false);
      return { ...comment, reply_count: count ?? 0 };
    })
  );

  const nextCursor =
    comments && comments.length === limit
      ? comments[comments.length - 1].created_at
      : null;

  return NextResponse.json({
    comments: commentsWithReplyCounts,
    next_cursor: nextCursor,
  });
}

export async function POST(request: Request, { params }: Props) {
  const { raceId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const body = await request.json();
  const { body: commentBody, sentiment, parent_id } = body;

  if (!commentBody || commentBody.trim().length === 0) {
    return NextResponse.json({ error: "コメントを入力してください" }, { status: 400 });
  }

  if (commentBody.length > 500) {
    return NextResponse.json({ error: "500文字以内で入力してください" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("comments")
    .insert({
      user_id: user.id,
      race_id: raceId,
      parent_id: parent_id ?? null,
      body: commentBody.trim(),
      sentiment: sentiment ?? null,
    })
    .select("*, profiles(display_name, avatar_url, rank_id)")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
