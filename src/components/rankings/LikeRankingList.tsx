"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { getRank } from "@/lib/constants/ranks";

type LikedVote = {
  vote_id: string;
  user_id: string;
  race_id: string;
  like_count: number;
  status: string;
  earned_points: number;
  is_perfect: boolean;
  user: {
    display_name: string;
    avatar_url: string | null;
    rank_id: string;
  };
  race: {
    name: string;
    grade: string | null;
    course_name: string;
    race_date: string;
  };
  picks: { pick_type: string; post_number: number; horse_name: string }[];
};

const PICK_STYLE: Record<string, { mark: string; bg: string; text: string }> = {
  win: { mark: "◎", bg: "bg-red-100", text: "text-red-700" },
  place: { mark: "○", bg: "bg-blue-100", text: "text-blue-700" },
  back: { mark: "△", bg: "bg-yellow-100", text: "text-yellow-700" },
  danger: { mark: "⚠️", bg: "bg-gray-200", text: "text-gray-700" },
};

export default function LikeRankingList() {
  const [period, setPeriod] = useState<"today" | "week" | "month">("week");
  const [votes, setVotes] = useState<LikedVote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/rankings/likes?period=${period}`)
      .then((res) => res.json())
      .then((data) => {
        setVotes(data.votes ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [period]);

  return (
    <div>
      {/* 期間フィルター */}
      <div className="flex gap-2 mb-4">
        {[
          { key: "today" as const, label: "今日" },
          { key: "week" as const, label: "今週" },
          { key: "month" as const, label: "今月" },
        ].map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              period === p.key
                ? "bg-orange-500 text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:border-orange-300"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* リスト */}
      {loading ? (
        <div className="bg-white rounded-xl p-8 text-center text-gray-400 text-sm">
          読み込み中...
        </div>
      ) : votes.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center text-gray-400 text-sm">
          この期間にいいねされた予想がありません
        </div>
      ) : (
        <div className="space-y-3">
          {votes.map((vote, index) => (
            <VoteCard key={vote.vote_id} vote={vote} rank={index + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function VoteCard({ vote, rank }: { vote: LikedVote; rank: number }) {
  const userRank = getRank(vote.user.rank_id);
  const isHit = vote.status === "settled_hit";

  const gradeColor = vote.race.grade
    ? vote.race.grade === "G1" ? "bg-yellow-100 text-yellow-800"
    : vote.race.grade === "G2" ? "bg-red-100 text-red-700"
    : vote.race.grade === "G3" ? "bg-green-100 text-green-700"
    : "bg-gray-100 text-gray-600" : "";

  const nonBackPicks = vote.picks.filter(p => p.pick_type !== "back");
  const backPicks = vote.picks.filter(p => p.pick_type === "back");

  const rankBadge = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `${rank}`;
  const rankBg = rank === 1 ? "bg-yellow-100 text-yellow-700" 
    : rank === 2 ? "bg-gray-100 text-gray-600" 
    : rank === 3 ? "bg-orange-100 text-orange-700" 
    : "bg-gray-50 text-gray-500";

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <div className="flex items-start gap-3">
        {/* 順位 */}
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${rankBg}`}>
          {rankBadge}
        </div>

        <div className="flex-1 min-w-0">
          {/* ユーザー情報 */}
          <div className="flex items-center gap-2 mb-2">
            <Link href={`/users/${vote.user_id}`} className="flex items-center gap-2 group">
              {vote.user.avatar_url ? (
                <Image
                  src={vote.user.avatar_url}
                  alt=""
                  width={24}
                  height={24}
                  className="w-6 h-6 rounded-full"
                  unoptimized
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-xs">🏇</div>
              )}
              <span className="text-sm font-bold text-gray-800 group-hover:text-green-600">
                {vote.user.display_name}
              </span>
            </Link>
            {userRank && <span className="text-xs text-gray-400">{userRank.icon}</span>}
            {isHit && <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">的中</span>}
          </div>

          {/* レース情報 */}
          <Link href={`/races/${vote.race_id}`} className="block mb-2 group">
            <div className="flex items-center gap-2 flex-wrap">
              {vote.race.grade && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${gradeColor}`}>
                  {vote.race.grade}
                </span>
              )}
              <span className="text-sm font-bold text-gray-800 group-hover:text-green-600">
                {vote.race.name}
              </span>
              <span className="text-[10px] text-gray-400">{vote.race.course_name}</span>
            </div>
          </Link>

          {/* 予想内容 */}
          <div className="flex flex-wrap gap-1.5 mb-2">
            {nonBackPicks.map((pick, i) => {
              const style = PICK_STYLE[pick.pick_type] ?? PICK_STYLE.win;
              return (
                <span
                  key={i}
                  className={`${style.bg} ${style.text} text-[11px] px-2 py-0.5 rounded-full font-medium`}
                >
                  {style.mark} {pick.post_number} {pick.horse_name}
                </span>
              );
            })}
            {backPicks.length > 0 && (
              <span className="bg-yellow-100 text-yellow-700 text-[11px] px-2 py-0.5 rounded-full font-medium">
                △ {backPicks.map(p => p.post_number).join(",")}
              </span>
            )}
          </div>

          {/* 結果 */}
          <div className="flex items-center gap-2">
            {vote.status !== "pending" && (
              <>
                {isHit && vote.earned_points > 0 && (
                  <span className="text-xs font-bold text-green-600">+{vote.earned_points}P</span>
                )}
                {vote.is_perfect && <span className="text-xs">💎</span>}
              </>
            )}
            {vote.status === "pending" && (
              <span className="text-xs text-yellow-600">結果待ち</span>
            )}
          </div>
        </div>

        {/* いいね数 */}
        <div className="text-right shrink-0">
          <div className="text-pink-500 font-bold text-lg">❤️ {vote.like_count}</div>
        </div>
      </div>
    </div>
  );
}
