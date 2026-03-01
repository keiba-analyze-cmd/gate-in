import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "weekly";

  let contest = null;

  // 1. active な大会を探す
  const { data: activeContests } = await supabase
    .from("contests")
    .select("*")
    .eq("type", type)
    .eq("status", "active")
    .order("started_at", { ascending: false })
    .limit(1);

  contest = activeContests?.[0] ?? null;

  // 2. active がなければ最新の finished を表示（先週の結果）
  if (!contest) {
    const { data: finishedContests } = await supabase
      .from("contests")
      .select("*")
      .eq("type", type)
      .eq("status", "finished")
      .order("week_start", { ascending: false })
      .limit(1);

    contest = finishedContests?.[0] ?? null;
  }

  if (!contest) {
    return NextResponse.json({ contest: null, entries: [], my_entry: null, contest_races: [], my_votes: [] });
  }

  // 対象レース取得
  const { data: contestRaces } = await supabase
    .from("contest_races")
    .select("*, races(id, name, race_date, course_name, race_number, post_time, status, grade)")
    .eq("contest_id", contest.id)
    .order("race_order", { ascending: true });

  // ランキング（上位50名、タイブレーク対応）
  const { data: entries } = await supabase
    .from("contest_entries")
    .select("*, profiles(display_name, avatar_url, avatar_emoji, rank_id, user_handle)")
    .eq("contest_id", contest.id)
    .eq("is_eligible", true)
    .order("total_points", { ascending: false })
    .order("hit_race_count", { ascending: false })
    .order("earliest_vote_at", { ascending: true })
    .limit(50);

  // 参加者数
  const { count: totalParticipants } = await supabase
    .from("contest_entries")
    .select("*", { count: "exact", head: true })
    .eq("contest_id", contest.id)
    .eq("is_eligible", true);

  // 自分のエントリー
  let myEntry = null;
  let myVotes: any[] = [];

  if (user) {
    const { data } = await supabase
      .from("contest_entries")
      .select("*")
      .eq("contest_id", contest.id)
      .eq("user_id", user.id)
      .maybeSingle();
    myEntry = data;

    if (myEntry) {
      const { count } = await supabase
        .from("contest_entries")
        .select("*", { count: "exact", head: true })
        .eq("contest_id", contest.id)
        .eq("is_eligible", true)
        .gt("total_points", myEntry.total_points);
      myEntry.ranking = (count ?? 0) + 1;
    }

    // 対象レースへの投票状況を取得
    const raceIds = (contestRaces ?? []).map((cr: any) => cr.races?.id).filter(Boolean);
    if (raceIds.length > 0) {
      const { data: votes } = await supabase
        .from("votes")
        .select("race_id, status, earned_points, created_at")
        .eq("user_id", user.id)
        .in("race_id", raceIds);
      myVotes = votes ?? [];
    }
  }

  return NextResponse.json({
    contest,
    entries: (entries ?? []).map((e, i) => ({ ...e, ranking: i + 1 })),
    my_entry: myEntry,
    contest_races: contestRaces ?? [],
    my_votes: myVotes,
    total_participants: totalParticipants ?? 0,
  });
}
