"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { getRank } from "@/lib/constants/ranks";
import { useTheme } from "@/contexts/ThemeContext";

type Member = {
  id: string;
  user_id: string;
  display_order: number;
  display_name: string;
  avatar_url: string | null; avatar_emoji: string | null;
  rank_id: string;
};

type FollowingUser = {
  user_id: string;
  display_name: string;
  avatar_url: string | null; avatar_emoji: string | null;
  rank_id: string;
};

type Props = {
  initialMembers: Member[];
  followingUsers: FollowingUser[];
};

export default function NewspaperMemberSettings({ initialMembers, followingUsers }: Props) {
  const { isDark } = useTheme();
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const cardBg = isDark ? "bg-slate-900 border-slate-700" : "bg-white border-gray-200";
  const headerBg = isDark ? "bg-slate-800 border-slate-700" : "bg-gray-50 border-gray-100";
  const textPrimary = isDark ? "text-slate-100" : "text-gray-800";
  const textSecondary = isDark ? "text-slate-400" : "text-gray-700";
  const textMuted = isDark ? "text-slate-500" : "text-gray-400";
  const dividerColor = isDark ? "divide-slate-700" : "divide-gray-100";
  const avatarBg = isDark ? "bg-slate-700" : "bg-green-100";
  const btnBg = isDark ? "bg-slate-700 text-slate-300 hover:bg-slate-600" : "bg-gray-100 text-gray-500 hover:bg-gray-200";
  const btnPrimary = isDark ? "bg-amber-500 text-slate-900 hover:bg-amber-400" : "bg-green-600 text-white hover:bg-green-700";
  const linkColor = isDark ? "hover:text-amber-400" : "hover:text-green-600";
  const errorBg = isDark ? "bg-red-500/10 text-red-400" : "bg-red-50 text-red-600";

  const memberUserIds = new Set(members.map(m => m.user_id));
  const availableUsers = followingUsers.filter(u => !memberUserIds.has(u.user_id));

  const handleAdd = async (userId: string) => {
    if (members.length >= 5) { setError("メンバーは5人までです"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/newspaper-members", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ member_user_id: userId }),
      });
      if (!res.ok) { const data = await res.json(); throw new Error(data.error || "追加に失敗しました"); }
      const user = followingUsers.find(u => u.user_id === userId);
      if (user) {
        setMembers([...members, { id: crypto.randomUUID(), user_id: userId, display_order: members.length, display_name: user.display_name, avatar_url: user.avatar_url, avatar_emoji: user.avatar_emoji, rank_id: user.rank_id }]);
      }
    } catch (err) { setError(err instanceof Error ? err.message : "追加に失敗しました"); }
    setLoading(false);
  };

  const handleRemove = async (memberId: string) => {
    setLoading(true); setError("");
    try {
      const res = await fetch(`/api/newspaper-members?id=${memberId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("削除に失敗しました");
      setMembers(members.filter(m => m.id !== memberId));
    } catch (err) { setError(err instanceof Error ? err.message : "削除に失敗しました"); }
    setLoading(false);
  };

  const handleMove = async (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === members.length - 1) return;
    const newMembers = [...members];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    [newMembers[index], newMembers[swapIndex]] = [newMembers[swapIndex], newMembers[index]];
    setMembers(newMembers);
    await fetch("/api/newspaper-members", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ member_ids: newMembers.map(m => m.id) }) });
  };

  return (
    <div className="space-y-4">
      <div className={`rounded-2xl border overflow-hidden ${cardBg}`}>
        <div className={`px-4 py-3 border-b ${headerBg}`}>
          <h2 className={`text-sm font-bold ${textSecondary}`}>📰 新聞メンバー（{members.length}/5人）</h2>
        </div>
        {members.length === 0 ? (
          <div className={`p-8 text-center text-sm ${textMuted}`}>まだメンバーがいません<br />下のリストから追加してください</div>
        ) : (
          <div className={`divide-y ${dividerColor}`}>
            {members.map((member, index) => {
              const rank = getRank(member.rank_id);
              return (
                <div key={member.id} className="flex items-center gap-3 px-4 py-3">
                  <span className={`text-sm font-bold w-6 ${textMuted}`}>{index + 1}</span>
                  <Link href={`/users/${member.user_id}`} className="flex items-center gap-2 flex-1 group">
                    {member.avatar_url ? (
                      <Image src={member.avatar_url} alt="" width={32} height={32} className="w-8 h-8 rounded-full" unoptimized />
                    ) : (
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${avatarBg}`}>🏇</div>
                    )}
                    <span className={`font-bold text-sm ${textPrimary} group-${linkColor}`}>{member.display_name}</span>
                    {rank && <span className={`text-xs ${textMuted}`}>{rank.icon}</span>}
                  </Link>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleMove(index, "up")} disabled={index === 0 || loading} className={`w-7 h-7 rounded text-xs disabled:opacity-30 ${btnBg}`}>↑</button>
                    <button onClick={() => handleMove(index, "down")} disabled={index === members.length - 1 || loading} className={`w-7 h-7 rounded text-xs disabled:opacity-30 ${btnBg}`}>↓</button>
                    <button onClick={() => handleRemove(member.id)} disabled={loading} className={`w-7 h-7 rounded text-xs disabled:opacity-30 ${isDark ? "bg-red-500/20 text-red-400 hover:bg-red-500/30" : "bg-red-50 text-red-500 hover:bg-red-100"}`}>×</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {error && <div className={`text-sm p-3 rounded-lg ${errorBg}`}>{error}</div>}

      <div className={`rounded-2xl border overflow-hidden ${cardBg}`}>
        <div className={`px-4 py-3 border-b ${headerBg}`}>
          <h2 className={`text-sm font-bold ${textSecondary}`}>👥 フォロー中から追加</h2>
        </div>
        {availableUsers.length === 0 ? (
          <div className={`p-8 text-center text-sm ${textMuted}`}>
            {followingUsers.length === 0 ? (<>フォロー中のユーザーがいません<br /><Link href="/rankings" className={isDark ? "text-amber-400" : "text-green-600"}>ユーザーを探す →</Link></>) : "全員追加済みです"}
          </div>
        ) : (
          <div className={`divide-y ${dividerColor}`}>
            {availableUsers.map((user) => {
              const rank = getRank(user.rank_id);
              const canAdd = members.length < 5;
              return (
                <div key={user.user_id} className="flex items-center gap-3 px-4 py-3">
                  <Link href={`/users/${user.user_id}`} className="flex items-center gap-2 flex-1 group">
                    {user.avatar_url ? (
                      <Image src={user.avatar_url} alt="" width={32} height={32} className="w-8 h-8 rounded-full" unoptimized />
                    ) : (
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${avatarBg}`}>🏇</div>
                    )}
                    <span className={`font-bold text-sm ${textPrimary} group-${linkColor}`}>{user.display_name}</span>
                    {rank && <span className={`text-xs ${textMuted}`}>{rank.icon}</span>}
                  </Link>
                  <button onClick={() => handleAdd(user.user_id)} disabled={!canAdd || loading}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${canAdd ? btnPrimary : `${isDark ? "bg-slate-700 text-slate-500" : "bg-gray-100 text-gray-400"} cursor-not-allowed`}`}>
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
