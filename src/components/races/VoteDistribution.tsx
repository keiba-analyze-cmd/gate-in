"use client";

import { useEffect, useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";

type DistributionData = {
  win: { post_number: number; horse_name: string; count: number; percentage: number }[];
  place: { post_number: number; horse_name: string; count: number; percentage: number }[];
  back: { post_number: number; horse_name: string; count: number; percentage: number }[];
  danger: { post_number: number; horse_name: string; count: number; percentage: number }[];
  total_votes: number;
};

type Props = { raceId: string };

export default function VoteDistribution({ raceId }: Props) {
  const { isDark } = useTheme();
  const [data, setData] = useState<DistributionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"win" | "place" | "back" | "danger">("win");

  const cardBg = isDark ? "bg-slate-900 border-slate-700" : "bg-white border-gray-100";
  const textPrimary = isDark ? "text-slate-100" : "text-gray-900";
  const textMuted = isDark ? "text-slate-500" : "text-gray-400";
  const tabActive = isDark ? "text-amber-400 border-amber-400" : "text-green-600 border-green-600";
  const tabInactive = isDark ? "text-slate-400 border-transparent hover:text-slate-200" : "text-gray-500 border-transparent hover:text-gray-700";
  const barBg = isDark ? "bg-slate-700" : "bg-gray-200";

  useEffect(() => {
    fetch(`/api/races/${raceId}/distribution`)
      .then(res => res.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [raceId]);

  const tabs = [
    { key: "win" as const, label: "◎ 1着予想", count: data?.win.length ?? 0 },
    { key: "place" as const, label: "○ 相手", count: data?.place.length ?? 0 },
    { key: "back" as const, label: "△ 抑え", count: data?.back.length ?? 0 },
    { key: "danger" as const, label: "⚠️ 危険馬", count: data?.danger.length ?? 0 },
  ];

  const currentData = data?.[activeTab] ?? [];
  const getMedalIcon = (index: number) => index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : null;
  const getBarColor = (tab: string) => {
    const colors = { win: "bg-red-500", place: "bg-blue-500", back: "bg-yellow-500", danger: "bg-gray-500" };
    return colors[tab as keyof typeof colors] ?? "bg-gray-500";
  };

  if (loading) return <div className={`rounded-2xl border p-8 text-center ${cardBg} ${textMuted}`}>読み込み中...</div>;
  if (!data) return null;

  return (
    <div className={`rounded-2xl border overflow-hidden ${cardBg}`}>
      <div className="px-4 py-3 flex items-center justify-between">
        <h2 className={`font-bold ${textPrimary}`}>📊 みんなの予想</h2>
        <span className={`text-xs px-2 py-1 rounded-full ${isDark ? "bg-slate-700 text-slate-300" : "bg-gray-100 text-gray-600"}`}>
          {data.total_votes}人が投票
        </span>
      </div>
      <div className={`flex border-b ${isDark ? "border-slate-700" : "border-gray-100"}`}>
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2 text-xs font-medium border-b-2 transition-colors ${activeTab === tab.key ? tabActive : tabInactive}`}>
            {tab.label} {tab.count}
          </button>
        ))}
      </div>
      <div className="p-4 space-y-3">
        {currentData.length === 0 ? (
          <div className={`text-center py-4 text-sm ${textMuted}`}>まだ投票がありません</div>
        ) : (
          currentData.slice(0, 5).map((item, i) => (
            <div key={item.post_number} className="flex items-center gap-3">
              <span className="w-6 text-center">{getMedalIcon(i)}</span>
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${isDark ? "bg-slate-700 text-slate-100" : "bg-gray-800 text-white"}`}>
                {item.post_number}
              </span>
              <div className="flex-1">
                <div className={`text-sm font-bold ${textPrimary}`}>{item.horse_name}</div>
                <div className={`h-2 rounded-full overflow-hidden ${barBg}`}>
                  <div className={`h-full ${getBarColor(activeTab)}`} style={{ width: `${item.percentage}%` }} />
                </div>
              </div>
              <div className="text-right">
                <span className={`text-sm font-bold ${isDark ? "text-amber-400" : "text-green-600"}`}>{item.percentage.toFixed(1)}%</span>
                <div className={`text-xs ${textMuted}`}>({item.count}票)</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
