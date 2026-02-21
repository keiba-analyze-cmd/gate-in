"use client";

import Link from "next/link";
import RaceCardCountdown from "./RaceCardCountdown";
import { calculateHitRank, getHitRankStyle, HIT_RANKS, type HitRank } from "@/lib/constants/hit-ranks";
import { useTheme } from "@/contexts/ThemeContext";

type VotePick = {
  pick_type: string;
  is_hit: boolean | null;
};

type Props = {
  race: {
    id: string;
    name: string;
    race_date: string;
    course_name: string;
    grade: string | null;
    status: string;
    race_number?: number | null;
    distance?: number | null;
    start_time?: string | null;
    track_type?: string | null;
    head_count?: number | null;
    post_time?: string | null;
  };
  voted?: boolean;
  vote?: {
    status: string;
    is_perfect?: boolean;
    vote_picks?: VotePick[];
  } | null;
  isDeadlinePassed?: boolean;
};

const GRADE_STYLES: Record<string, { bg: string; text: string }> = {
  G1: { bg: "bg-orange-600", text: "text-white" },
  G2: { bg: "bg-red-600", text: "text-white" },
  G3: { bg: "bg-green-600", text: "text-white" },
  OP: { bg: "bg-gray-600", text: "text-white" },
  L: { bg: "bg-blue-600", text: "text-white" },
};

export default function RaceCard({ race, voted, vote, isDeadlinePassed }: Props) {
  const { isDark } = useTheme();
  const grade = race.grade ? GRADE_STYLES[race.grade] ?? { bg: "bg-gray-500", text: "text-white" } : null;
  const isFinished = race.status === "finished";

  // 5段階的中ランクを計算（vote_picks を含む vote オブジェクトで正確に判定）
  let hitRank: HitRank = null;
  if (isFinished && vote) {
    hitRank = calculateHitRank(vote);
  }

  const rankConfig = hitRank ? HIT_RANKS[hitRank] : null;

  // ステータスラベル
  const statusInfo = isFinished
    ? { label: "確定", color: isDark ? "text-slate-400 font-bold" : "text-gray-500 font-bold" }
    : isDeadlinePassed
    ? { label: "締切", color: isDark ? "text-orange-400 font-bold" : "text-orange-500 font-bold" }
    : race.status === "voting_open"
    ? { label: "受付中", color: isDark ? "text-green-400 font-black" : "text-green-600 font-black" }
    : { label: "締切", color: isDark ? "text-yellow-400 font-bold" : "text-yellow-600 font-bold" };

  // カードスタイル（5段階色分け + ダークモード）
  const getCardStyle = () => {
    if (!isFinished) {
      return isDark ? "border-slate-700 bg-slate-900" : "border-gray-200 bg-white";
    }
    if (!voted) {
      return isDark ? "border-slate-700 bg-slate-900/50" : "border-gray-200 bg-gray-50/50";
    }
    
    if (hitRank) {
      const style = getHitRankStyle(hitRank, isDark, true);
      return `${style.border} ${style.bg}`;
    }
    
    return isDark ? "border-slate-700 bg-slate-900/50" : "border-gray-200 bg-gray-50/50";
  };

  // 結果バッジ（5段階表示）
  const renderResultBadge = () => {
    if (!isFinished) return null;
    
    if (!voted) {
      return <span className={`text-[10px] font-medium ${isDark ? "text-slate-500" : "text-gray-300"}`}>未投票</span>;
    }

    if (rankConfig) {
      const badgeBg = isDark ? rankConfig.darkBadgeBg : rankConfig.badgeBg;
      const badgeText = isDark ? rankConfig.darkBadgeText : rankConfig.badgeText;
      return (
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${badgeBg} ${badgeText}`}>
          {rankConfig.emoji} {rankConfig.name}
        </span>
      );
    }

    return null;
  };

  const textPrimary = isDark ? "text-slate-100" : "text-gray-900";
  const textSecondary = isDark ? "text-slate-400" : "text-gray-500";

  return (
    <Link href={`/races/${race.id}`}
      className={`rounded-2xl border flex items-center gap-3 px-4 py-3 hover:shadow-md transition-all cursor-pointer relative ${getCardStyle()} ${isDark ? "hover:border-slate-600" : "hover:border-gray-300"}`}>

      {/* 的中マーク */}
      {hitRank === "S" && (
        <span className="absolute -top-2 -right-1 bg-gradient-to-r from-yellow-400 to-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm rotate-[3deg] z-10">
          🎊 パーフェクト!
        </span>
      )}
      {hitRank === "A" && (
        <span className="absolute -top-2 -right-1 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm rotate-[3deg] z-10">
          🎯 的中!
        </span>
      )}

      {voted && !isFinished && (
        <span className={`absolute -top-2 -left-1 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm rotate-[-3deg] z-10 ${isDark ? "bg-amber-500" : "bg-green-600"}`}>
          ✅ 投票済
        </span>
      )}

      {/* ハズレの左ドット */}
      {hitRank === "D" && (
        <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full ${isDark ? "bg-slate-600" : "bg-gray-300"}`} />
      )}

      {grade ? (
        <span className={`${grade.bg} ${grade.text} text-[11px] font-black px-2 py-1 rounded-md min-w-[32px] text-center`}>
          {race.grade}
        </span>
      ) : (
        <span className={`text-[11px] font-bold px-2 py-1 rounded-md min-w-[32px] text-center ${isDark ? "bg-slate-700 text-slate-300" : "bg-gray-200 text-gray-700"}`}>
          {race.race_number ? `${race.race_number}R` : "一般"}
        </span>
      )}

      <div className="flex-1 min-w-0">
        <div className={`text-sm font-bold truncate ${textPrimary}`}>{race.name}</div>
        <div className={`text-[11px] font-medium flex items-center gap-1 flex-wrap ${textSecondary}`}>
          <span>{race.course_name}</span>
          <span className={isDark ? "text-slate-600" : "text-gray-300"}>|</span>
          <span>{race.track_type}{race.distance}m</span>
          {race.head_count != null && race.head_count > 0 && (
            <>
              <span className={isDark ? "text-slate-600" : "text-gray-300"}>|</span>
              <span>{race.head_count}頭</span>
            </>
          )}
          {race.post_time && race.status === "voting_open" && !isDeadlinePassed && (
            <>
              <span className={isDark ? "text-slate-600" : "text-gray-300"}>|</span>
              <RaceCardCountdown postTime={race.post_time} />
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col items-end gap-0.5 shrink-0">
        <span className={`text-[11px] ${statusInfo.color}`}>
          {statusInfo.label}
        </span>
        {renderResultBadge()}
      </div>

      <span className={`text-sm font-bold ${isDark ? "text-slate-500" : "text-gray-400"}`}>›</span>
    </Link>
  );
}
