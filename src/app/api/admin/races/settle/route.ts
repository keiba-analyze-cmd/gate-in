import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/admin";
import { NextResponse } from "next/server";
import { settleRace } from "@/lib/services/settle-race";

export async function POST(request: Request) {
  // 管理者チェック
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });

  const body = await request.json();
  const { race_id } = body;
  if (!race_id) return NextResponse.json({ error: "race_id が必要です" }, { status: 400 });

  // adminClientでsettleRaceを実行（RLSバイパスで全ユーザーの投票を処理）
  const result = await settleRace(admin, race_id);

  return NextResponse.json(result, { status: result.success ? 200 : 500 });
}
