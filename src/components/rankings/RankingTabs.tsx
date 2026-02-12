"use client";

import { useEffect, useState } from "react";
import RankingList from "./RankingList";

type Props = {
  currentUserId: string;
};

const TABS = [
  { key: "monthly", label: "📅 月間", desc: "今月のポイントランキング" },
  { key: "cumulative", label: "👑 累計", desc: "累計ポイントランキング" },
  { key: "hit_rate", label: "🎯 的中率", desc: "1着的中数ランキング（5投票以上）" },
  { key: "streak", label: "🔥 連続", desc: "最長連続的中ランキング" },
];

export default function RankingTabs({ currentUserId }: Props) {
  const [activeTab, setActiveTab] = useState("monthly");
  const [rankings, setRankings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/rankings?type=${activeTab}`)
      .then((res) => res.json())
      .then((data) => {
        setRankings(data.rankings ?? []);
        setLoading(false);
      });
  }, [activeTab]);

  const currentTab = TABS.find((t) => t.key === activeTab);

  return (
    <div>
      {/* タブ */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === tab.key
                ? "bg-green-600 text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:border-green-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 説明 */}
      {currentTab && (
        <p className="text-xs text-gray-400 mb-3">{currentTab.desc}</p>
      )}

      {/* ランキングリスト */}
      {loading ? (
        <div className="bg-white rounded-xl p-8 text-center text-gray-400 text-sm">
          読み込み中...
        </div>
      ) : rankings.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center text-gray-400 text-sm">
          まだランキングデータがありません
        </div>
      ) : (
        <RankingList
          rankings={rankings}
          type={activeTab}
          currentUserId={currentUserId}
        />
      )}
    </div>
  );
}
