import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "monthly"; // monthly, cumulative, hit_rate, streak
  const limit = parseInt(searchParams.get("limit") ?? "50");

  let query;

  switch (type) {
    case "cumulative":
      query = supabase
        .from("profiles")
        .select("id, display_name, avatar_url, rank_id, cumulative_points, total_votes, win_hits")
        .gt("total_votes", 0)
        .order("cumulative_points", { ascending: false })
        .limit(limit);
      break;

    case "hit_rate":
      query = supabase
        .from("profiles")
        .select("id, display_name, avatar_url, rank_id, cumulative_points, total_votes, win_hits")
        .gte("total_votes", 5) // 最低5投票
        .order("win_hits", { ascending: false })
        .limit(limit);
      break;

    case "streak":
      query = supabase
        .from("profiles")
        .select("id, display_name, avatar_url, rank_id, cumulative_points, best_streak, current_streak")
        .gt("best_streak", 0)
        .order("best_streak", { ascending: false })
        .limit(limit);
      break;

    default: // monthly
      query = supabase
        .from("profiles")
        .select("id, display_name, avatar_url, rank_id, monthly_points, total_votes, win_hits")
        .gt("monthly_points", 0)
        .order("monthly_points", { ascending: false })
        .limit(limit);
      break;
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 的中率を計算して返す
  const rankings = (data ?? []).map((profile, index) => ({
    rank: index + 1,
    ...profile,
    hit_rate: profile.total_votes > 0
      ? Math.round((profile.win_hits / profile.total_votes) * 1000) / 10
      : 0,
  }));

  return NextResponse.json({ type, rankings });
}
