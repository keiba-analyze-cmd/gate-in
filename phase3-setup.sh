#!/bin/bash
# ============================================
# ゲートイン！ Phase 3 セットアップスクリプト
# gate-in フォルダ内で実行してください
# ============================================

echo "🏇 ゲートイン！ Phase 3（投票集計表示）セットアップを開始します..."
echo ""

# ディレクトリ作成
mkdir -p src/app/api/races/\[raceId\]/votes
mkdir -p src/components/races

# ====== src/app/api/races/[raceId]/votes/route.ts ======
echo "📝 投票集計API: src/app/api/races/[raceId]/votes/route.ts"
cat << 'FILEOF' > src/app/api/races/\[raceId\]/votes/route.ts
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
FILEOF

# ====== src/components/races/VoteDistribution.tsx ======
echo "📝 src/components/races/VoteDistribution.tsx"
cat << 'FILEOF' > src/components/races/VoteDistribution.tsx
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type DistributionItem = {
  race_entry_id: string;
  post_number: number;
  horse_name: string;
  odds: number | null;
  popularity: number | null;
  count: number;
  percentage: number;
};

type VoteData = {
  total_votes: number;
  win_distribution: DistributionItem[];
  place_distribution: DistributionItem[];
  danger_distribution: DistributionItem[];
};

type Props = {
  raceId: string;
};

export default function VoteDistribution({ raceId }: Props) {
  const [data, setData] = useState<VoteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"win" | "place" | "danger">("win");
  const supabase = createClient();

  const fetchData = async () => {
    const res = await fetch(`/api/races/${raceId}/votes`);
    if (res.ok) {
      const json = await res.json();
      setData(json);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();

    // リアルタイム更新を購読
    const channel = supabase
      .channel(`votes-${raceId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "votes",
          filter: `race_id=eq.${raceId}`,
        },
        () => {
          // 新しい投票があったら再取得
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [raceId]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="animate-pulse space-y-3">
          <div className="h-5 bg-gray-200 rounded w-40" />
          <div className="h-8 bg-gray-100 rounded" />
          <div className="h-8 bg-gray-100 rounded" />
          <div className="h-8 bg-gray-100 rounded" />
        </div>
      </div>
    );
  }

  if (!data || data.total_votes === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h2 className="font-bold text-gray-800 mb-2">📊 みんなの予想</h2>
        <p className="text-sm text-gray-400">まだ投票がありません</p>
      </div>
    );
  }

  const tabs = [
    { key: "win" as const, label: "◎ 1着予想", data: data.win_distribution, color: "red" },
    { key: "place" as const, label: "○ 複勝予想", data: data.place_distribution, color: "blue" },
    { key: "danger" as const, label: "△ 危険馬", data: data.danger_distribution, color: "gray" },
  ];

  const activeData = tabs.find((t) => t.key === activeTab);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {/* ヘッダー */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-bold text-gray-800">📊 みんなの予想</h2>
          <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
            {data.total_votes}人が投票
          </span>
        </div>
      </div>

      {/* タブ */}
      <div className="flex border-b border-gray-100 px-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors relative ${
              activeTab === tab.key
                ? "text-green-600"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            {tab.label}
            {tab.data.length > 0 && (
              <span className="ml-1 text-xs text-gray-300">{tab.data.length}</span>
            )}
            {activeTab === tab.key && (
              <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-green-600 rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* 分布バー */}
      <div className="p-5 space-y-2">
        {activeData && activeData.data.length > 0 ? (
          activeData.data.slice(0, 10).map((item, index) => (
            <VoteBar
              key={item.race_entry_id}
              item={item}
              rank={index + 1}
              color={activeData.color}
              maxPercentage={activeData.data[0]?.percentage ?? 100}
            />
          ))
        ) : (
          <p className="text-sm text-gray-400 py-4 text-center">
            このカテゴリの投票はありません
          </p>
        )}
      </div>
    </div>
  );
}

function VoteBar({
  item,
  rank,
  color,
  maxPercentage,
}: {
  item: DistributionItem;
  rank: number;
  color: string;
  maxPercentage: number;
}) {
  // バーの幅（最大のものを100%として相対表示）
  const barWidth = maxPercentage > 0 ? (item.percentage / maxPercentage) * 100 : 0;

  const barColors: Record<string, { bg: string; fill: string; text: string }> = {
    red: { bg: "bg-red-50", fill: "bg-red-400", text: "text-red-700" },
    blue: { bg: "bg-blue-50", fill: "bg-blue-400", text: "text-blue-700" },
    gray: { bg: "bg-gray-100", fill: "bg-gray-400", text: "text-gray-700" },
  };

  const c = barColors[color] ?? barColors.red;

  return (
    <div className="flex items-center gap-3">
      {/* 順位 */}
      <div className="w-5 text-center">
        {rank <= 3 ? (
          <span className={`text-sm font-bold ${
            rank === 1 ? "text-yellow-500" : rank === 2 ? "text-gray-400" : "text-orange-400"
          }`}>
            {rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉"}
          </span>
        ) : (
          <span className="text-xs text-gray-400">{rank}</span>
        )}
      </div>

      {/* 馬番 */}
      <span className="w-7 h-7 rounded-full bg-gray-800 text-white flex items-center justify-center text-xs font-bold shrink-0">
        {item.post_number}
      </span>

      {/* 馬名 + バー */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-bold text-gray-800 truncate">
            {item.horse_name}
          </span>
          <div className="flex items-center gap-2 shrink-0 ml-2">
            <span className={`text-sm font-bold ${c.text}`}>
              {item.percentage}%
            </span>
            <span className="text-xs text-gray-400">
              ({item.count}票)
            </span>
          </div>
        </div>
        {/* プログレスバー */}
        <div className={`h-2.5 rounded-full ${c.bg} overflow-hidden`}>
          <div
            className={`h-full rounded-full ${c.fill} transition-all duration-500 ease-out`}
            style={{ width: `${barWidth}%` }}
          />
        </div>
      </div>
    </div>
  );
}
FILEOF

# ====== レース詳細ページを更新（VoteDistribution を追加）======
echo "📝 src/app/(main)/races/[raceId]/page.tsx を更新"
cat << 'FILEOF' > src/app/\(main\)/races/\[raceId\]/page.tsx
import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import HorseList from "@/components/races/HorseList";
import VoteForm from "@/components/races/VoteForm";
import VoteSummary from "@/components/races/VoteSummary";
import VoteDistribution from "@/components/races/VoteDistribution";
import RaceResultTable from "@/components/races/RaceResultTable";

type Props = {
  params: Promise<{ raceId: string }>;
};

export default async function RaceDetailPage({ params }: Props) {
  const { raceId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // レース情報
  const { data: race, error } = await supabase
    .from("races")
    .select("*")
    .eq("id", raceId)
    .single();

  if (!race || error) notFound();

  // 出馬表
  const { data: entries } = await supabase
    .from("race_entries")
    .select("*, horses(id, name, sex, sire, trainer, stable_area, career_record)")
    .eq("race_id", raceId)
    .eq("is_scratched", false)
    .order("post_number", { ascending: true });

  // 自分の投票
  const { data: myVote } = await supabase
    .from("votes")
    .select("*, vote_picks(*, race_entries(post_number, horses(name)))")
    .eq("race_id", raceId)
    .eq("user_id", user.id)
    .maybeSingle();

  // 投票集計
  const { count: totalVotes } = await supabase
    .from("votes")
    .select("*", { count: "exact", head: true })
    .eq("race_id", raceId);

  // レース結果（finished の場合）
  let results = null;
  let payouts = null;
  if (race.status === "finished") {
    const { data: r } = await supabase
      .from("race_results")
      .select("*, race_entries(post_number, jockey, odds, popularity, horses(name))")
      .eq("race_id", raceId)
      .order("finish_position", { ascending: true });
    results = r;

    const { data: p } = await supabase
      .from("payouts")
      .select("*")
      .eq("race_id", raceId);
    payouts = p;
  }

  const gradeColor = getGradeColor(race.grade);
  const postTime = race.post_time
    ? new Date(race.post_time).toLocaleTimeString("ja-JP", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const isVotable = race.status === "voting_open" && !myVote;
  const hasVoted = !!myVote;
  const isFinished = race.status === "finished";

  return (
    <div className="space-y-4">
      {/* パンくずリスト */}
      <div className="text-sm text-gray-400">
        <Link href="/races" className="hover:text-green-600">レース一覧</Link>
        <span className="mx-2">›</span>
        <span className="text-gray-600">{race.name}</span>
      </div>

      {/* レースヘッダー */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center gap-3 mb-3">
          {race.grade && (
            <span className={`text-sm font-bold px-3 py-1 rounded ${gradeColor}`}>
              {race.grade}
            </span>
          )}
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
            isVotable ? "bg-green-100 text-green-700"
              : isFinished ? "bg-gray-100 text-gray-600"
              : hasVoted ? "bg-blue-100 text-blue-700"
              : "bg-yellow-100 text-yellow-700"
          }`}>
            {isVotable ? "🗳 投票受付中"
              : isFinished ? "📊 結果確定"
              : hasVoted ? "✅ 投票済み"
              : "準備中"}
          </span>
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">{race.name}</h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
          <span>📍 {race.course_name} {race.race_number}R</span>
          <span>🏟 {race.track_type} {race.distance}m</span>
          <span>🐴 {race.head_count ?? entries?.length ?? "?"}頭</span>
          {postTime && <span>🕐 {postTime} 発走</span>}
          {race.track_condition && <span>馬場: {race.track_condition}</span>}
          <span>投票: {totalVotes ?? 0}人</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ====== メインエリア ====== */}
        <div className="lg:col-span-2 space-y-4">
          {/* レース結果（finished の場合） */}
          {isFinished && results && (
            <RaceResultTable results={results} payouts={payouts} myVote={myVote} />
          )}

          {/* 投票フォーム（投票可能な場合） */}
          {isVotable && entries && (
            <VoteForm raceId={race.id} entries={entries} />
          )}

          {/* みんなの予想分布（投票済み or 結果確定の場合） */}
          {(hasVoted || isFinished) && (
            <VoteDistribution raceId={race.id} />
          )}

          {/* 出馬表（投票済み or 結果確定） */}
          {!isVotable && entries && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="font-bold text-gray-800 mb-3">📋 出馬表</h2>
              <HorseList entries={entries} myVote={myVote} results={results} />
            </div>
          )}
        </div>

        {/* ====== サイドバー ====== */}
        <div className="space-y-4">
          {/* 投票済みの場合：自分の予想 */}
          {hasVoted && myVote && (
            <VoteSummary vote={myVote} isFinished={isFinished} />
          )}

          {/* 投票状況サマリー（投票済みの場合） */}
          {(hasVoted || isFinished) && (
            <VoteStats raceId={race.id} totalVotes={totalVotes ?? 0} />
          )}

          {/* ポイントルール */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-bold text-gray-800 mb-3">🎯 獲得ポイント目安</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-1.5 border-b border-gray-50">
                <span className="text-gray-600">1着的中（1番人気）</span>
                <span className="font-bold text-green-600">+50P</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-50">
                <span className="text-gray-600">1着的中（4〜6番人気）</span>
                <span className="font-bold text-green-600">+200P</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-50">
                <span className="text-gray-600">1着的中（10番人気〜）</span>
                <span className="font-bold text-green-600">+500P</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-50">
                <span className="text-gray-600">複勝的中（1頭あたり）</span>
                <span className="font-bold text-blue-600">+30P</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-50">
                <span className="text-gray-600">危険馬的中</span>
                <span className="font-bold text-orange-600">+10P</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-gray-600">完全的中ボーナス</span>
                <span className="font-bold text-yellow-600">+300P</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 投票状況サマリーカード（サーバーコンポーネント）
async function VoteStats({ raceId, totalVotes }: { raceId: string; totalVotes: number }) {
  const supabase = await createClient();

  // 投票者のランク分布を取得
  const { data: voterProfiles } = await supabase
    .from("votes")
    .select("user_id, profiles(rank_id)")
    .eq("race_id", raceId);

  // ランク帯ごとの集計
  const tierCounts: Record<string, number> = {};
  for (const v of voterProfiles ?? []) {
    const rankId = (v.profiles as any)?.rank_id ?? "beginner_1";
    const tier = rankId.startsWith("master") || rankId === "legend"
      ? "マスター以上"
      : rankId.startsWith("advanced")
      ? "上級予想士"
      : rankId.startsWith("forecaster")
      ? "予想士"
      : "ビギナー";
    tierCounts[tier] = (tierCounts[tier] ?? 0) + 1;
  }

  const tiers = [
    { name: "マスター以上", icon: "👑", color: "text-yellow-600" },
    { name: "上級予想士", icon: "⭐⭐", color: "text-purple-600" },
    { name: "予想士", icon: "⭐", color: "text-blue-600" },
    { name: "ビギナー", icon: "🔰", color: "text-green-600" },
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <h3 className="font-bold text-gray-800 mb-3">👥 投票者の内訳</h3>
      <div className="text-center mb-3">
        <span className="text-3xl font-bold text-green-600">{totalVotes}</span>
        <span className="text-sm text-gray-500 ml-1">人が投票</span>
      </div>
      <div className="space-y-2">
        {tiers.map((tier) => {
          const count = tierCounts[tier.name] ?? 0;
          if (count === 0 && totalVotes === 0) return null;
          const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
          return (
            <div key={tier.name} className="flex items-center justify-between text-sm">
              <span className="text-gray-600">
                <span className="mr-1">{tier.icon}</span>
                {tier.name}
              </span>
              <div className="flex items-center gap-2">
                <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-400 rounded-full"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 w-14 text-right">
                  {count}人 ({pct}%)
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getGradeColor(grade: string | null): string {
  switch (grade) {
    case "G1": return "bg-yellow-100 text-yellow-800";
    case "G2": return "bg-red-100 text-red-700";
    case "G3": return "bg-green-100 text-green-700";
    case "OP": return "bg-blue-100 text-blue-700";
    default:   return "bg-gray-100 text-gray-600";
  }
}
FILEOF

echo ""
echo "✅ Phase 3 セットアップ完了！"
echo ""
echo "📂 作成・更新されたファイル:"
echo "  src/app/api/races/[raceId]/votes/route.ts  ← 投票集計API（新規）"
echo "  src/components/races/VoteDistribution.tsx   ← みんなの予想分布（新規）"
echo "  src/app/(main)/races/[raceId]/page.tsx      ← レース詳細（更新）"
echo ""
echo "🎮 動作確認の手順:"
echo "  1. npm run dev"
echo "  2. レース一覧 → 京都記念をクリック"
echo "  3. 投票する（まだの場合）"
echo "  4. 投票後、「📊 みんなの予想」の分布バーが表示される"
echo "  5. サイドバーに「👥 投票者の内訳」も表示される"
echo ""
echo "💡 ポイント:"
echo "  ・投票するとリアルタイムで分布が更新されます（Supabase Realtime）"
echo "  ・1着予想 / 複勝予想 / 危険馬 の3タブ切り替え"
echo "  ・投票者のランク帯内訳も表示"
