import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/admin";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const body = await request.json();
  const { original_vote_id, original_user_id } = body;

  if (!original_vote_id || !original_user_id) {
    return NextResponse.json({ error: "パラメータが不足しています" }, { status: 400 });
  }

  // 自分自身への通知は送らない
  if (user.id === original_user_id) {
    return NextResponse.json({ success: true });
  }

  const admin = createAdminClient();

  // copy_countをインクリメント
  await admin.rpc("increment_vote_copy_count", { vote_id_param: original_vote_id });

  // 自分のプロフィールを取得
  const { data: myProfile } = await admin
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();

  // 元の投票のレース情報を取得
  const { data: vote } = await admin
    .from("votes")
    .select("race_id, races(name)")
    .eq("id", original_vote_id)
    .single();

  // 通知を作成
  await admin.from("notifications").insert({
    user_id: original_user_id,
    type: "vote_copied",
    message: `${myProfile?.display_name ?? "誰か"}さんがあなたの予想に乗っかりました`,
    link: vote ? `/races/${vote.race_id}` : null,
  });

  return NextResponse.json({ success: true });
}
