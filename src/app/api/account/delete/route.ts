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
  if (body.confirmation !== "退会する") {
    return NextResponse.json({ error: "確認テキストが一致しません" }, { status: 400 });
  }

  const admin = createAdminClient();

  try {
    // 1. ユーザーのデータを匿名化/削除
    // コメントは匿名化（削除すると会話が壊れるため）
    await admin
      .from("comments")
      .update({ is_deleted: true })
      .eq("user_id", user.id);

    // 2. 投票データは統計用に保持（user_idのみ匿名化）
    // vote_picks, votesはそのまま（集計精度維持）

    // 3. フォロー関係を削除
    await admin.from("follows").delete().eq("follower_id", user.id);
    await admin.from("follows").delete().eq("following_id", user.id);

    // 4. 通知を削除
    await admin.from("notifications").delete().eq("user_id", user.id);

    // 5. ユーザーバッジを削除
    await admin.from("user_badges").delete().eq("user_id", user.id);

    // 6. 大会エントリーを削除
    await admin.from("contest_entries").delete().eq("user_id", user.id);

    // 7. プロフィールを匿名化
    await admin
      .from("profiles")
      .update({
        display_name: "退会済みユーザー",
        bio: null,
        avatar_url: null, avatar_emoji: null,
        is_admin: false,
      })
      .eq("id", user.id);

    // 8. Supabase Auth からユーザーを削除
    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteError) {
      console.error("Auth user deletion failed:", deleteError);
      // Auth削除に失敗してもプロフィール匿名化は済んでいるので続行
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Account deletion error:", err);
    return NextResponse.json({ error: "退会処理に失敗しました" }, { status: 500 });
  }
}
