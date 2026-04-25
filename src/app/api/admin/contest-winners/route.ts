import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/admin";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = createAdminClient();
  const { data: contests } = await db.from("contests")
    .select("id, title, status, year_month, notified_at")
    .eq("status", "finished").order("created_at", { ascending: false }).limit(5);
  if (!contests?.length) return NextResponse.json({ contests: [] });

  const results = [];
  for (const contest of contests) {
    const { data: winners } = await db.from("contest_entries")
      .select("user_id, total_points, hit_race_count, earliest_vote_at")
      .eq("contest_id", contest.id).eq("is_eligible", true)
      .order("total_points", { ascending: false })
      .order("hit_race_count", { ascending: false })
      .order("earliest_vote_at", { ascending: true }).limit(3);
    if (!winners?.length) continue;

    const userIds = winners.map((w: any) => w.user_id);
    const { data: profiles } = await db.from("profiles").select("id, display_name").in("id", userIds);

    const prizes = ["5,000", "3,000", "2,000"];
    const winnersInfo = winners.map((w: any, i: number) => {
      const p = (profiles || []).find((p: any) => p.id === w.user_id);
      return { rank: i+1, prize: prizes[i], user_id: w.user_id,
        display_name: p?.display_name || "?", total_points: w.total_points };
    });
    results.push({ contest_id: contest.id, title: contest.title, winners: winnersInfo });
  }
  return NextResponse.json({ contests: results });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { contest_id, winners } = await request.json();
  if (!contest_id || !winners) return NextResponse.json({ error: "Missing data" }, { status: 400 });

  const db = createAdminClient();
  const medals = ["🥇", "🥈", "🥉"];
  const prizes = ["5,000", "3,000", "2,000"];
  let sent = 0;

  for (const w of winners) {
    const { error } = await db.from("notifications").insert({
      user_id: w.user_id, type: "contest_rank",
      title: medals[w.rank-1] + " " + w.rank + "位入賞おめでとうございます！",
      body: "Amazonギフト券¥" + prizes[w.rank-1] + "をメールでお送りします。",
      is_read: false
    });
    if (!error) sent++;
  }
  return NextResponse.json({ sent });
}
