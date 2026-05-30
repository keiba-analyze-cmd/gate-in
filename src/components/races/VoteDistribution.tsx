"use client";

import { useEffect, useState } from "react";

type DistributionData = {
  win: { post_number: number; horse_name: string; count: number; percentage: number }[];
  place: { post_number: number; horse_name: string; count: number; percentage: number }[];
  back: { post_number: number; horse_name: string; count: number; percentage: number }[];
  danger: { post_number: number; horse_name: string; count: number; percentage: number }[];
  total_votes: number;
};

type Props = { raceId: string };

const BAR_COLOR: Record<string, string> = {
  win: "var(--brand)",
  place: "var(--info)",
  back: "var(--osae)",
  danger: "var(--ink-3)",
};

export default function VoteDistribution({ raceId }: Props) {
  const [data, setData] = useState<DistributionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"win" | "place" | "back" | "danger">("win");

  useEffect(() => {
    // 修正: /distribution → /votes
    fetch(`/api/races/${raceId}/votes`)
      .then(res => res.json())
      .then(setData)
      .catch(() => setData(null))
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

  if (loading) return <div className="rounded-2xl border bg-surface border-line p-8 text-center text-ink-3 font-display">読み込み中...</div>;
  if (!data) return <div className="rounded-2xl border bg-surface border-line p-8 text-center text-ink-3 font-display">データを取得できませんでした</div>;

  return (
    <div className="rounded-2xl border bg-surface border-line overflow-hidden font-display">
      <div className="px-4 py-3 flex items-center justify-between">
        <h2 className="font-bold text-ink">📊 みんなの予想</h2>
        <span className="text-xs px-2 py-1 rounded-full bg-surface-2 text-ink-2">
          <span className="font-data">{data.total_votes}</span>人が投票
        </span>
      </div>
      <div className="flex border-b border-line">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2 text-xs font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? "text-brand-strong border-brand"
                : "text-ink-3 border-transparent hover:text-ink-2"
            }`}>
            {tab.label} <span className="font-data">{tab.count}</span>
          </button>
        ))}
      </div>
      <div className="p-4 space-y-3">
        {currentData.length === 0 ? (
          <div className="text-center py-4 text-sm text-ink-3">まだ投票がありません</div>
        ) : (
          currentData.slice(0, 5).map((item, i) => (
            <div key={item.post_number} className="flex items-center gap-3">
              <span className="w-6 text-center">{getMedalIcon(i)}</span>
              <span
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold font-data"
                style={{ background: "var(--ink)", color: "var(--bg)" }}
              >
                {item.post_number}
              </span>
              <div className="flex-1">
                <div className="text-sm font-bold text-ink">{item.horse_name}</div>
                <div className="h-2 rounded-full overflow-hidden bg-surface-2">
                  <div className="h-full" style={{ width: `${item.percentage}%`, background: BAR_COLOR[activeTab] }} />
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-brand-strong font-data">{item.percentage.toFixed(1)}%</span>
                <div className="text-xs text-ink-3 font-data">({item.count}票)</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
