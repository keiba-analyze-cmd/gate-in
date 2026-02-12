#!/bin/bash
# ============================================
# Vercel ビルドエラー修正スクリプト
# gate-in フォルダ内で実行してください
# ============================================

echo "🔧 TypeScriptエラーを修正中..."

# ====== votes/route.ts 修正 ======
echo "📝 src/app/api/races/[raceId]/votes/route.ts"
cat << 'FILEOF' > src/app/api/races/\[raceId\]/votes/route.ts
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type Props = {
  params: Promise<{ raceId: string }>;
};

export async function GET(request: Request, { params }: Props) {
  const { raceId } = await params;
  const supabase = await createClient();

  // 全投票データを取得
  const { data: votes, error: votesErr } = await supabase
    .from("votes")
    .select("id, user_id, profiles(rank_id)")
    .eq("race_id", raceId);

  if (votesErr) {
    return NextResponse.json({ error: votesErr.message }, { status: 500 });
  }

  const totalVotes = votes?.length ?? 0;

  // 全 vote_picks を取得
  const voteIds = votes?.map((v) => v.id) ?? [];
  if (voteIds.length === 0) {
    return NextResponse.json({ total_votes: 0, win: [], place: [], danger: [] });
  }

  const { data: picks } = await supabase
    .from("vote_picks")
    .select("vote_id, pick_type, race_entry_id")
    .in("vote_id", voteIds);

  // エントリー情報
  const { data: entries } = await supabase
    .from("race_entries")
    .select("id, post_number, odds, popularity, horses(name)")
    .eq("race_id", raceId)
    .order("post_number");

  const entryMap = new Map(
    (entries ?? []).map((e: any) => [
      e.id,
      {
        id: e.id,
        post_number: e.post_number,
        horse_name: (e.horses as any)?.name ?? "不明",
        odds: e.odds,
        popularity: e.popularity,
      },
    ])
  );

  // 集計
  const aggregate = (pickType: string) => {
    const counts = new Map<string, number>();
    for (const pick of picks ?? []) {
      if (pick.pick_type === pickType) {
        counts.set(pick.race_entry_id, (counts.get(pick.race_entry_id) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .map(([entryId, count]) => ({
        ...(entryMap.get(entryId) ?? { post_number: 0, horse_name: "不明" }),
        count,
        percentage: totalVotes > 0 ? Math.round((count / totalVotes) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  };

  return NextResponse.json({
    total_votes: totalVotes,
    win: aggregate("win"),
    place: aggregate("place"),
    danger: aggregate("danger"),
  });
}
FILEOF

echo ""
echo "✅ 修正完了！ローカルでビルドテストしてください："
echo "  npm run build"
echo ""
echo "成功したら："
echo "  git add . && git commit -m 'fix: TypeScript build errors' && git push"
