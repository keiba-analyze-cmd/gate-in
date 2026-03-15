import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * 投票後に週間大会のエントリーを更新
 * POST: { race_id: string }
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { race_id } = await request.json();
  if (!race_id) {
    return NextResponse.json({ error: "race_id is required" }, { status: 400 });
  }

  // このレースが対象の週間大会を取得
  const { data: contestRace } = await supabase
    .from("contest_races")
    .select("contest_id, contests!inner(id, status, type)")
    .eq("race_id", race_id)
    .eq("contests.status", "active")
    .eq("contests.type", "weekly")
    .maybeSingle();

  if (!contestRace) {
    return NextResponse.json({ ok: true, contest: null });
  }

  const contestId = contestRace.contest_id;

  // 大会対象レースのIDを取得
  const { data: contestRaces } = await supabase
    .from("contest_races")
    .select("race_id")
    .eq("contest_id", contestId);

  const raceIds = contestRaces?.map(r => r.race_id) || [];

  // このユーザーの大会対象レースへの投票を集計
  const { data: votes } = await supabase
    .from("votes")
    .select("id, race_id, status, earned_points, created_at")
    .eq("user_id", user.id)
    .in("race_id", raceIds);

  if (!votes || votes.length === 0) {
    return NextResponse.json({ ok: true, contest: null });
  }

  const voteCount = votes.length;
  const hitCount = votes.filter(v => v.status === "settled_hit").length;
  const totalPoints = votes.reduce((sum, v) => sum + (v.earned_points || 0), 0);
  const earliestVote = votes.reduce((min, v) => 
    v.created_at < min ? v.created_at : min, votes[0].created_at);
  const isEligible = voteCount >= 3;

  // upsert
  const { error } = await supabase
    .from("contest_entries")
    .upsert({
      contest_id: contestId,
      user_id: user.id,
      vote_count: voteCount,
      hit_race_count: hitCount,
      total_points: totalPoints,
      is_eligible: isEligible,
      earliest_vote_at: earliestVote,
    }, { onConflict: "contest_id,user_id" });

  if (error) {
    console.error("contest_entries upsert error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, contest_id: contestId, vote_count: voteCount, is_eligible: isEligible });
}
