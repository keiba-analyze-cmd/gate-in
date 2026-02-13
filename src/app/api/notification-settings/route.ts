import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const ALLOWED_FIELDS = [
  "notify_race_result",
  "notify_points",
  "notify_badge",
  "notify_follow",
  "notify_reply",
  "notify_rank_up",
  "notify_contest",
  "notify_system",
];

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(ALLOWED_FIELDS.join(", "))
    .eq("id", user.id)
    .single();

  return NextResponse.json(profile ?? {});
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const body = await request.json();
  const updates: Record<string, boolean> = {};

  for (const field of ALLOWED_FIELDS) {
    if (typeof body[field] === "boolean") {
      updates[field] = body[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "更新項目がありません" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id)
    .select(ALLOWED_FIELDS.join(", "))
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
