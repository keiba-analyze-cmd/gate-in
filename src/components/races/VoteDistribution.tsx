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
