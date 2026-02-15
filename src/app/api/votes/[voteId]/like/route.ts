import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/admin";
import { NextResponse } from "next/server";

type Props = {
  params: Promise<{ voteId: string }>;
};

// いいねのトグル
export async function POST(request: Request, { params }: Props) {
  const { voteId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const admin = createAdminClient();

  // 既存のいいねを確認
  const { data: existing } = await admin
    .from("vote_likes")
    .select("id")
    .eq("user_id", user.id)
    .eq("vote_id", voteId)
    .maybeSingle();

  if (existing) {
    // いいね解除
    await admin.from("vote_likes").delete().eq("id", existing.id);
    
    // カウント減少
    await admin.rpc("decrement_vote_like_count", { vote_id_param: voteId });
    
    return NextResponse.json({ action: "unliked" });
  } else {
    // いいね追加
    const { error } = await admin.from("vote_likes").insert({
      user_id: user.id,
      vote_id: voteId,
    });

    if (error) {
      if (error.code === "23503") {
        return NextResponse.json({ error: "投票が見つかりません" }, { status: 404 });
      }
      return NextResponse.json({ error: "いいねに失敗しました" }, { status: 500 });
    }

    // カウント増加
    await admin.rpc("increment_vote_like_count", { vote_id_param: voteId });

    // 通知を作成（自分自身へのいいねは通知しない）
    const { data: vote } = await admin
      .from("votes")
      .select("user_id")
      .eq("id", voteId)
      .single();

    if (vote && vote.user_id !== user.id) {
      const { data: liker } = await admin
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .single();

      await admin.from("notifications").insert({
        user_id: vote.user_id,
        type: "like",
        title: "いいねされました",
        body: `${liker?.display_name ?? "誰か"}さんがあなたの予想にいいねしました`,
        link: null,
        is_read: false,
      });
    }

    return NextResponse.json({ action: "liked" });
  }
}

// いいね状態を取得
export async function GET(request: Request, { params }: Props) {
  const { voteId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const admin = createAdminClient();

  // いいね数を取得
  const { data: vote } = await admin
    .from("votes")
    .select("like_count")
    .eq("id", voteId)
    .single();

  // ユーザーがいいね済みか
  let isLiked = false;
  if (user) {
    const { data: existing } = await admin
      .from("vote_likes")
      .select("id")
      .eq("user_id", user.id)
      .eq("vote_id", voteId)
      .maybeSingle();
    isLiked = !!existing;
  }

  return NextResponse.json({
    like_count: vote?.like_count ?? 0,
    is_liked: isLiked,
  });
}
