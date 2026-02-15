import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/admin";
import { NextResponse } from "next/server";

// お気に入りバッジを設定
export async function PUT(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const body = await request.json();
  const { badgeId } = body as { badgeId: string | null };

  const admin = createAdminClient();

  // badgeIdがnullでない場合、そのバッジを所持しているか確認
  if (badgeId) {
    const { data: userBadge } = await admin
      .from("user_badges")
      .select("id")
      .eq("user_id", user.id)
      .eq("badge_id", badgeId)
      .maybeSingle();

    if (!userBadge) {
      return NextResponse.json({ error: "このバッジは所持していません" }, { status: 400 });
    }
  }

  // profilesのfeatured_badge_idを更新
  const { error } = await admin
    .from("profiles")
    .update({ featured_badge_id: badgeId })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 });
  }

  return NextResponse.json({ success: true, featured_badge_id: badgeId });
}

// 現在のお気に入りバッジを取得
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("featured_badge_id")
    .eq("id", user.id)
    .single();

  return NextResponse.json({ featured_badge_id: profile?.featured_badge_id ?? null });
}
