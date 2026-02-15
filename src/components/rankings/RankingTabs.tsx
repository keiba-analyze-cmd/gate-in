"use client";

import { useEffect, useState } from "react";
import RankingList from "./RankingList";
import LikeRankingList from "./LikeRankingList";
import WeeklyMVPCard from "./WeeklyMVPCard";
import { useTheme } from "@/contexts/ThemeContext";

type Props = {
  currentUserId: string;
};

const TABS = [
  { key: "monthly", label: "📅 月間", desc: "今月のポイントランキング" },
  { key: "cumulative", label: "👑 累計", desc: "累計ポイントランキング" },
  { key: "likes", label: "🔥 人気", desc: "いいねが多い予想ランキング" },
  { key: "weekly", label: "🏆 週間MVP", desc: "今週・先週のMVP" },
  { key: "hit_rate", label: "🎯 的中率", desc: "1着的中数ランキング（5投票以上）" },
];

export default function RankingTabs({ currentUserId }: Props) {
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState("monthly");
  const [rankings, setRankings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeTab === "likes" || activeTab === "weekly") {
      setLoading(false);
      return;
    }

    setLoading(true);
    fetch(`/api/rankings?type=${activeTab}`)
      .then((res) => res.json())
      .then((data) => {
        setRankings(data.rankings ?? []);
        setLoading(false);
      });
  }, [activeTab]);

  const currentTab = TABS.find((t) => t.key === activeTab);

  const tabActive = isDark ? "bg-amber-500 text-slate-900" : "bg-green-600 text-white";
  const tabInactive = isDark 
    ? "bg-slate-800 text-slate-300 border border-slate-700 hover:border-amber-500/50" 
    : "bg-white text-gray-600 border border-gray-200 hover:border-green-300";
  const cardBg = isDark ? "bg-slate-900" : "bg-white";
  const textMuted = isDark ? "text-slate-400" : "text-gray-400";

  return (
    <div>
      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1 scrollbar-hide">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === tab.key ? tabActive : tabInactive
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {currentTab && (
        <p className={`text-xs mb-3 ${textMuted}`}>{currentTab.desc}</p>
      )}

      {activeTab === "likes" && <LikeRankingList />}
      {activeTab === "weekly" && <WeeklyMVPCard />}

      {activeTab !== "likes" && activeTab !== "weekly" && (
        loading ? (
          <div className={`${cardBg} rounded-xl p-8 text-center text-sm ${textMuted}`}>
            読み込み中...
          </div>
        ) : rankings.length === 0 ? (
          <div className={`${cardBg} rounded-xl p-8 text-center text-sm ${textMuted}`}>
            まだランキングデータがありません
          </div>
        ) : (
          <RankingList rankings={rankings} currentUserId={currentUserId} type={activeTab} />
        )
      )}
    </div>
  );
}
