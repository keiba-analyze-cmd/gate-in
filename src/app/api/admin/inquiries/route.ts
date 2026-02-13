import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/admin";
import { NextResponse } from "next/server";

async function checkAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  return profile?.is_admin ? user : null;
}

export async function GET(request: Request) {
  const admin = await checkAdmin();
  if (!admin) return NextResponse.json({ error: "権限がありません" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? "all";

  const supabaseAdmin = createAdminClient();
  let query = supabaseAdmin
    .from("contact_inquiries")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ inquiries: data ?? [] });
}

export async function PATCH(request: Request) {
  const admin = await checkAdmin();
  if (!admin) return NextResponse.json({ error: "権限がありません" }, { status: 403 });

  const body = await request.json();
  if (!body.id) return NextResponse.json({ error: "IDが必要です" }, { status: 400 });

  const supabaseAdmin = createAdminClient();
  const updates: Record<string, any> = { updated_at: new Date().toISOString() };

  if (body.status) updates.status = body.status;
  if (body.admin_note !== undefined) updates.admin_note = body.admin_note;
  if (body.status === "replied") updates.replied_at = new Date().toISOString();

  const { error } = await supabaseAdmin
    .from("contact_inquiries")
    .update(updates)
    .eq("id", body.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
