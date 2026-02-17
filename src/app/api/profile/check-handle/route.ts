import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { validateHandle, normalizeHandle } from "@/lib/constants/handles";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const handle = searchParams.get("handle");

  if (!handle) {
    return NextResponse.json({ available: false, error: "ハンドルが必要です" });
  }

  const normalized = normalizeHandle(handle);
  const validation = validateHandle(normalized);

  if (!validation.ok) {
    return NextResponse.json({ available: false, error: validation.error });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 既存チェック（自分自身は除外）
  let query = supabase
    .from("profiles")
    .select("id")
    .eq("user_handle", normalized)
    .limit(1);

  if (user) {
    query = query.neq("id", user.id);
  }

  const { data } = await query;

  const available = !data || data.length === 0;

  return NextResponse.json({
    available,
    error: available ? undefined : "このIDは既に使われています",
  });
}
