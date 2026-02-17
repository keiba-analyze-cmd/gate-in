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
  user: {
    display_name: string;
    avatar_url: string | null; avatar_emoji: string | null;
    rank_id: string;
  };
  race: {
    name: string;
    grade: string | null;
  };
  picks: { pick_type: string; post_number: number; horse_name: string }[];
};

export default function PopularVotesSection() {
  const [votes, setVotes] = useState<LikedVote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/rankings/likes?period=week")
      .then((res) => res.json())
      .then((data) => {
        setVotes((data.votes ?? []).slice(0, 3));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-4 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-3"></div>
        <div className="space-y-2">
          <div className="h-12 bg-gray-100 rounded"></div>
          <div className="h-12 bg-gray-100 rounded"></div>
          <div className="h-12 bg-gray-100 rounded"></div>
        </div>
      </div>
    );
  }

  if (votes.length === 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl border border-orange-100 overflow-hidden">
      <div className="px-4 py-3 border-b border-orange-100 flex items-center justify-between">
        <h2 className="text-sm font-bold text-gray-800">🔥 人気の予想</h2>
        <Link href="/rankings" className="text-xs text-orange-600 hover:underline">
          もっと見る →
        </Link>
      </div>
      <div className="divide-y divide-orange-50">
        {votes.map((vote, index) => (
          <VoteRow key={vote.vote_id} vote={vote} rank={index + 1} />
        ))}
      </div>
    </div>
  );
}

function VoteRow({ vote, rank }: { vote: LikedVote; rank: number }) {
  const userRank = getRank(vote.user.rank_id);
  const isHit = vote.status === "settled_hit";
  const badge = rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉";

  const winPick = vote.picks.find(p => p.pick_type === "win");

  return (
    <div className="px-4 py-3 flex items-center gap-3">
      <span className="text-lg">{badge}</span>
      <Link href={`/users/${vote.user_id}`} className="flex items-center gap-2 group min-w-0">
        {vote.user.avatar_url ? (
          <Image
            src={vote.user.avatar_url}
            alt=""
            width={24}
            height={24}
            className="w-6 h-6 rounded-full shrink-0"
            unoptimized
          />
        ) : (
          <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-xs shrink-0">🏇</div>
        )}
        <span className="text-sm font-bold text-gray-800 group-hover:text-green-600 truncate">
          {vote.user.display_name}
        </span>
      </Link>
      <div className="flex-1 min-w-0 text-right">
        <Link href={`/races/${vote.race_id}`} className="text-xs text-gray-600 hover:text-green-600 truncate block">
          {vote.race.grade && <span className="font-bold">{vote.race.grade} </span>}
          {winPick && `◎${winPick.horse_name}`}
        </Link>
      </div>
      {isHit && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded shrink-0">的中</span>}
      <span className="text-pink-500 font-bold text-sm shrink-0">❤️{vote.like_count}</span>
    </div>
  );
}
