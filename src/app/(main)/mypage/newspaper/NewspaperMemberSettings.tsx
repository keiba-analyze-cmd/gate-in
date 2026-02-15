"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { getRank } from "@/lib/constants/ranks";

type Member = {
  id: string;
  user_id: string;
  display_order: number;
  display_name: string;
  avatar_url: string | null;
  rank_id: string;
};

type FollowingUser = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  rank_id: string;
};

type Props = {
  initialMembers: Member[];
  followingUsers: FollowingUser[];
};

export default function NewspaperMemberSettings({ initialMembers, followingUsers }: Props) {
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 追加可能なユーザー（フォロー中 - 既にメンバー）
  const memberUserIds = new Set(members.map(m => m.user_id));
  const availableUsers = followingUsers.filter(u => !memberUserIds.has(u.user_id));

  const handleAdd = async (userId: string) => {
    if (members.length >= 5) {
      setError("メンバーは5人までです");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/newspaper-members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ member_user_id: userId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "追加に失敗しました");
      }

      // 追加したユーザー情報を取得
      const user = followingUsers.find(u => u.user_id === userId);
      if (user) {
        const newMember: Member = {
          id: crypto.randomUUID(), // 仮ID（リロードで正しいIDに）
          user_id: userId,
          display_order: members.length,
          display_name: user.display_name,
          avatar_url: user.avatar_url,
          rank_id: user.rank_id,
        };
        setMembers([...members, newMember]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "追加に失敗しました");
    }

    setLoading(false);
  };

  const handleRemove = async (memberId: string) => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/newspaper-members?id=${memberId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("削除に失敗しました");
      }

      setMembers(members.filter(m => m.id !== memberId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "削除に失敗しました");
    }

    setLoading(false);
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;

    const newMembers = [...members];
    [newMembers[index - 1], newMembers[index]] = [newMembers[index], newMembers[index - 1]];
    setMembers(newMembers);

    // 順序を保存
    await fetch("/api/newspaper-members", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ member_ids: newMembers.map(m => m.id) }),
    });
  };

  const handleMoveDown = async (index: number) => {
    if (index === members.length - 1) return;

    const newMembers = [...members];
    [newMembers[index], newMembers[index + 1]] = [newMembers[index + 1], newMembers[index]];
    setMembers(newMembers);

    // 順序を保存
    await fetch("/api/newspaper-members", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ member_ids: newMembers.map(m => m.id) }),
    });
  };

  return (
    <div className="space-y-4">
      {/* 現在のメンバー */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
          <h2 className="text-sm font-bold text-gray-700">
            📰 新聞メンバー（{members.length}/5人）
          </h2>
        </div>

        {members.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            まだメンバーがいません<br />
            下のリストから追加してください
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {members.map((member, index) => {
              const rank = getRank(member.rank_id);
              return (
                <div key={member.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="text-sm font-bold text-gray-400 w-6">{index + 1}</span>
                  <Link href={`/users/${member.user_id}`} className="flex items-center gap-2 flex-1 group">
                    {member.avatar_url ? (
                      <Image
                        src={member.avatar_url}
                        alt=""
                        width={32}
                        height={32}
                        className="w-8 h-8 rounded-full"
                        unoptimized
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-sm">🏇</div>
                    )}
                    <span className="font-bold text-sm text-gray-800 group-hover:text-green-600">
                      {member.display_name}
                    </span>
                    {rank && <span className="text-xs text-gray-400">{rank.icon}</span>}
                  </Link>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0 || loading}
                      className="w-7 h-7 rounded bg-gray-100 text-gray-500 hover:bg-gray-200 disabled:opacity-30 text-xs"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => handleMoveDown(index)}
                      disabled={index === members.length - 1 || loading}
                      className="w-7 h-7 rounded bg-gray-100 text-gray-500 hover:bg-gray-200 disabled:opacity-30 text-xs"
                    >
                      ↓
                    </button>
                    <button
                      onClick={() => handleRemove(member.id)}
                      disabled={loading}
                      className="w-7 h-7 rounded bg-red-50 text-red-500 hover:bg-red-100 disabled:opacity-30 text-xs"
                    >
                      ×
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{error}</div>
      )}

      {/* 追加可能なユーザー */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
          <h2 className="text-sm font-bold text-gray-700">
            👥 フォロー中から追加
          </h2>
        </div>

        {availableUsers.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            {followingUsers.length === 0 ? (
              <>
                フォロー中のユーザーがいません<br />
                <Link href="/users" className="text-green-600 hover:underline">
                  ユーザーを探す →
                </Link>
              </>
            ) : (
              "全員追加済みです"
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {availableUsers.map((user) => {
              const rank = getRank(user.rank_id);
              const canAdd = members.length < 5;
              return (
                <div key={user.user_id} className="flex items-center gap-3 px-4 py-3">
                  <Link href={`/users/${user.user_id}`} className="flex items-center gap-2 flex-1 group">
                    {user.avatar_url ? (
                      <Image
                        src={user.avatar_url}
                        alt=""
                        width={32}
                        height={32}
                        className="w-8 h-8 rounded-full"
                        unoptimized
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-sm">🏇</div>
                    )}
                    <span className="font-bold text-sm text-gray-800 group-hover:text-green-600">
                      {user.display_name}
                    </span>
                    {rank && <span className="text-xs text-gray-400">{rank.icon}</span>}
                  </Link>
                  <button
                    onClick={() => handleAdd(user.user_id)}
                    disabled={!canAdd || loading}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      canAdd
                        ? "bg-green-600 text-white hover:bg-green-700"
                        : "bg-gray-100 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    追加
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
