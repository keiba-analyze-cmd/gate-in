import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type Props = {
  params: Promise<{ raceId: string }>;
};

export async function GET(request: Request, { params }: Props) {
  const { raceId } = await params;
  const supabase = await createClient();

  // 全投票を取得（pending以外 = 公開分 + 自分のpending）
  const { data: votes, error } = await supabase
    .from("votes")
    .select("id, user_id, vote_picks(pick_type, race_entry_id)")
    .eq("race_id", raceId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 出馬表を取得（馬名を表示するため）
  const { data: entries } = await supabase
    .from("race_entries")
    .select("id, post_number, odds, popularity, horses(name)")
    .eq("race_id", raceId)
    .eq("is_scratched", false)
    .order("post_number", { ascending: true });

  const totalVotes = votes?.length ?? 0;

  // 馬ごとの集計を計算
  const entryMap = new Map(
    entries?.map((e) => [
      e.id,
      {
        id: e.id,
        post_number: e.post_number,
        horse_name: e.horses?.name ?? "不明",
        odds: e.odds,
        popularity: e.popularity,
      },
    ]) ?? []
  );

  // カテゴリ別に集計
  const winCounts: Record<string, number> = {};
  const placeCounts: Record<string, number> = {};
  const dangerCounts: Record<string, number> = {};

  for (const vote of votes ?? []) {
    for (const pick of vote.vote_picks ?? []) {
      const id = pick.race_entry_id;
      if (pick.pick_type === "win") {
        winCounts[id] = (winCounts[id] ?? 0) + 1;
      } else if (pick.pick_type === "place") {
        placeCounts[id] = (placeCounts[id] ?? 0) + 1;
      } else if (pick.pick_type === "danger") {
        dangerCounts[id] = (dangerCounts[id] ?? 0) + 1;
      }
    }
  }

  // 分布データを構築
  const buildDistribution = (counts: Record<string, number>) => {
    return Object.entries(counts)
      .map(([entryId, count]) => {
        const entry = entryMap.get(entryId);
        return {
          race_entry_id: entryId,
          post_number: entry?.post_number ?? 0,
          horse_name: entry?.horse_name ?? "不明",
          odds: entry?.odds,
          popularity: entry?.popularity,
          count,
          percentage: totalVotes > 0 ? Math.round((count / totalVotes) * 1000) / 10 : 0,
        };
      })
      .sort((a, b) => b.count - a.count);
  };

  return NextResponse.json({
    total_votes: totalVotes,
    win_distribution: buildDistribution(winCounts),
    place_distribution: buildDistribution(placeCounts),
    danger_distribution: buildDistribution(dangerCounts),
  });
}
