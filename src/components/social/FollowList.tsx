"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getRank } from "@/lib/constants/ranks";
import FollowButton from "./FollowButton";

type FollowUser = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  rank_id: string;
  cumulative_points: number;
  is_following: boolean;
};

type Props = {
  userId: string;
  type: "following" | "followers";
  currentUserId: string;
};

export default function FollowList({ userId, type, currentUserId }: Props) {
  const [users, setUsers] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const fetchUsers = async (loadCursor?: string | null) => {
    const params = new URLSearchParams({
      user_id: userId,
      type,
    });
    if (loadCursor) params.set("cursor", loadCursor);

    const res = await fetch(`/api/follows/list?${params}`);
    if (res.ok) {
      const data = await res.json();
      if (loadCursor) {
        setUsers((prev) => [...prev, ...data.users]);
      } else {
        setUsers(data.users);
      }
      setCursor(data.next_cursor);
      setHasMore(!!data.next_cursor);
    }
    setLoading(false);
  };

  useEffect(() => {
    setLoading(true);
    setUsers([]);
    fetchUsers();
  }, [userId, type]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse flex items-center gap-3 p-3">
            <div className="w-10 h-10 bg-gray-200 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-24" />
              <div className="h-3 bg-gray-100 rounded w-16" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-4xl mb-3">{type === "following" ? "👥" : "🙋"}</p>
        <p className="text-sm text-gray-400">
          {type === "following"
            ? "まだ誰もフォローしていません"
            : "まだフォロワーがいません"}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="divide-y divide-gray-100">
        {users.map((u) => {
          const rank = getRank(u.rank_id);
          const isMe = u.id === currentUserId;
          return (
            <div key={u.id} className="flex items-center gap-3 py-3 px-1">
              <Link href={`/users/${u.id}`} className="shrink-0">
                {u.avatar_url ? (
                  <img src={u.avatar_url} alt="" className="w-10 h-10 rounded-full" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-lg">🏇</div>
                )}
              </Link>
              <Link href={`/users/${u.id}`} className="flex-1 min-w-0 group">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-gray-800 truncate group-hover:text-green-600">
                    {u.display_name ?? "匿名"}
                  </span>
                  {rank && <span className="text-xs">{rank.icon}</span>}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span>{rank?.name ?? "ビギナー"}</span>
                  <span>•</span>
                  <span>{u.cumulative_points?.toLocaleString() ?? 0} P</span>
                </div>
              </Link>
              {!isMe && (
                <FollowButton
                  targetUserId={u.id}
                  initialFollowing={u.is_following}
                />
              )}
            </div>
          );
        })}
      </div>

      {hasMore && (
        <div className="text-center py-4">
          <button
            onClick={() => fetchUsers(cursor)}
            className="text-sm text-green-600 hover:text-green-700 font-medium"
          >
            もっと見る
          </button>
        </div>
      )}
    </div>
  );
}
