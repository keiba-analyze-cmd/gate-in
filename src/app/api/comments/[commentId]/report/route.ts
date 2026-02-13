import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/admin";
import { NextResponse } from "next/server";

type Props = {
  params: Promise<{ commentId: string }>;
};

export async function POST(request: Request, { params }: Props) {
  const { commentId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const rl = rateLimit(`report:${user.id}`, { limit: 10, windowMs: 3600_000 });
  if (!rl.ok) return rateLimitResponse();

  const body = await request.json();
  const { reason, detail } = body;

  const validReasons = ["spam", "harassment", "inappropriate", "misinformation", "other"];
  if (!reason || !validReasons.includes(reason)) {
    return NextResponse.json({ error: "通報理由を選択してください" }, { status: 400 });
  }

  if (detail && detail.length > 500) {
    return NextResponse.json({ error: "詳細は500文字以内で入力してください" }, { status: 400 });
  }

  const adminClient = createAdminClient();
  const { data: comment } = await adminClient
    .from("comments")
    .select("user_id")
    .eq("id", commentId)
    .single();

  if (!comment) {
    return NextResponse.json({ error: "コメントが見つかりません" }, { status: 404 });
  }

  if (comment.user_id === user.id) {
    return NextResponse.json({ error: "自分のコメントは通報できません" }, { status: 400 });
  }

  const { data: existing } = await adminClient
    .from("comment_reports")
    .select("id")
    .eq("comment_id", commentId)
    .eq("reporter_id", user.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "このコメントは既に通報済みです" }, { status: 409 });
  }

  const { error: insertError } = await adminClient
    .from("comment_reports")
    .insert({
      comment_id: commentId,
      reporter_id: user.id,
      reason,
      detail: detail?.trim() || null,
    });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  const { data: admins } = await adminClient
    .from("profiles")
    .select("id")
    .eq("is_admin", true);

  if (admins && admins.length > 0) {
    const notifications = admins.map((admin) => ({
      user_id: admin.id,
      type: "comment_reported",
      title: "コメント通報",
      body: `コメントが通報されました（理由: ${reason}）`,
      link: "/admin?tab=comments",
      is_read: false,
    }));
    await adminClient.from("notifications").insert(notifications);
  }

  return NextResponse.json({ success: true, message: "通報を受け付けました" }, { status: 201 });
}
