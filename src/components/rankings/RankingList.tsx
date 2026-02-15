"use client";

import Link from "next/link";
import Image from "next/image";
import { getRank } from "@/lib/constants/ranks";
import { useTheme } from "@/contexts/ThemeContext";

type RankingUser = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  rank_id: string;
  points?: number;
  monthly_points?: number;
  cumulative_points?: number;
  win_hits?: number;
  total_votes?: number;
};

type Props = {
  rankings: RankingUser[];
  currentUserId: string;
  type: string;
};

export default function RankingList({ rankings, currentUserId, type }: Props) {
  const { isDark } = useTheme();

  const cardBg = isDark ? "bg-slate-900 border-slate-700" : "bg-white border-gray-100";
  const textPrimary = isDark ? "text-slate-100" : "text-gray-900";
  const textSecondary = isDark ? "text-slate-400" : "text-gray-500";
  const hoverBg = isDark ? "hover:bg-slate-800" : "hover:bg-gray-50";
  const borderColor = isDark ? "border-slate-700" : "border-gray-50";
  const highlightBg = isDark ? "bg-amber-500/10 border-amber-500/30" : "bg-green-50 border-green-200";

  const getValue = (user: RankingUser) => {
    if (type === "monthly") return user.monthly_points ?? user.points ?? 0;
    if (type === "cumulative") return user.cumulative_points ?? user.points ?? 0;
    if (type === "hit_rate") return user.win_hits ?? 0;
    return user.points ?? 0;
  };

  const getLabel = (user: RankingUser) => {
    if (type === "hit_rate") {
      const rate = user.total_votes ? Math.round((user.win_hits! / user.total_votes) * 100) : 0;
      return `${user.win_hits}回 (${rate}%)`;
    }
    return `${getValue(user).toLocaleString()}P`;
  };

  const getMedalEmoji = (index: number) => {
    if (index === 0) return "🥇";
    if (index === 1) return "🥈";
    if (index === 2) return "🥉";
    return null;
  };

  return (
    <div className={`rounded-2xl border overflow-hidden ${cardBg}`}>
      {rankings.map((user, index) => {
        const rank = getRank(user.rank_id);
        const isMe = user.user_id === currentUserId;
        const medal = getMedalEmoji(index);

        return (
          <Link
            key={`${user.user_id}-${index}`}
            href={`/users/${user.user_id}`}
            className={`flex items-center gap-3 px-4 py-3 border-b last:border-0 transition-colors ${borderColor} ${hoverBg} ${isMe ? highlightBg : ""}`}
          >
            <div className={`w-8 text-center font-black ${index < 3 ? "text-lg" : `text-sm ${textSecondary}`}`}>
              {medal ?? index + 1}
            </div>

            {user.avatar_url ? (
              <Image src={user.avatar_url} alt="" width={36} height={36} className="w-9 h-9 rounded-full" unoptimized />
            ) : (
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm ${isDark ? "bg-slate-700" : "bg-gray-100"}`}>
                {rank.icon}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className={`text-sm font-bold truncate ${textPrimary}`}>
                {user.display_name}
                {isMe && <span className={`ml-1 text-xs ${isDark ? "text-amber-400" : "text-green-600"}`}>👈 あなた</span>}
              </div>
              <div className={`text-xs ${textSecondary}`}>{rank.icon} {rank.name}</div>
            </div>

            <div className={`text-sm font-black ${isDark ? "text-amber-400" : "text-green-600"}`}>
              {getLabel(user)}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
