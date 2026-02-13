import { createNotification } from "@/lib/notify";
import { createClient } from "@/lib/supabase/server";
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

  const { emoji_type } = await request.json();

  if (!["target", "brain", "thumbsup"].includes(emoji_type)) {
    return NextResponse.json({ error: "無効なリアクション" }, { status: 400 });
  }

  // 既存チェック → トグル
  const { data: existing } = await supabase
    .from("comment_reactions")
    .select("id")
    .eq("comment_id", commentId)
    .eq("user_id", user.id)
    .eq("emoji_type", emoji_type)
    .maybeSingle();

  if (existing) {
    await supabase.from("comment_reactions").delete().eq("id", existing.id);
    return NextResponse.json({ action: "removed" });
  } else {
    await supabase.from("comment_reactions").insert({
      comment_id: commentId,
      user_id: user.id,
      emoji_type,
    });

    const { data: comment } = await supabase.from("comments").select("user_id, race_id").eq("id", commentId).single();

    // リアクション通知（自分自身は除外）
    if (comment && comment.user_id !== user.id) {
      const emojiLabel: Record<string, string> = { target: "🎯的中", brain: "🧠なるほど", thumbsup: "👍いいね" };
      await createNotification({
        userId: comment.user_id,
        type: "reaction",
        title: "リアクション",
        body: `あなたのコメントに${emojiLabel[emoji_type] ?? emoji_type}がつきました`,
        link: `/races/${comment.race_id}`,
      });
    }
    return NextResponse.json({ action: "added" });
  }
}
