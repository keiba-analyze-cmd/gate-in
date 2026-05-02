"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { getRank } from "@/lib/constants/ranks";
import LikeButton from "./LikeButton";
import { useTheme } from "@/contexts/ThemeContext";

type Pick = { pick_type: string; post_number: number; horse_name: string };

type VoteItem = {
  id: string;
  user_id: string;
  race_id: string;
  status: string;
  earned_points: number;
  like_count: number;
  created_at: string;
  comment?: string;
  user: {
    display_name: string;
    avatar_url: string | null;
    avatar_emoji: string | null;
    rank_id: string;
  };
  race: {
    name: string;
    grade: string | null;
    course_name: string;
    race_number: number | null;
    race_date: string;
  };
  picks: Pick[];
};

const PICK_STYLE: Record<string, { mark: string; bgLight: string; bgDark: string; textLight: string; textDark: string }> = {
  win:    { mark: "◎", bgLight: "bg-red-50",    bgDark: "bg-red-500/15",    textLight: "text-red-600",    textDark: "text-red-400" },
  place:  { mark: "○", bgLight: "bg-blue-50",   bgDark: "bg-blue-500/15",   textLight: "text-blue-600",   textDark: "text-blue-400" },
  back:   { mark: "△", bgLight: "bg-yellow-50", bgDark: "bg-yellow-500/15", textLight: "text-yellow-700", textDark: "text-yellow-400" },
  danger: { mark: "⚠️", bgLight: "bg-gray-100",  bgDark: "bg-slate-700",     textLight: "text-gray-600",   textDark: "text-slate-400" },
};

export default function FollowingVotes() {
  const { isDark } = useTheme();
  const [votes, setVotes] = useState<VoteItem[]>([]);
  const [loading, setLoading] = useState(true);

  const textPrimary = isDark ? "text-slate-100" : "text-gray-900";
  const textMuted = isDark ? "text-slate-500" : "text-gray-400";
  const borderColor = isDark ? "border-slate-700" : "border-gray-200";

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/timeline/following");
        if (res.ok) {
          const data = await res.json();
          setVotes(data.votes ?? []);
        }
      } catch {}
      setLoading(false);
    })();
  }, []);

  if (loading) return null;

  if (votes.length === 0) {
    return (
      <div className={`rounded-2xl border p-5 ${isDark ? "bg-slate-900 border-slate-700" : "bg-white border-gray-200"}`}>
        <h2 className={`text-sm font-black mb-3 ${textPrimary}`}>フォロー中</h2>
        <div className={`text-center py-4 text-sm ${textMuted}`}>
          <p>フォロー中のユーザーの予想がここに表示されます</p>
          <Link href="/rankings" className={`mt-2 inline-block text-xs font-bold ${isDark ? "text-amber-400" : "text-green-600"} hover:underline`}>
            ユーザーを探す →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-sm font-black ${textPrimary}`}>フォロー中</span>
        <Link href="/timeline" className={`text-xs font-bold ${isDark ? "text-amber-400" : "text-green-600"} hover:underline`}>
          タイムライン →
        </Link>
      </div>
      <div className="space-y-3">
        {votes.slice(0, 5).map((vote) => (
          <VoteCard key={vote.id} vote={vote} isDark={isDark} />
        ))}
      </div>
    </div>
  );
}

function VoteCard({ vote, isDark }: { vote: VoteItem; isDark: boolean }) {
  const rank = getRank(vote.user.rank_id);
  const timeAgo = getTimeAgo(vote.created_at);
  const isHit = vote.status === "settled_hit";
  const isSettled = vote.status.startsWith("settled");

  const textPrimary = isDark ? "text-slate-100" : "text-gray-900";
  const textMuted = isDark ? "text-slate-500" : "text-gray-400";
  const textSecondary = isDark ? "text-slate-400" : "text-gray-500";
  const cardBg = isDark ? "bg-slate-900 border-slate-700" : "bg-white border-gray-200";
  const avatarBg = isDark ? "bg-slate-700" : "bg-green-100";

  const mainPicks = vote.picks.filter((p) => p.pick_type !== "back");
  const backPicks = vote.picks.filter((p) => p.pick_type === "back");

  return (
    <div className={`rounded-xl border p-3 ${cardBg}`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <Link href={`/users/${vote.user_id}`} className="shrink-0">
          {vote.user.avatar_url ? (
            <Image src={vote.user.avatar_url} alt="" width={28} height={28} className="w-7 h-7 rounded-full" unoptimized />
          ) : (
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${avatarBg}`}>
              {vote.user.avatar_emoji || "🏇"}
            </div>
          )}
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <Link href={`/users/${vote.user_id}`} className={`text-xs font-bold ${textPrimary} hover:underline truncate`}>
              {vote.user.display_name}
            </Link>
            {rank && <span className="text-[10px]">{rank.icon}</span>}
            <span className={`text-[10px] ${textMuted}`}>
              {isSettled ? (isHit ? "が的中！" : "が予想") : "が予想"}
            </span>
          </div>
        </div>
        <span className={`text-[9px] ${textMuted} shrink-0`}>{timeAgo}</span>
      </div>

      {/* 的中報告（的中時） */}
      {isHit && (
        <div className={`rounded-lg p-2.5 mb-2 flex items-center ${
          isDark ? "bg-green-500/10" : "bg-green-50"
        }`}>
          <div className="flex-1">
            <span className={`text-xs font-bold ${isDark ? "text-green-400" : "text-green-700"}`}>
              +{vote.earned_points}P 獲得！
            </span>
            <div className={`text-[10px] ${isDark ? "text-green-300/70" : "text-green-600"}`}>
              {vote.race.name}で的中
            </div>
          </div>
          <span className="text-lg">🎉</span>
        </div>
      )}

      {/* Race Info */}
      <Link href={`/races/${vote.race_id}`} className={`text-[10px] mb-1.5 block ${isDark ? "text-slate-400" : "text-gray-500"}`}>
        {vote.race.race_date ? new Date(vote.race.race_date + "T00:00").toLocaleDateString("ja-JP", {month:"numeric",day:"numeric"}) + " " : ""}{vote.race.course_name}{vote.race.race_number ? ` ${vote.race.race_number}R` : ''} — {vote.race.name}
      </Link>

      {/* Picks */}
      <div className="flex flex-wrap gap-1 mb-2">
        {mainPicks.map((pick, i) => {
          const style = PICK_STYLE[pick.pick_type] ?? PICK_STYLE.win;
          return (
            <span
              key={i}
              className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                isDark ? style.bgDark : style.bgLight
              } ${isDark ? style.textDark : style.textLight}`}
            >
              {style.mark} {pick.post_number} {pick.horse_name}
            </span>
          );
        })}
        {backPicks.length > 0 && (
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
            isDark ? "bg-yellow-500/15 text-yellow-400" : "bg-yellow-50 text-yellow-700"
          }`}>
            △ {backPicks.map((p) => p.post_number).join(",")}
          </span>
        )}
      </div>

      {/* Comment */}
      {vote.comment && (
        <div className={`text-xs leading-relaxed mb-2 ${textSecondary}`}>
          {vote.comment}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <LikeButton voteId={vote.id} initialCount={vote.like_count} />
          <Link href={`/races/${vote.race_id}`} className={`text-[10px] ${textMuted} hover:underline`}>
            💬
          </Link>
        </div>
        {!isSettled && (
          <Link
            href={`/races/${vote.race_id}?copy_from=${vote.id}`}
            className={`text-[10px] font-bold px-3 py-1 rounded-full ${
              isDark
                ? "text-amber-400 bg-amber-500/10 hover:bg-amber-500/20"
                : "text-green-600 bg-green-50 hover:bg-green-100"
            } transition-colors`}
          >
            🚀 乗っかる
          </Link>
        )}
      </div>
    </div>
  );
}

function getTimeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "たった今";
  if (diff < 3600) return `${Math.floor(diff / 60)}分前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}時間前`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}日前`;
  return new Date(dateStr).toLocaleDateString("ja-JP", { month: "short", day: "numeric" });
}
