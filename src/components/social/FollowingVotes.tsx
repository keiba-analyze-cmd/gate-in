"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { getRank } from "@/lib/constants/ranks";
import LikeButton from "./LikeButton";

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
    avatar_url: string | null;
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
  const [votes, setVotes] = useState<VoteItem[]>([]);
  const [loading, setLoading] = useState(true);

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
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h2 className="text-sm font-black text-gray-900 mb-3">👥 フォロー中の予想</h2>
        <div className="text-center py-6 text-gray-400 text-sm">読み込み中...</div>
      </div>
    );
  }

  if (votes.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h2 className="text-sm font-black text-gray-900 mb-3">👥 フォロー中の予想</h2>
        <div className="text-center py-6 text-gray-400 text-sm">
          <p>フォロー中のユーザーの予想がここに表示されます</p>
          <Link href="/ranking" className="text-green-600 hover:underline mt-2 inline-block">
            ユーザーを探す →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <h2 className="text-sm font-black text-gray-900">👥 フォロー中の予想</h2>
      </div>
      <div className="divide-y divide-gray-100">
        {votes.map((vote) => (
          <VoteCard key={vote.id} vote={vote} />
        ))}
      </div>
      <Link
        href="/timeline"
        className="block text-center py-3 text-xs font-bold text-green-600 hover:bg-gray-50 transition-colors border-t border-gray-100"
      >
        タイムラインで見る →
      </Link>
    </div>
  );
}

function VoteCard({ vote }: { vote: VoteItem }) {
  const rank = getRank(vote.user.rank_id);
  const timeAgo = getTimeAgo(vote.created_at);

  const gradeColor = vote.race.grade
    ? vote.race.grade === "G1" ? "bg-yellow-100 text-yellow-800"
    : vote.race.grade === "G2" ? "bg-red-100 text-red-700"
    : vote.race.grade === "G3" ? "bg-green-100 text-green-700"
    : "bg-gray-100 text-gray-600" : "";

  // picksを分類
  const nonBackPicks = vote.picks.filter(p => p.pick_type !== "back");
  const backPicks = vote.picks.filter(p => p.pick_type === "back");

  const PICK_STYLE: Record<string, { mark: string; bg: string; text: string }> = {
    win: { mark: "◎", bg: "bg-red-100", text: "text-red-700" },
    place: { mark: "○", bg: "bg-blue-100", text: "text-blue-700" },
    danger: { mark: "⚠️", bg: "bg-gray-200", text: "text-gray-700" },
  };

  return (
    <div className="px-4 py-3">
      {/* ヘッダー: ユーザー情報 */}
      <div className="flex items-center gap-2 mb-2">
        <Link href={`/users/${vote.user_id}`} className="flex items-center gap-2 group">
          {vote.user.avatar_url ? (
            <Image
              src={vote.user.avatar_url}
              alt=""
              width={28}
              height={28}
              className="w-7 h-7 rounded-full"
              unoptimized
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center text-xs">🏇</div>
          )}
          <span className="text-xs font-bold text-gray-800 group-hover:text-green-600">
            {vote.user.display_name}
          </span>
        </Link>
        {rank && <span className="text-[10px] text-gray-400">{rank.icon}</span>}
        <span className="text-[10px] text-gray-300 ml-auto">{timeAgo}</span>
      </div>

      {/* レース情報 */}
      <Link href={`/races/${vote.race_id}`} className="block mb-2 group">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-400">🗳</span>
          {vote.race.grade && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${gradeColor}`}>
              {vote.race.grade}
            </span>
          )}
          <span className="text-sm font-bold text-gray-800 group-hover:text-green-600">
            {vote.race.name}
          </span>
        </div>
        <div className="text-[10px] text-gray-400 ml-4">
          {vote.race.course_name}
          {vote.race.race_number ? ` ${vote.race.race_number}R` : ""}
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

      {/* いいねボタン */}
      <div className="flex items-center justify-between">
        <LikeButton voteId={vote.id} initialCount={vote.like_count} />
        <Link
          href={`/races/${vote.race_id}`}
          className="text-[10px] text-gray-400 hover:text-green-600"
        >
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
