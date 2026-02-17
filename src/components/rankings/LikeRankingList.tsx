"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { getRank } from "@/lib/constants/ranks";
import { useTheme } from "@/contexts/ThemeContext";

type VoteItem = {
  vote_id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null; avatar_emoji: string | null;
  rank_id: string;
  like_count: number;
  race_name: string;
  race_id: string;
  course_name: string;
  earned_points: number;
  status: string;
  picks: { pick_type: string; post_number: number; horse_name: string }[];
};

export default function LikeRankingList() {
  const { isDark } = useTheme();
  const [votes, setVotes] = useState<VoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"today" | "week" | "month">("week");

  const cardBg = isDark ? "bg-slate-900 border-slate-700" : "bg-white border-gray-100";
  const textPrimary = isDark ? "text-slate-100" : "text-gray-900";
  const textMuted = isDark ? "text-slate-500" : "text-gray-400";
  const chipActive = isDark ? "bg-amber-500 text-slate-900" : "bg-green-600 text-white";
  const chipInactive = isDark ? "bg-slate-800 text-slate-300 border-slate-700" : "bg-white text-gray-600 border-gray-200";

  useEffect(() => {
    setLoading(true);
    fetch(`/api/rankings/likes?period=${period}`).then(r => r.json()).then(d => { setVotes(d.votes ?? []); setLoading(false); });
  }, [period]);

  const PICK_STYLE: Record<string, { mark: string; bg: string; text: string }> = {
    win: { mark: "◎", bg: isDark ? "bg-red-500/20" : "bg-red-100", text: isDark ? "text-red-400" : "text-red-700" },
    place: { mark: "○", bg: isDark ? "bg-blue-500/20" : "bg-blue-100", text: isDark ? "text-blue-400" : "text-blue-700" },
    back: { mark: "△", bg: isDark ? "bg-yellow-500/20" : "bg-yellow-100", text: isDark ? "text-yellow-400" : "text-yellow-700" },
    danger: { mark: "⚠️", bg: isDark ? "bg-slate-700" : "bg-gray-200", text: isDark ? "text-slate-300" : "text-gray-700" },
  };

  const getMedal = (i: number) => i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;

  if (loading) return <div className={`rounded-2xl border p-8 text-center ${cardBg} ${textMuted}`}>読み込み中...</div>;

  return (
    <div>
      <p className={`text-xs mb-3 ${textMuted}`}>いいねが多い予想ランキング</p>
      <div className="flex gap-2 mb-4">
        {(["today", "week", "month"] as const).map(p => (
          <button key={p} onClick={() => setPeriod(p)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${period === p ? chipActive : chipInactive}`}>
            {p === "today" ? "今日" : p === "week" ? "今週" : "今月"}
          </button>
        ))}
      </div>

      {votes.length === 0 ? (
        <div className={`rounded-2xl border p-8 text-center ${cardBg} ${textMuted}`}>まだデータがありません</div>
      ) : (
        <div className="space-y-3">
          {votes.map((v, i) => {
            const rank = getRank(v.rank_id);
            const medal = getMedal(i);
            const isHit = v.status === "settled_hit";
            return (
              <div key={v.vote_id} className={`rounded-2xl border p-4 ${cardBg}`}>
                <div className="flex items-center gap-3 mb-2">
                  {medal && <span className={`w-8 h-8 rounded-full flex items-center justify-center text-lg ${isDark ? "bg-slate-800" : "bg-gray-100"}`}>{medal}</span>}
                  <Link href={`/users/${v.user_id}`} className="flex items-center gap-2 group">
                    {v.avatar_url ? (
                      <Image src={v.avatar_url} alt="" width={28} height={28} className="w-7 h-7 rounded-full" unoptimized />
                    ) : (
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${isDark ? "bg-slate-700" : "bg-gray-100"}`}>🏇</div>
                    )}
                    <span className={`text-sm font-bold ${textPrimary}`}>{v.display_name}</span>
                  </Link>
                  {rank && <span className={`text-xs ${textMuted}`}>{rank.icon}</span>}
                  {isHit && <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? "bg-green-500/20 text-green-400" : "bg-green-100 text-green-700"}`}>的中</span>}
                  <span className="ml-auto text-lg">❤️ {v.like_count}</span>
                </div>
                <Link href={`/races/${v.race_id}`} className={`block mb-2 ${textPrimary} font-bold hover:underline`}>{v.race_name} <span className={`text-xs font-normal ${textMuted}`}>{v.course_name}</span></Link>
                <div className="flex flex-wrap gap-1.5">
                  {v.picks.filter(p => p.pick_type !== "back").map((pick, j) => {
                    const style = PICK_STYLE[pick.pick_type] ?? PICK_STYLE.win;
                    return <span key={j} className={`${style.bg} ${style.text} text-xs px-2 py-0.5 rounded-full font-medium`}>{style.mark} {pick.post_number} {pick.horse_name}</span>;
                  })}
                  {v.picks.filter(p => p.pick_type === "back").length > 0 && (
                    <span className={`${PICK_STYLE.back.bg} ${PICK_STYLE.back.text} text-xs px-2 py-0.5 rounded-full font-medium`}>
                      △ {v.picks.filter(p => p.pick_type === "back").map(p => p.post_number).join(",")}
                    </span>
                  )}
                </div>
                {v.earned_points > 0 && <div className={`mt-2 text-sm font-bold ${isDark ? "text-green-400" : "text-green-600"}`}>+{v.earned_points}P</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
