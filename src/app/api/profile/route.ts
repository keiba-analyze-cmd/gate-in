import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

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
  const allowedFields = ["display_name", "bio"];
  const updates: Record<string, any> = {};

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates[field] = body[field];
    }
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
