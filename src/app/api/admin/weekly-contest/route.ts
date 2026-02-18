import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/admin";
import { NextResponse } from "next/server";

/**
 * 週間大会 管理API
 * POST: 大会作成 + レース紐付け
 * body: { race_ids: string[], week_date: string }
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 管理者チェック（自分のuser_idをハードコードするか、profilesにis_adminフラグ）
  const { data: profile } = await supabase
    .from("profiles").select("is_admin").eq("id", user?.id ?? "").maybeSingle();

  if (!profile?.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { race_ids, week_date } = body;

  if (!race_ids || !Array.isArray(race_ids) || race_ids.length === 0) {
    return NextResponse.json({ error: "race_ids is required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const sundayStr = week_date || new Date().toISOString().split("T")[0];

  // 既存の同日大会チェック
  const { data: existing } = await admin
    .from("contests")
    .select("id")
    .eq("type", "weekly")
    .eq("week_start", sundayStr)
    .maybeSingle();

  let contestId: string;

  if (existing) {
    contestId = existing.id;
    // 既存のレース紐付けを削除して再作成
    await admin.from("contest_races").delete().eq("contest_id", contestId);
  } else {
    // 前週のactiveをクローズ
    await admin
      .from("contests")
      .update({ status: "finished" })
      .eq("type", "weekly")
      .eq("status", "active");

    // 新規作成
    const contestName = `週間予想大会 ${sundayStr.replace(/-/g, "/")}`;
    const { data: contest, error } = await admin
      .from("contests")
      .insert({
        name: contestName,
        type: "weekly",
        status: "active",
        week_start: sundayStr,
        week_end: sundayStr,
        prize_1st: 5000,
        prize_2nd: 3000,
        prize_3rd: 2000,
        started_at: `${sundayStr}T00:00:00+09:00`,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    contestId = contest.id;
  }

  // レース紐付け
  const contestRaces = race_ids.map((rid: string, i: number) => ({
    contest_id: contestId,
    race_id: rid,
    race_order: i + 1,
  }));

  const { error: linkErr } = await admin.from("contest_races").insert(contestRaces);
  if (linkErr) {
    return NextResponse.json({ error: linkErr.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    contest_id: contestId,
    linked_races: race_ids.length,
  });
}
