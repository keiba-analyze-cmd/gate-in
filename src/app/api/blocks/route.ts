import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { validateUUID } from "@/lib/validation";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  const { data: blocks } = await supabase.from("blocks").select("blocked_id, created_at").eq("blocker_id", user.id).order("created_at", { ascending: false });
  return NextResponse.json({ blocks: blocks ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  const rl = rateLimit(`block:${user.id}`, { limit: 30, windowMs: 60_000 });
  if (!rl.ok) return rateLimitResponse();
  const body = await request.json();
  const { blocked_id } = body;
  if (!validateUUID(blocked_id).ok) return NextResponse.json({ error: "無効なIDです" }, { status: 400 });
  if (blocked_id === user.id) return NextResponse.json({ error: "自分自身をブロックできません" }, { status: 400 });
  const { error } = await supabase.from("blocks").upsert({ blocker_id: user.id, blocked_id }, { onConflict: "blocker_id,blocked_id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", blocked_id);
  await supabase.from("follows").delete().eq("follower_id", blocked_id).eq("following_id", user.id);
  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  const body = await request.json();
  if (!validateUUID(body.blocked_id).ok) return NextResponse.json({ error: "無効なIDです" }, { status: 400 });
  await supabase.from("blocks").delete().eq("blocker_id", user.id).eq("blocked_id", body.blocked_id);
  return NextResponse.json({ success: true });
}
