"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { getRank } from "@/lib/constants/ranks";
import LikeButton from "@/components/social/LikeButton";

type Pick = { pick_type: string; post_number: number; horse_name: string };

type LikedVote = {
  like_id: string;
  liked_at: string;
  vote_id: string;
  user_id: string;
  race_id: string;
  status: string;
  earned_points: number;
  is_perfect: boolean;
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
    race_date: string | null;
  };
  picks: Pick[];
};

const PICK_STYLE: Record<string, { mark: string; bg: string; text: string }> = {
  win: { mark: "◎", bg: "bg-red-100", text: "text-red-700" },
  place: { mark: "○", bg: "bg-blue-100", text: "text-blue-700" },
  back: { mark: "△", bg: "bg-yellow-100", text: "text-yellow-700" },
  danger: { mark: "⚠️", bg: "bg-gray-200", text: "text-gray-700" },
};

export default function LikedVotesList() {
  const [items, setItems] = useState<LikedVote[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchItems = async (cursor?: string) => {
    if (cursor) setLoadingMore(true);
    else setLoading(true);

    try {
      const url = cursor ? `/api/mypage/likes?cursor=${cursor}` : "/api/mypage/likes";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (cursor) {
          setItems((prev) => [...prev, ...data.items]);
        } else {
          setItems(data.items);
        }
        setNextCursor(data.next_cursor);
      }
    } catch {}

    setLoading(false);
    setLoadingMore(false);
  };

  useEffect(() => {
    fetchItems();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-8 text-center text-gray-400 text-sm">
        読み込み中...
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400">
        <div className="text-4xl mb-3">❤️</div>
        <p>まだいいねした予想がありません</p>
        <Link href="/timeline" className="text-sm text-green-600 hover:underline mt-2 inline-block">
          タイムラインを見る →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <VoteCard key={item.like_id} item={item} />
      ))}

      {nextCursor && (
        <div className="text-center">
          <button
            onClick={() => fetchItems(nextCursor)}
            disabled={loadingMore}
            className="text-sm text-green-600 hover:underline disabled:opacity-50"
          >
            {loadingMore ? "読み込み中..." : "もっと見る"}
          </button>
        </div>
      )}
    </div>
  );
}

function VoteCard({ item }: { item: LikedVote }) {
  const rank = getRank(item.user.rank_id);
  const isHit = item.status === "settled_hit";

  const gradeColor = item.race.grade
    ? item.race.grade === "G1" ? "bg-yellow-100 text-yellow-800"
    : item.race.grade === "G2" ? "bg-red-100 text-red-700"
    : item.race.grade === "G3" ? "bg-green-100 text-green-700"
    : "bg-gray-100 text-gray-600" : "";

  // picksを分類
  const nonBackPicks = item.picks.filter(p => p.pick_type !== "back");
  const backPicks = item.picks.filter(p => p.pick_type === "back");

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      {/* ヘッダー: ユーザー情報 */}
      <div className="flex items-center gap-2 mb-2">
        <Link href={`/users/${item.user_id}`} className="flex items-center gap-2 group">
          {item.user.avatar_url ? (
            <Image
              src={item.user.avatar_url}
              alt=""
              width={32}
              height={32}
              className="w-8 h-8 rounded-full"
              unoptimized
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-sm">🏇</div>
          )}
          <span className="text-sm font-bold text-gray-800 group-hover:text-green-600">
            {item.user.display_name}
          </span>
        </Link>
        {rank && <span className="text-xs text-gray-400">{rank.icon}</span>}
        <span className="text-xs text-gray-300 ml-auto">
          {new Date(item.liked_at).toLocaleDateString("ja-JP")} にいいね
        </span>
      </div>

      {/* レース情報 */}
      <Link href={`/races/${item.race_id}`} className="block mb-2 group">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-400">
            {item.status === "pending" ? "🗳" : isHit ? "🎯" : "📊"}
          </span>
          {item.race.grade && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${gradeColor}`}>
              {item.race.grade}
            </span>
          )}
          <span className="text-sm font-bold text-gray-800 group-hover:text-green-600">
            {item.race.name}
          </span>
        </div>
        <div className="text-[10px] text-gray-400 ml-4">
          {item.race.race_date} {item.race.course_name}
          {item.race.race_number ? ` ${item.race.race_number}R` : ""}
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

      {/* 結果とアクション */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {item.status !== "pending" && (
            <>
              {isHit && item.earned_points > 0 && (
                <span className="text-xs font-bold text-green-600">+{item.earned_points}P</span>
              )}
              {item.is_perfect && <span className="text-xs">💎</span>}
              {!isHit && <span className="text-xs text-gray-400">ハズレ</span>}
            </>
          )}
          {item.status === "pending" && (
            <span className="text-xs text-yellow-600">結果待ち</span>
          )}
        </div>
        <LikeButton voteId={item.vote_id} initialCount={item.like_count} initialLiked={true} />
      </div>
    </div>
  );
}
