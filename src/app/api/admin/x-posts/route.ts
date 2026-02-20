import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/admin";

// 管理者チェック
async function checkAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  
  if (!profile?.is_admin) return null;
  return user;
}

// 投稿作成
export async function POST(request: NextRequest) {
  const user = await checkAdmin();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { scheduled_at, content, post_type, hashtags } = body;

    if (!scheduled_at || !content) {
      return NextResponse.json({ error: "日時と内容は必須です" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("x_scheduled_posts")
      .insert({
        scheduled_at: new Date(scheduled_at + "+09:00").toISOString(),
        content,
        post_type: post_type || "general",
        hashtags: hashtags || null,
        status: "pending",
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, post: data });
  } catch (err: any) {
    console.error("Create post error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// 投稿更新（キャンセルなど）
export async function PATCH(request: NextRequest) {
  const user = await checkAdmin();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ error: "IDとステータスは必須です" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { error } = await admin
      .from("x_scheduled_posts")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Update post error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// 投稿削除
export async function DELETE(request: NextRequest) {
  const user = await checkAdmin();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "IDは必須です" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { error } = await admin
      .from("x_scheduled_posts")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Delete post error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
