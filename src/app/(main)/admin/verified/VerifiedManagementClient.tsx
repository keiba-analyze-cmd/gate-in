"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { getRank } from "@/lib/constants/ranks";
import { useTheme } from "@/contexts/ThemeContext";
import VerifiedBadge from "@/components/ui/VerifiedBadge";

type User = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  rank_id: string;
  is_verified: boolean;
  cumulative_points: number;
};

type Props = {
  initialVerifiedUsers: User[];
};

export default function VerifiedManagementClient({ initialVerifiedUsers }: Props) {
  const { isDark } = useTheme();
  const [verifiedUsers, setVerifiedUsers] = useState<User[]>(initialVerifiedUsers);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const cardBg = isDark ? "bg-slate-900 border-slate-700" : "bg-white border-gray-200";
  const headerBg = isDark ? "bg-slate-800 border-slate-700" : "bg-gray-50 border-gray-100";
  const textPrimary = isDark ? "text-slate-100" : "text-gray-900";
  const textSecondary = isDark ? "text-slate-400" : "text-gray-600";
  const textMuted = isDark ? "text-slate-500" : "text-gray-400";
  const inputBg = isDark ? "bg-slate-800 border-slate-600 text-slate-100" : "bg-white border-gray-300";
  const dividerColor = isDark ? "divide-slate-700" : "divide-gray-100";
  const avatarBg = isDark ? "bg-slate-700" : "bg-green-100";
  const btnPrimary = isDark ? "bg-amber-500 text-slate-900 hover:bg-amber-400" : "bg-green-600 text-white hover:bg-green-700";
  const btnDanger = isDark ? "bg-red-500/20 text-red-400 hover:bg-red-500/30" : "bg-red-50 text-red-600 hover:bg-red-100";
  const linkHover = isDark ? "hover:text-amber-400" : "hover:text-green-600";

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/verified?search=${encodeURIComponent(searchQuery)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.users);
      }
    } catch (err) {
      setMessage({ type: "error", text: "検索に失敗しました" });
    }
    setSearching(false);
  };

  const handleVerify = async (userId: string) => {
    setLoading(userId);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/verified", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      });
      if (res.ok) {
        // 検索結果を更新
        setSearchResults(prev => prev.map(u => u.id === userId ? { ...u, is_verified: true } : u));
        // 認証済みリストに追加
        const user = searchResults.find(u => u.id === userId);
        if (user) {
          setVerifiedUsers(prev => [...prev, { ...user, is_verified: true }].sort((a, b) => a.display_name.localeCompare(b.display_name)));
        }
        setMessage({ type: "success", text: "認証バッジを付与しました" });
      } else {
        throw new Error();
      }
    } catch {
      setMessage({ type: "error", text: "付与に失敗しました" });
    }
    setLoading(null);
  };

  const handleUnverify = async (userId: string) => {
    if (!confirm("認証バッジを取り消しますか？")) return;
    setLoading(userId);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/verified?user_id=${userId}`, { method: "DELETE" });
      if (res.ok) {
        setVerifiedUsers(prev => prev.filter(u => u.id !== userId));
        setSearchResults(prev => prev.map(u => u.id === userId ? { ...u, is_verified: false } : u));
        setMessage({ type: "success", text: "認証バッジを取り消しました" });
      } else {
        throw new Error();
      }
    } catch {
      setMessage({ type: "error", text: "取り消しに失敗しました" });
    }
    setLoading(null);
  };

  const UserRow = ({ user, showVerifyButton }: { user: User; showVerifyButton: boolean }) => {
    const rank = getRank(user.rank_id);
    return (
      <div className="flex items-center gap-3 px-4 py-3">
        <Link href={`/users/${user.id}`} className="flex items-center gap-2 flex-1 group">
          {user.avatar_url ? (
            <Image src={user.avatar_url} alt="" width={40} height={40} className="w-10 h-10 rounded-full" unoptimized />
          ) : (
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${avatarBg}`}>🏇</div>
          )}
          <div>
            <div className={`font-bold text-sm flex items-center gap-1 ${textPrimary} group-${linkHover}`}>
              {user.display_name}
              {user.is_verified && <VerifiedBadge size="sm" />}
            </div>
            <div className={`text-xs ${textMuted}`}>
              {rank?.icon} {rank?.name} • {user.cumulative_points.toLocaleString()}P
            </div>
          </div>
        </Link>
        {showVerifyButton ? (
          user.is_verified ? (
            <button
              onClick={() => handleUnverify(user.id)}
              disabled={loading === user.id}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors disabled:opacity-50 ${btnDanger}`}
            >
              {loading === user.id ? "..." : "取り消し"}
            </button>
          ) : (
            <button
              onClick={() => handleVerify(user.id)}
              disabled={loading === user.id}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors disabled:opacity-50 ${btnPrimary}`}
            >
              {loading === user.id ? "..." : "認証付与"}
            </button>
          )
        ) : (
          <button
            onClick={() => handleUnverify(user.id)}
            disabled={loading === user.id}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors disabled:opacity-50 ${btnDanger}`}
          >
            {loading === user.id ? "..." : "取り消し"}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className={`text-sm ${textMuted}`}>
        <Link href="/admin" className={linkHover}>管理画面</Link>
        <span className="mx-2">›</span>
        <span className={textSecondary}>認証バッジ管理</span>
      </div>

      <h1 className={`text-xl font-bold ${textPrimary}`}>✅ 認証バッジ管理</h1>

      {/* メッセージ */}
      {message && (
        <div className={`p-3 rounded-lg text-sm ${message.type === "success" ? (isDark ? "bg-green-500/10 text-green-400" : "bg-green-50 text-green-700") : (isDark ? "bg-red-500/10 text-red-400" : "bg-red-50 text-red-700")}`}>
          {message.text}
        </div>
      )}

      {/* ユーザー検索 */}
      <div className={`rounded-2xl border overflow-hidden ${cardBg}`}>
        <div className={`px-4 py-3 border-b ${headerBg}`}>
          <h2 className={`text-sm font-bold ${textSecondary}`}>🔍 ユーザー検索</h2>
        </div>
        <div className="p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="ユーザー名で検索..."
              className={`flex-1 px-4 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 ${inputBg} ${isDark ? "focus:ring-amber-500" : "focus:ring-green-500"}`}
            />
            <button
              onClick={handleSearch}
              disabled={searching || !searchQuery.trim()}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors disabled:opacity-50 ${btnPrimary}`}
            >
              {searching ? "..." : "検索"}
            </button>
          </div>
        </div>

        {/* 検索結果 */}
        {searchResults.length > 0 && (
          <div className={`border-t divide-y ${dividerColor}`}>
            {searchResults.map(user => (
              <UserRow key={user.id} user={user} showVerifyButton={true} />
            ))}
          </div>
        )}
      </div>

      {/* 認証済みユーザー一覧 */}
      <div className={`rounded-2xl border overflow-hidden ${cardBg}`}>
        <div className={`px-4 py-3 border-b ${headerBg}`}>
          <h2 className={`text-sm font-bold ${textSecondary}`}>
            ✅ 認証済みユーザー（{verifiedUsers.length}人）
          </h2>
        </div>
        {verifiedUsers.length === 0 ? (
          <div className={`p-8 text-center text-sm ${textMuted}`}>
            認証済みユーザーがいません
          </div>
        ) : (
          <div className={`divide-y ${dividerColor}`}>
            {verifiedUsers.map(user => (
              <UserRow key={user.id} user={user} showVerifyButton={false} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
