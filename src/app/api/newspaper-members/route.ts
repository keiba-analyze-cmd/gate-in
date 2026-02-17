import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET: 自分の新聞メンバー一覧を取得
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const { data: members } = await supabase
    .from("newspaper_members")
    .select(`
      id,
      member_user_id,
      display_order,
      profiles!newspaper_members_member_user_id_fkey(display_name, avatar_url, avatar_emoji, rank_id)
    `)
    .eq("user_id", user.id)
    .order("display_order", { ascending: true });

  const formatted = (members ?? []).map((m: any) => ({
    id: m.id,
    user_id: m.member_user_id,
    display_order: m.display_order,
    display_name: m.profiles?.display_name ?? "匿名",
    avatar_url: m.profiles?.avatar_url, avatar_emoji: m.profiles?.avatar_emoji,
    rank_id: m.profiles?.rank_id ?? "beginner_1",
  }));

  return NextResponse.json({ members: formatted });
}

// POST: メンバーを追加
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const body = await request.json();
  const { member_user_id } = body;

  if (!member_user_id) {
    return NextResponse.json({ error: "member_user_idが必要です" }, { status: 400 });
  }

  // 現在のメンバー数を確認（5人まで）
  const { count } = await supabase
    .from("newspaper_members")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  if ((count ?? 0) >= 5) {
    return NextResponse.json({ error: "メンバーは5人までです" }, { status: 400 });
  }

  // 最大のdisplay_orderを取得
  const { data: maxOrder } = await supabase
    .from("newspaper_members")
    .select("display_order")
    .eq("user_id", user.id)
    .order("display_order", { ascending: false })
    .limit(1)
    .single();

  const newOrder = (maxOrder?.display_order ?? -1) + 1;

  const { data, error } = await supabase
    .from("newspaper_members")
    .insert({
      user_id: user.id,
      member_user_id,
      display_order: newOrder,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "既に追加済みです" }, { status: 400 });
    }
    return NextResponse.json({ error: "追加に失敗しました" }, { status: 500 });
  }

  return NextResponse.json({ success: true, member: data });
}

// DELETE: メンバーを削除
export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const memberId = searchParams.get("id");

  if (!memberId) {
    return NextResponse.json({ error: "idが必要です" }, { status: 400 });
  }

  const { error } = await supabase
    .from("newspaper_members")
    .delete()
    .eq("id", memberId)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: "削除に失敗しました" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// PATCH: 並び順を更新
export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const body = await request.json();
  const { member_ids } = body; // 新しい順序のID配列

  if (!member_ids || !Array.isArray(member_ids)) {
    return NextResponse.json({ error: "member_ids配列が必要です" }, { status: 400 });
  }

  // 各メンバーの順序を更新
  for (let i = 0; i < member_ids.length; i++) {
    await supabase
      .from("newspaper_members")
      .update({ display_order: i })
      .eq("id", member_ids[i])
      .eq("user_id", user.id);
  }

  return NextResponse.json({ success: true });
}
