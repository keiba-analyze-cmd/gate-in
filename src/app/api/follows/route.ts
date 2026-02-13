import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { validateUUID } from "@/lib/validation";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  // レート制限
  const rl = rateLimit(`follows:${user.id}`, { limit: 30, windowMs: 60_000 });
  if (!rl.ok) return rateLimitResponse();

  const { following_id } = await request.json();

  // バリデーション
  const idCheck = validateUUID(following_id);
  if (!idCheck.ok) {
    return NextResponse.json({ error: idCheck.error }, { status: 400 });
  }

  if (!following_id || following_id === user.id) {
    return NextResponse.json({ error: "無効なユーザーです" }, { status: 400 });
  }

  // トグル：既存ならアンフォロー、なければフォロー
  const { data: existing } = await supabase
    .from("follows")
    .select("id")
    .eq("follower_id", user.id)
    .eq("following_id", following_id)
    .maybeSingle();

  if (existing) {
    await supabase.from("follows").delete().eq("id", existing.id);
    return NextResponse.json({ action: "unfollowed" });
  } else {
    const { error } = await supabase.from("follows").insert({
      follower_id: user.id,
      following_id,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ action: "followed" });
  }
}
