import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { isValidAvatar, DEFAULT_AVATAR } from "@/lib/constants/avatars";
import { validateHandle, normalizeHandle } from "@/lib/constants/handles";
import { checkNGWords } from "@/lib/constants/ng-words";

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  // レート制限
  const rl = rateLimit(`profile:${user.id}`, { limit: 10, windowMs: 60_000 });
  if (!rl.ok) return rateLimitResponse();

  const body = await request.json();
  const allowedFields = ["display_name", "bio", "gender", "age_group", "horse_racing_exp", "favorite_course"];
  const updates: Record<string, any> = {};

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates[field] = body[field];
    }
  }

  // アバター絵文字
  if (body.avatar_emoji !== undefined) {
    updates.avatar_emoji = isValidAvatar(body.avatar_emoji) ? body.avatar_emoji : DEFAULT_AVATAR;
  }

  // ユーザーハンドル
  if (body.user_handle !== undefined) {
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

    updates.user_handle = handle;
  }

  // NGワードチェック
  const ngError = checkNGWords({
    display_name: updates.display_name,
    bio: updates.bio,
    user_handle: updates.user_handle,
  });
  if (ngError) {
    return NextResponse.json({ error: ngError }, { status: 400 });
  }

  if (updates.display_name !== undefined) {
    if (!updates.display_name || updates.display_name.trim().length === 0) {
      return NextResponse.json({ error: "表示名は必須です" }, { status: 400 });
    }
    if (updates.display_name.length > 20) {
      return NextResponse.json({ error: "表示名は20文字以内です" }, { status: 400 });
    }
    updates.display_name = updates.display_name.trim();
  }

  if (updates.bio !== undefined && updates.bio.length > 200) {
    return NextResponse.json({ error: "自己紹介は200文字以内です" }, { status: 400 });
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
