"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useTheme } from "@/contexts/ThemeContext";

const STYLE_TYPES = [
  { id: "analyst", name: "データ分析派", icon: "📊", desc: "データと指数を重視。堅実な予想で的中率重視。", color: "blue" },
  { id: "intuition", name: "直感派", icon: "🎯", desc: "オッズや人気に縛られず独自の視点で勝負。", color: "purple" },
  { id: "favorite", name: "本命党", icon: "👑", desc: "人気馬を中心に手堅く。安定感のある予想スタイル。", color: "yellow" },
  { id: "longshot", name: "穴党", icon: "💎", desc: "高配当を狙う勝負師。一発逆転を狙う。", color: "red" },
  { id: "balanced", name: "バランス型", icon: "⚖️", desc: "本命と穴をバランスよく。状況に応じた柔軟な予想。", color: "green" },
  { id: "beginner", name: "成長中", icon: "🌱", desc: "まだデータが少ないです。投票を重ねてスタイルを確立しよう！", color: "gray" },
];

type Props = {
  profile: any;
  votes: any[];
};

export default function StyleDiagnosisClient({ profile, votes }: Props) {
  const { isDark } = useTheme();

  const cardBg = isDark ? "bg-slate-900 border-slate-700" : "bg-white border-gray-200";
  const textPrimary = isDark ? "text-slate-100" : "text-gray-900";
  const textSecondary = isDark ? "text-slate-400" : "text-gray-600";
  const textMuted = isDark ? "text-slate-500" : "text-gray-400";
  const accentColor = isDark ? "text-amber-400" : "text-green-600";
  const statBg = isDark ? "bg-slate-800" : "bg-gray-50";

  const diagnosis = useMemo(() => {
    if (votes.length < 5) return STYLE_TYPES.find(s => s.id === "beginner")!;

    let avgOdds = 0;
    let avgPopularity = 0;
    let winCount = 0;
    let placeCount = 0;

    votes.forEach(vote => {
      const winPick = vote.vote_picks?.find((p: any) => p.pick_type === "win");
      if (winPick?.race_entries) {
        avgOdds += winPick.race_entries.odds ?? 10;
        avgPopularity += winPick.race_entries.popularity ?? 8;
      }
      if (vote.status === "settled_hit") {
        if (vote.is_perfect) winCount++;
        else placeCount++;
      }
    });

    avgOdds /= votes.length;
    avgPopularity /= votes.length;
    const hitRate = (winCount + placeCount) / votes.length;

    if (avgPopularity <= 3 && hitRate >= 0.4) return STYLE_TYPES.find(s => s.id === "favorite")!;
    if (avgOdds >= 15 || avgPopularity >= 8) return STYLE_TYPES.find(s => s.id === "longshot")!;
    if (hitRate >= 0.5) return STYLE_TYPES.find(s => s.id === "analyst")!;
    if (avgOdds >= 8 && avgPopularity >= 5) return STYLE_TYPES.find(s => s.id === "intuition")!;
    return STYLE_TYPES.find(s => s.id === "balanced")!;
  }, [votes]);

  const stats = useMemo(() => {
    const total = votes.length;
    const hits = votes.filter(v => v.status === "settled_hit").length;
    const perfects = votes.filter(v => v.is_perfect).length;
    const totalPoints = votes.reduce((sum, v) => sum + (v.earned_points ?? 0), 0);
    return { total, hits, perfects, totalPoints, hitRate: total > 0 ? Math.round((hits / total) * 100) : 0 };
  }, [votes]);

  const getColorClass = (color: string) => {
    const colors: Record<string, string> = {
      blue: isDark ? "from-blue-500/20 to-cyan-500/20 border-blue-500/30" : "from-blue-50 to-cyan-50 border-blue-200",
      purple: isDark ? "from-purple-500/20 to-pink-500/20 border-purple-500/30" : "from-purple-50 to-pink-50 border-purple-200",
      yellow: isDark ? "from-yellow-500/20 to-orange-500/20 border-yellow-500/30" : "from-yellow-50 to-orange-50 border-yellow-200",
      red: isDark ? "from-red-500/20 to-rose-500/20 border-red-500/30" : "from-red-50 to-rose-50 border-red-200",
      green: isDark ? "from-green-500/20 to-emerald-500/20 border-green-500/30" : "from-green-50 to-emerald-50 border-green-200",
      gray: isDark ? "from-slate-700 to-slate-800 border-slate-600" : "from-gray-50 to-gray-100 border-gray-200",
    };
    return colors[color] ?? colors.gray;
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className={`text-sm ${textMuted}`}>
        <Link href="/mypage" className={isDark ? "hover:text-amber-400" : "hover:text-green-600"}>マイページ</Link>
        <span className="mx-2">›</span>
        <span className={textSecondary}>予想スタイル診断</span>
      </div>

      <h1 className={`text-xl font-bold ${textPrimary}`}>🎯 予想スタイル診断</h1>

      {/* 診断結果 */}
      <div className={`rounded-2xl border p-6 bg-gradient-to-br ${getColorClass(diagnosis.color)}`}>
        <div className="text-center">
          <div className="text-5xl mb-3">{diagnosis.icon}</div>
          <h2 className={`text-2xl font-black mb-2 ${textPrimary}`}>{diagnosis.name}</h2>
          <p className={textSecondary}>{diagnosis.desc}</p>
        </div>
      </div>

      {/* 統計 */}
      <div className={`rounded-2xl border p-5 ${cardBg}`}>
        <h3 className={`font-bold mb-3 ${textPrimary}`}>📈 あなたの予想傾向</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className={`rounded-xl p-4 text-center ${statBg}`}>
            <div className={`text-2xl font-black ${accentColor}`}>{stats.total}</div>
            <div className={`text-xs ${textMuted}`}>総投票数</div>
          </div>
          <div className={`rounded-xl p-4 text-center ${statBg}`}>
            <div className={`text-2xl font-black ${accentColor}`}>{stats.hitRate}%</div>
            <div className={`text-xs ${textMuted}`}>的中率</div>
          </div>
          <div className={`rounded-xl p-4 text-center ${statBg}`}>
            <div className="text-2xl font-black text-yellow-500">{stats.perfects}</div>
            <div className={`text-xs ${textMuted}`}>完全的中</div>
          </div>
          <div className={`rounded-xl p-4 text-center ${statBg}`}>
            <div className={`text-2xl font-black ${accentColor}`}>+{stats.totalPoints}P</div>
            <div className={`text-xs ${textMuted}`}>獲得ポイント</div>
          </div>
        </div>
      </div>

      {/* 他のタイプ */}
      <div className={`rounded-2xl border p-5 ${cardBg}`}>
        <h3 className={`font-bold mb-3 ${textPrimary}`}>📚 全てのスタイル</h3>
        <div className="space-y-2">
          {STYLE_TYPES.filter(s => s.id !== "beginner").map(style => (
            <div key={style.id} className={`flex items-center gap-3 p-3 rounded-xl ${style.id === diagnosis.id ? (isDark ? "bg-amber-500/10 border border-amber-500/30" : "bg-green-50 border border-green-200") : statBg}`}>
              <span className="text-2xl">{style.icon}</span>
              <div className="flex-1">
                <div className={`font-bold text-sm ${textPrimary}`}>{style.name}</div>
                <div className={`text-xs ${textMuted}`}>{style.desc}</div>
              </div>
              {style.id === diagnosis.id && <span className={`text-xs font-bold ${accentColor}`}>あなた</span>}
            </div>
          ))}
        </div>
      </div>

      <Link href="/mypage" className={`block text-center py-3 rounded-xl font-bold ${isDark ? "bg-amber-500 text-slate-900" : "bg-green-600 text-white"}`}>
        マイページに戻る
      </Link>
    </div>
  );
}
