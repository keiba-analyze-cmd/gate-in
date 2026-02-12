import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { settleRace } from "@/lib/services/settle-race";

export async function POST(request: Request) {
  const supabase = await createClient();
  const body = await request.json();
  const { race_id } = body;

  if (!race_id) {
    return NextResponse.json({ error: "race_id が必要です" }, { status: 400 });
  }

  const result = await settleRace(supabase, race_id);

  return NextResponse.json(result, {
    status: result.success ? 200 : 500,
  });
}
