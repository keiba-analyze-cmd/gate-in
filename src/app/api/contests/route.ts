import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { searchParams } = new URL(request.url);
  const yearMonth = searchParams.get("month");

  // 指定月 or 今月の大会を取得
  let contestQuery = supabase
    .from("contests")
    .select("*");

  if (yearMonth) {
    contestQuery = contestQuery.eq("year_month", yearMonth);
  } else {
    contestQuery = contestQuery.eq("status", "active");
  }

  const { data: contests } = await contestQuery.order("year_month", { ascending: false }).limit(1);
  const contest = contests?.[0];

  if (!contest) {
    return NextResponse.json({ contest: null, entries: [], my_entry: null });
  }

  // ランキング（上位50名）
  const { data: entries } = await supabase
    .from("contest_entries")
    .select("*, profiles(display_name, avatar_url, rank_id)")
    .eq("contest_id", contest.id)
    .order("total_points", { ascending: false })
    .limit(50);

  // 自分のエントリー
  let myEntry = null;
  if (user) {
    const { data } = await supabase
      .from("contest_entries")
      .select("*")
      .eq("contest_id", contest.id)
      .eq("user_id", user.id)
      .maybeSingle();
    myEntry = data;

    // 自分の順位を計算
    if (myEntry) {
      const { count } = await supabase
        .from("contest_entries")
        .select("*", { count: "exact", head: true })
        .eq("contest_id", contest.id)
        .gt("total_points", myEntry.total_points);
      myEntry.ranking = (count ?? 0) + 1;
    }
  }

  return NextResponse.json({
    contest,
    entries: (entries ?? []).map((e, i) => ({ ...e, ranking: i + 1 })),
    my_entry: myEntry,
  });
}
