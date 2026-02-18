// src/app/(main)/dojo/ranking/RankingClient.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTheme } from "@/contexts/ThemeContext";

type RankEntry = {
  rank: number;
  userId: string;
  displayName: string;
  handle: string;
  avatarUrl: string;
  totalXp: number;
};

export default function RankingClient() {
  const { isDark } = useTheme();
  const [ranking, setRanking] = useState<RankEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dojo/ranking")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setRanking(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const cardBg = isDark ? "bg-slate-900 border-slate-700" : "bg-white border-gray-200";
  const textPrimary = isDark ? "text-slate-100" : "text-gray-900";
  const textSecondary = isDark ? "text-slate-400" : "text-gray-500";
  const textMuted = isDark ? "text-slate-500" : "text-gray-400";
  const accentColor = isDark ? "text-amber-400" : "text-green-600";

  const getRankStyle = (rank: number) => {
    if (rank === 1) return "text-yellow-500";
    if (rank === 2) return "text-gray-400";
    if (rank === 3) return "text-amber-600";
    return textMuted;
  };

  const getRankEmoji = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return String(rank);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-8">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h1 className={`text-xl font-black ${textPrimary}`}>🏆 道場ランキング</h1>
        <Link href="/dojo" className={`text-sm ${textMuted}`}>
          ← 道場に戻る
        </Link>
      </div>

      {/* ランキング表 */}
      {loading ? (
        <div className={`rounded-2xl border p-8 text-center ${cardBg}`}>
          <p className={textMuted}>読み込み中...</p>
        </div>
      ) : ranking.length === 0 ? (
        <div className={`rounded-2xl border p-8 text-center ${cardBg}`}>
          <span className="text-4xl block mb-2">🏟️</span>
          <p className={`text-sm ${textSecondary}`}>
            まだランキングデータがありません。<br />
            クイズに挑戦してXPを獲得しよう！
          </p>
        </div>
      ) : (
        <>
          {/* トップ3 */}
          {ranking.length >= 3 && (
            <div className="flex gap-2 justify-center items-end">
              {[1, 0, 2].map((idx) => {
                const entry = ranking[idx];
                if (!entry) return null;
                const isFirst = idx === 0;
                return (
                  <div
                    key={entry.userId}
                    className={`flex-1 rounded-2xl border p-3 text-center ${cardBg} ${
                      isFirst ? "pb-5" : ""
                    }`}
                    style={{ order: idx === 1 ? 0 : idx === 0 ? 1 : 2 }}
                  >
                    <div className={`text-2xl mb-1 ${isFirst ? "text-3xl" : ""}`}>
                      {getRankEmoji(entry.rank)}
                    </div>
                    <div
                      className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center text-lg font-bold mb-1 ${
                        isDark ? "bg-slate-800" : "bg-gray-100"
                      }`}
                    >
                      {entry.avatarUrl ? (
                        <img
                          src={entry.avatarUrl}
                          alt=""
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        entry.displayName.charAt(0)
                      )}
                    </div>
                    <div className={`text-xs font-bold truncate ${textPrimary}`}>
                      {entry.displayName}
                    </div>
                    <div className={`text-sm font-black mt-1 ${accentColor}`}>
                      {entry.totalXp.toLocaleString()} XP
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 4位以降 */}
          <div className={`rounded-2xl border overflow-hidden ${cardBg}`}>
            {ranking.slice(3).map((entry) => (
              <div
                key={entry.userId}
                className={`flex items-center gap-3 px-4 py-3 border-b last:border-b-0 ${
                  isDark ? "border-slate-800" : "border-gray-100"
                }`}
              >
                <span
                  className={`w-7 text-center font-black text-sm ${getRankStyle(entry.rank)}`}
                >
                  {entry.rank}
                </span>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                    isDark ? "bg-slate-800" : "bg-gray-100"
                  }`}
                >
                  {entry.avatarUrl ? (
                    <img
                      src={entry.avatarUrl}
                      alt=""
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    entry.displayName.charAt(0)
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-bold truncate ${textPrimary}`}>
                    {entry.displayName}
                  </div>
                  {entry.handle && (
                    <div className={`text-[10px] ${textMuted}`}>
                      @{entry.handle}
                    </div>
                  )}
                </div>
                <div className={`text-sm font-black ${accentColor}`}>
                  {entry.totalXp.toLocaleString()} XP
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
