"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { getRank } from "@/lib/constants/ranks";
import { useTheme } from "@/contexts/ThemeContext";

type MVPData = {
  user_id: string;
  display_name: string;
  avatar_url: string | null; avatar_emoji: string | null;
  rank_id: string;
  points: number;
  win_count: number;
  vote_count: number;
};

export default function WeeklyMVPCard() {
  const { isDark } = useTheme();
  const [thisWeek, setThisWeek] = useState<MVPData | null>(null);
  const [lastWeek, setLastWeek] = useState<MVPData | null>(null);
  const [loading, setLoading] = useState(true);

  const cardBg = isDark ? "bg-slate-900 border-slate-700" : "bg-white border-gray-100";
  const textPrimary = isDark ? "text-slate-100" : "text-gray-900";
  const textSecondary = isDark ? "text-slate-400" : "text-gray-600";
  const textMuted = isDark ? "text-slate-500" : "text-gray-400";
  const accentColor = isDark ? "text-amber-400" : "text-green-600";
  const highlightBg = isDark ? "bg-gradient-to-br from-amber-500/20 to-orange-500/20 border-amber-500/30" : "bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200";
  const statBg = isDark ? "bg-slate-800" : "bg-gray-50";

  useEffect(() => {
    Promise.all([
      fetch("/api/rankings/weekly?week=this").then(r => r.json()),
      fetch("/api/rankings/weekly?week=last").then(r => r.json()),
    ]).then(([thisData, lastData]) => {
      setThisWeek(thisData.mvp);
      setLastWeek(lastData.mvp);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className={`rounded-2xl border p-8 text-center ${cardBg} ${textMuted}`}>読み込み中...</div>;

  const renderMVP = (mvp: MVPData | null, title: string, isMain: boolean) => {
    if (!mvp) return (
      <div className={`rounded-2xl border p-6 text-center ${cardBg}`}>
        <h3 className={`font-bold mb-2 ${textPrimary}`}>{title}</h3>
        <p className={textMuted}>まだデータがありません</p>
      </div>
    );

    const rank = getRank(mvp.rank_id);
    const userLink = `/users/${mvp.user_id}`;
    return (
      <div className={`rounded-2xl border p-6 ${isMain ? highlightBg : cardBg}`}>
        <h3 className={`font-bold mb-4 text-center ${textPrimary}`}>{title}</h3>
        <div className="flex flex-col items-center">
          <div className="relative mb-3">
            {mvp.avatar_url ? (
              <Image src={mvp.avatar_url} alt="" width={80} height={80} className="w-20 h-20 rounded-full" unoptimized />
            ) : (
              <div className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl ${isDark ? "bg-slate-700" : "bg-gray-100"}`}>🏇</div>
            )}
            <span className="absolute -top-2 -right-2 text-3xl">👑</span>
          </div>
          <Link href={userLink} className={`text-lg font-black hover:underline ${textPrimary}`}>{mvp.display_name}</Link>
          {rank && <div className={`text-sm ${textSecondary}`}>{rank.icon} {rank.name}</div>}
          <div className={`text-2xl font-black mt-2 ${accentColor}`}>{mvp.points} P</div>
          <div className="flex gap-4 mt-3">
            <div className={`text-center px-3 py-2 rounded-lg ${statBg}`}>
              <div className={`text-lg font-bold ${textPrimary}`}>{mvp.vote_count}</div>
              <div className={`text-xs ${textMuted}`}>投票数</div>
            </div>
            <div className={`text-center px-3 py-2 rounded-lg ${statBg}`}>
              <div className="text-lg font-bold text-red-500">{mvp.win_count}</div>
              <div className={`text-xs ${textMuted}`}>1着的中</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {renderMVP(thisWeek, "🏆 今週のMVP", true)}
      {renderMVP(lastWeek, "📅 先週のMVP", false)}
    </div>
  );
}
