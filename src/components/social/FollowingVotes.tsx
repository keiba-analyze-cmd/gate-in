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
  user: {
    display_name: string;
    avatar_url: string | null; avatar_emoji: string | null;
    rank_id: string;
  };
  race: {
    name: string;
    grade: string | null;
    course_name: string;
    race_number: number | null;
  };
  picks: Pick[];
};

export default function FollowingVotes() {
  const { isDark } = useTheme();
  const [votes, setVotes] = useState<VoteItem[]>([]);
  const [loading, setLoading] = useState(true);

  const cardBg = isDark ? "bg-slate-900 border-slate-700" : "bg-white border-gray-200";
  const textPrimary = isDark ? "text-slate-100" : "text-gray-900";
  const textMuted = isDark ? "text-slate-400" : "text-gray-400";
  const borderColor = isDark ? "border-slate-700" : "border-gray-100";
  const linkColor = isDark ? "text-amber-400 hover:bg-slate-800" : "text-green-600 hover:bg-gray-50";

  useEffect(() => {
    const fetchVotes = async () => {
      try {
        const res = await fetch("/api/timeline/following");
        if (res.ok) {
          const data = await res.json();
          setVotes(data.votes ?? []);
        }
      } catch {}
      setLoading(false);
    };
    fetchVotes();
  }, []);

  if (loading) {
    return (
      <div className={`rounded-2xl border p-5 ${cardBg}`}>
        <h2 className={`text-sm font-black mb-3 ${textPrimary}`}>👥 フォロー中の予想</h2>
        <div className={`text-center py-6 text-sm ${textMuted}`}>読み込み中...</div>
      </div>
    );
  }

  if (votes.length === 0) {
    return (
      <div className={`rounded-2xl border p-5 ${cardBg}`}>
        <h2 className={`text-sm font-black mb-3 ${textPrimary}`}>👥 フォロー中の予想</h2>
        <div className={`text-center py-6 text-sm ${textMuted}`}>
          <p>フォロー中のユーザーの予想がここに表示されます</p>
          <Link href="/rankings" className={`mt-2 inline-block ${isDark ? "text-amber-400 hover:underline" : "text-green-600 hover:underline"}`}>
            ユーザーを探す →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border overflow-hidden ${cardBg}`}>
      <div className={`px-4 py-3 border-b ${borderColor}`}>
        <h2 className={`text-sm font-black ${textPrimary}`}>👥 フォロー中の予想</h2>
      </div>
      <div className={`divide-y ${isDark ? "divide-slate-700" : "divide-gray-100"}`}>
        {votes.map((vote) => (
          <VoteCard key={vote.id} vote={vote} />
        ))}
      </div>
      <Link
        href="/timeline"
        className={`block text-center py-3 text-xs font-bold transition-colors border-t ${borderColor} ${linkColor}`}
      >
        タイムラインで見る →
      </Link>
    </div>
  );
}

function VoteCard({ vote }: { vote: VoteItem }) {
  const { isDark } = useTheme();
  const rank = getRank(vote.user.rank_id);
  const timeAgo = getTimeAgo(vote.created_at);

  const textPrimary = isDark ? "text-slate-100" : "text-gray-800";
  const textMuted = isDark ? "text-slate-500" : "text-gray-300";
  const textSecondary = isDark ? "text-slate-400" : "text-gray-400";
  const hoverColor = isDark ? "hover:text-amber-400" : "hover:text-green-600";
  const avatarBg = isDark ? "bg-slate-700" : "bg-green-100";

  const gradeColor = vote.race.grade
    ? vote.race.grade === "G1" ? (isDark ? "bg-yellow-500/20 text-yellow-400" : "bg-yellow-100 text-yellow-800")
    : vote.race.grade === "G2" ? (isDark ? "bg-red-500/20 text-red-400" : "bg-red-100 text-red-700")
    : vote.race.grade === "G3" ? (isDark ? "bg-green-500/20 text-green-400" : "bg-green-100 text-green-700")
    : (isDark ? "bg-slate-700 text-slate-300" : "bg-gray-100 text-gray-600") : "";

  const nonBackPicks = vote.picks.filter(p => p.pick_type !== "back");
  const backPicks = vote.picks.filter(p => p.pick_type === "back");

  const PICK_STYLE: Record<string, { mark: string; bg: string; text: string }> = {
    win: { mark: "◎", bg: isDark ? "bg-red-500/20" : "bg-red-100", text: isDark ? "text-red-400" : "text-red-700" },
    place: { mark: "○", bg: isDark ? "bg-blue-500/20" : "bg-blue-100", text: isDark ? "text-blue-400" : "text-blue-700" },
    danger: { mark: "⚠️", bg: isDark ? "bg-slate-700" : "bg-gray-200", text: isDark ? "text-slate-300" : "text-gray-700" },
  };

  const backStyle = { bg: isDark ? "bg-yellow-500/20" : "bg-yellow-100", text: isDark ? "text-yellow-400" : "text-yellow-700" };

  return (
    <div className="px-4 py-3">
      {/* ヘッダー: ユーザー情報 */}
      <div className="flex items-center gap-2 mb-2">
        <Link href={`/users/${vote.user_id}`} className="flex items-center gap-2 group">
          {vote.user.avatar_url ? (
            <Image src={vote.user.avatar_url} alt="" width={28} height={28} className="w-7 h-7 rounded-full" unoptimized />
          ) : (
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${avatarBg}`}>🏇</div>
          )}
          <span className={`text-xs font-bold ${textPrimary} group-${hoverColor}`}>
            {vote.user.display_name}
          </span>
        </Link>
        {rank && <span className={`text-[10px] ${textSecondary}`}>{rank.icon}</span>}
        <span className={`text-[10px] ml-auto ${textMuted}`}>{timeAgo}</span>
      </div>

      {/* レース情報 */}
      <Link href={`/races/${vote.race_id}`} className="block mb-2 group">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] ${textSecondary}`}>🗳</span>
          {vote.race.grade && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${gradeColor}`}>
              {vote.race.grade}
            </span>
          )}
          <span className={`text-sm font-bold ${textPrimary} group-${hoverColor}`}>
            {vote.race.name}
          </span>
        </div>
        <div className={`text-[10px] ml-4 ${textSecondary}`}>
          {vote.race.course_name}
          {vote.race.race_number ? ` ${vote.race.race_number}R` : ""}
        </div>
      </Link>

      {/* 予想内容 */}
      <div className="flex flex-wrap gap-1.5 mb-2">
        {nonBackPicks.map((pick, i) => {
          const style = PICK_STYLE[pick.pick_type] ?? PICK_STYLE.win;
          return (
            <span key={i} className={`${style.bg} ${style.text} text-[11px] px-2 py-0.5 rounded-full font-medium`}>
              {style.mark} {pick.post_number} {pick.horse_name}
            </span>
          );
        })}
        {backPicks.length > 0 && (
          <span className={`${backStyle.bg} ${backStyle.text} text-[11px] px-2 py-0.5 rounded-full font-medium`}>
            △ {backPicks.map(p => p.post_number).join(",")}
          </span>
        )}
      </div>

      {/* いいねボタン */}
      <div className="flex items-center justify-between">
        <LikeButton voteId={vote.id} initialCount={vote.like_count} />
        <Link href={`/races/${vote.race_id}`} className={`text-[10px] ${textSecondary} ${hoverColor}`}>
          レースを見る →
        </Link>
      </div>
    </div>
  );
}

function getTimeAgo(dateStr: string): string {
  const now = new Date();
  const d = new Date(dateStr);
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return "たった今";
  if (diff < 3600) return `${Math.floor(diff / 60)}分前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}時間前`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}日前`;
  return d.toLocaleDateString("ja-JP", { month: "short", day: "numeric" });
}
