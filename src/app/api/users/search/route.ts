import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/admin";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  const rl = rateLimit(`user-search:${user.id}`, { limit: 30, windowMs: 60_000 });
  if (!rl.ok) return rateLimitResponse();
  const q = new URL(request.url).searchParams.get("q")?.trim();
  if (!q || q.length < 1) return NextResponse.json({ users: [] });
  if (q.length > 50) return NextResponse.json({ error: "検索文字列が長すぎます" }, { status: 400 });
  const { data: users, error } = await createAdminClient().from("profiles")
    .select("id, display_name, avatar_url, rank_id, cumulative_points, total_votes")
    .ilike("display_name", `%${q}%`).order("cumulative_points", { ascending: false }).limit(20);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ users: users ?? [] });
}
