import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/admin";
import { NextResponse } from "next/server";

// 管理者チェック
async function checkAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  
  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("is_admin").eq("id", user.id).single();
  return profile?.is_admin ? user : null;
}

// GET: 認証済みユーザー一覧 & ユーザー検索
export async function GET(request: Request) {
  const adminUser = await checkAdmin();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search");
  const admin = createAdminClient();

  if (search) {
    // ユーザー検索
    const { data: users } = await admin
      .from("profiles")
      .select("id, display_name, avatar_url, avatar_emoji, rank_id, is_verified, cumulative_points")
      .ilike("display_name", `%${search}%`)
      .order("cumulative_points", { ascending: false })
      .limit(20);
    
    return NextResponse.json({ users: users ?? [] });
  } else {
    // 認証済みユーザー一覧
    const { data: verifiedUsers } = await admin
      .from("profiles")
      .select("id, display_name, avatar_url, avatar_emoji, rank_id, is_verified, cumulative_points")
      .eq("is_verified", true)
      .order("display_name", { ascending: true });
    
    return NextResponse.json({ verified_users: verifiedUsers ?? [] });
  }
}

// POST: 認証バッジ付与
export async function POST(request: Request) {
  const adminUser = await checkAdmin();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { user_id } = await request.json();
  if (!user_id) return NextResponse.json({ error: "user_id is required" }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ is_verified: true })
    .eq("id", user_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  
  return NextResponse.json({ success: true, action: "verified" });
}

// DELETE: 認証バッジ取り消し
export async function DELETE(request: Request) {
  const adminUser = await checkAdmin();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("user_id");
  if (!userId) return NextResponse.json({ error: "user_id is required" }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ is_verified: false })
    .eq("id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  
  return NextResponse.json({ success: true, action: "unverified" });
}
