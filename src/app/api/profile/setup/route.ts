import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { isValidAvatar, DEFAULT_AVATAR } from "@/lib/constants/avatars";
import { validateHandle, normalizeHandle } from "@/lib/constants/handles";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const body = await request.json();

  if (!body.display_name?.trim() || body.display_name.length > 20) {
    return NextResponse.json({ error: "表示名は1〜20文字で入力してください" }, { status: 400 });
  }

  // ユーザーハンドル検証
  if (!body.user_handle) {
    return NextResponse.json({ error: "ユーザーIDを入力してください" }, { status: 400 });
  }

  const handle = normalizeHandle(body.user_handle);
  const handleValidation = validateHandle(handle);
  if (!handleValidation.ok) {
    return NextResponse.json({ error: handleValidation.error }, { status: 400 });
  }

  // 重複チェック
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_handle", handle)
    .neq("id", user.id)
    .limit(1);

  if (existing && existing.length > 0) {
    return NextResponse.json({ error: "このユーザーIDは既に使われています" }, { status: 409 });
  }

  const updates: Record<string, any> = {
    display_name: body.display_name.trim(),
    user_handle: handle,
    profile_completed: true,
  };

  // アバター絵文字
  if (body.avatar_emoji) {
    updates.avatar_emoji = isValidAvatar(body.avatar_emoji) ? body.avatar_emoji : DEFAULT_AVATAR;
  }

  const allowedFields = ["gender", "age_group", "horse_racing_exp", "favorite_course"];
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates[field] = body[field];
    }
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
