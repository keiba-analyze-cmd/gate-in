import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/admin";
import { NextResponse } from "next/server";
import { settleRace } from "@/lib/services/settle-race";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const raceDate = body.race_date ?? "2026-02-14";

  // pendingの投票をリセット（再清算のため）
  const { data: races } = await admin
    .from("races")
    .select("id, name, course_name, race_number")
    .eq("race_date", raceDate)
    .eq("status", "finished")
    .order("race_number");

  if (!races || races.length === 0) {
    return NextResponse.json({ error: "対象レースなし" }, { status: 404 });
  }

  // 各レースのpending投票をリセットしてから再清算
  const results = [];
  for (const race of races) {
    // settled済みの投票もpendingに戻す（再計算のため）
    await admin.from("votes")
      .update({ status: "pending", earned_points: 0, is_perfect: false, settled_at: null })
      .eq("race_id", race.id);

    // ステータスをvoting_closedに戻す（settleRaceがfinishedに変更する）
    await admin.from("races").update({ status: "voting_closed" }).eq("id", race.id);

    // 再清算
    const result = await settleRace(admin, race.id);
    results.push({
      name: `${race.course_name}${race.race_number}R ${race.name}`,
      ...result,
    });
  }

  return NextResponse.json({ total: results.length, results });
}
