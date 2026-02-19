"use client";

// src/app/(main)/mypage/stats/StatsClient.tsx
// 統計ダッシュボードのクライアントコンポーネント

import { useState, useEffect } from "react";
import Link from "next/link";

type Stats = {
  totalVotes: number;
  totalHits: number;
  hitRate: number;
  honmeiTotal: number;
  honmeiHits: number;
  honmeiHitRate: number;
  byCourse: Record<string, { total: number; hits: number; hitRate: number }>;
  bySurface: Record<string, { total: number; hits: number; hitRate: number }>;
  byDistance: Record<string, { total: number; hits: number; hitRate: number }>;
  byJockey: Record<string, { total: number; hits: number; hitRate: number }>;
  byMark: Record<string, { total: number; hits: number; hitRate: number }>;
  trackingCount: number;
};

type Period = "week" | "month" | "all";

export function StatsClient() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [period, setPeriod] = useState<Period>("month");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/karte/stats?period=${period}`);
        const json = await res.json();
        if (json.data) setStats(json.data);
      } catch (error) {
        console.error("Stats fetch error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [period]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-green-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">データを取得できませんでした</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10">
        <h1 className="text-lg font-bold text-gray-800">📊 統計ダッシュボード</h1>
      </header>

      {/* 期間選択 */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex gap-2">
          {(
            [
              { id: "week", label: "今週" },
              { id: "month", label: "今月" },
              { id: "all", label: "全期間" },
            ] as { id: Period; label: string }[]
          ).map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`flex-1 py-2 rounded-xl font-bold text-sm transition-colors ${
                period === p.id
                  ? "bg-green-600 text-white"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* サマリー */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="的中率"
            value={`${stats.hitRate}%`}
            sub={`${stats.totalHits}/${stats.totalVotes} レース`}
            color="green"
          />
          <StatCard
            label="本命的中"
            value={`${stats.honmeiHitRate}%`}
            sub={`${stats.honmeiHits}/${stats.honmeiTotal} 回`}
            color="orange"
          />
          <StatCard
            label="予想数"
            value={`${stats.totalVotes}`}
            sub="レース"
            color="blue"
          />
          <StatCard
            label="追跡馬"
            value={`${stats.trackingCount}`}
            sub="頭"
            color="purple"
          />
        </div>

        {/* 印別成績 */}
        <section className="bg-white rounded-2xl border border-gray-200 p-4">
          <h2 className="font-bold text-gray-800 mb-3">🎯 印別成績</h2>
          <div className="space-y-3">
            {Object.entries(stats.byMark)
              .sort((a, b) => {
                const order = ["◎", "○", "▲", "△", "×"];
                return order.indexOf(a[0]) - order.indexOf(b[0]);
              })
              .map(([mark, data]) => (
                <StatBar
                  key={mark}
                  label={mark}
                  hits={data.hits}
                  total={data.total}
                  rate={data.hitRate}
                  color={
                    mark === "◎"
                      ? "red"
                      : mark === "○"
                      ? "blue"
                      : mark === "▲"
                      ? "green"
                      : "yellow"
                  }
                />
              ))}
          </div>
        </section>

        {/* 馬場別成績 */}
        <section className="bg-white rounded-2xl border border-gray-200 p-4">
          <h2 className="font-bold text-gray-800 mb-3">🏟️ 馬場別成績</h2>
          <div className="space-y-3">
            {Object.entries(stats.bySurface).map(([surface, data]) => (
              <StatBar
                key={surface}
                label={surface}
                hits={data.hits}
                total={data.total}
                rate={data.hitRate}
              />
            ))}
          </div>
        </section>

        {/* 距離別成績 */}
        <section className="bg-white rounded-2xl border border-gray-200 p-4">
          <h2 className="font-bold text-gray-800 mb-3">📏 距離別成績</h2>
          <div className="space-y-3">
            {Object.entries(stats.byDistance)
              .sort((a, b) => {
                const order = ["短距離", "マイル", "中距離", "長距離"];
                return order.indexOf(a[0]) - order.indexOf(b[0]);
              })
              .map(([distance, data]) => (
                <StatBar
                  key={distance}
                  label={distance}
                  hits={data.hits}
                  total={data.total}
                  rate={data.hitRate}
                />
              ))}
          </div>
        </section>

        {/* 騎手別成績 */}
        {Object.keys(stats.byJockey).length > 0 && (
          <section className="bg-white rounded-2xl border border-gray-200 p-4">
            <h2 className="font-bold text-gray-800 mb-3">🏇 騎手別成績（上位5名）</h2>
            <div className="space-y-3">
              {Object.entries(stats.byJockey).map(([jockey, data]) => (
                <div key={jockey} className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm">
                    🏇
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-800">{jockey}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-800">{data.hitRate}%</p>
                    <p className="text-xs text-gray-500">
                      {data.hits}/{data.total}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 道場レコメンド */}
        {stats.bySurface["ダート"]?.hitRate < 30 && (
          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-2xl p-4 text-white">
            <p className="font-bold">💡 苦手分野を克服しよう</p>
            <p className="text-sm opacity-90 mt-1">
              ダートの的中率が低いようです
            </p>
            <Link
              href="/dojo"
              className="mt-3 inline-block bg-white text-green-600 font-bold py-2 px-4 rounded-xl text-sm"
            >
              道場で学ぶ →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

// 統計カード
function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub: string;
  color: "green" | "blue" | "orange" | "purple";
}) {
  const colorClasses = {
    green: "bg-green-50 border-green-200",
    blue: "bg-blue-50 border-blue-200",
    orange: "bg-orange-50 border-orange-200",
    purple: "bg-purple-50 border-purple-200",
  };

  return (
    <div className={`rounded-2xl border p-4 ${colorClasses[color]}`}>
      <p className="text-sm text-gray-600">{label}</p>
      <p className="text-2xl font-black text-gray-800 mt-1">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{sub}</p>
    </div>
  );
}

// 統計バー
function StatBar({
  label,
  hits,
  total,
  rate,
  color = "green",
}: {
  label: string;
  hits: number;
  total: number;
  rate: number;
  color?: "green" | "red" | "blue" | "yellow";
}) {
  const barColors = {
    green: "bg-green-500",
    red: "bg-red-500",
    blue: "bg-blue-500",
    yellow: "bg-yellow-500",
  };

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="font-bold text-gray-700">{label}</span>
        <span className="text-gray-500">
          {hits}/{total} ({rate}%)
        </span>
      </div>
      <div className="bg-gray-200 rounded-full h-2">
        <div
          className={`${barColors[color]} rounded-full h-2 transition-all`}
          style={{ width: `${Math.min(rate, 100)}%` }}
        />
      </div>
    </div>
  );
}
