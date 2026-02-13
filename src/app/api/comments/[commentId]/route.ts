import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { validateComment } from "@/lib/validation";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type Props = { params: Promise<{ commentId: string }>; };

export async function PATCH(request: Request, { params }: Props) {
  const { commentId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });

  const rl = rateLimit(`comment-edit:${user.id}`, { limit: 20, windowMs: 60_000 });
  if (!rl.ok) return rateLimitResponse();

  const body = await request.json();
  const validation = validateComment(body.body);
  if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 });

  const { data: comment } = await supabase.from("comments").select("id, user_id, is_deleted").eq("id", commentId).single();
  if (!comment) return NextResponse.json({ error: "コメントが見つかりません" }, { status: 404 });
  if (comment.user_id !== user.id) return NextResponse.json({ error: "自分のコメントのみ編集できます" }, { status: 403 });
  if (comment.is_deleted) return NextResponse.json({ error: "削除済みのコメントは編集できません" }, { status: 400 });

  const { data: updated, error: updateError } = await supabase.from("comments")
    .update({ body: body.body.trim(), edited_at: new Date().toISOString() })
    .eq("id", commentId).eq("user_id", user.id)
    .select("*, profiles(display_name, avatar_url, rank_id)").single();

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
  return NextResponse.json(updated);
}

export async function DELETE(request: Request, { params }: Props) {
  const { commentId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });

  const rl = rateLimit(`comment-delete:${user.id}`, { limit: 20, windowMs: 60_000 });
  if (!rl.ok) return rateLimitResponse();

  const { data: comment } = await supabase.from("comments").select("id, user_id").eq("id", commentId).single();
  if (!comment) return NextResponse.json({ error: "コメントが見つかりません" }, { status: 404 });
  if (comment.user_id !== user.id) return NextResponse.json({ error: "自分のコメントのみ削除できます" }, { status: 403 });

  const { error } = await supabase.from("comments")
    .update({ is_deleted: true, body: "（このコメントは削除されました）" })
    .eq("id", commentId).eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
