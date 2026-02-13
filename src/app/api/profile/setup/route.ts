import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const body = await request.json();

  if (!body.display_name?.trim() || body.display_name.length > 20) {
    return NextResponse.json({ error: "表示名は1〜20文字で入力してください" }, { status: 400 });
  }

  const updates: Record<string, any> = {
    display_name: body.display_name.trim(),
    profile_completed: true,
  };

  const allowedFields = ["gender", "age_group", "horse_racing_exp", "favorite_course"];
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates[field] = body[field];
    }
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
