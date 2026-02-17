"use client";

import Link from "next/link";
import UserAvatar from "@/components/ui/UserAvatar";
import { useTheme } from "@/contexts/ThemeContext";

type Props = {
  user: { id: string };
  profile: any;
  featuredBadge: { id: string; name: string; icon: string } | null;
  rank: { icon: string; name: string; threshold: number };
  nextRank: { icon: string; name: string; threshold: number } | null;
  winRate: number;
  placeRate: number;
  progressToNext: number;
  followingCount: number;
  followerCount: number;
  badgeCount: number;
  recentTx: any[];
  monthlyTotal: number;
};

export default function MyPageClient({
  user, profile, featuredBadge, rank, nextRank, winRate, placeRate,
  progressToNext, followingCount, followerCount, badgeCount, recentTx, monthlyTotal
}: Props) {
  const { isDark } = useTheme();

  const cardClass = isDark ? "bg-slate-900 border-slate-700" : "bg-white border-gray-200";
  const textPrimary = isDark ? "text-slate-100" : "text-gray-900";
  const textSecondary = isDark ? "text-slate-400" : "text-gray-500";
  const borderClass = isDark ? "border-slate-700" : "border-gray-100";

  const heroGradient = isDark
    ? "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)"
    : "linear-gradient(135deg, #16a34a 0%, #15803d 100%)";

  const heroAccent = isDark ? "bg-amber-500/20 text-amber-400" : "bg-white/20 text-white";
  const heroText = isDark ? "text-slate-100" : "text-white";
  const heroTextMuted = isDark ? "text-slate-400" : "text-green-100";

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* プロフィールカード */}
      <div className={`rounded-2xl p-6 ${heroText}`} style={{ background: heroGradient }}>
        <div className="flex items-start gap-4 mb-4">
          <UserAvatar avatarUrl={profile.avatar_url} avatarEmoji={profile.avatar_emoji} size="xl" className="border-2 border-white/30" />
          <div className="flex-1">
            <h1 className="text-xl font-black">{profile.display_name}</h1>
            {profile.user_handle && (
              <div className={`text-xs font-mono ${heroTextMuted}`}>@{profile.user_handle}</div>
            )}
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-sm font-medium ${heroTextMuted}`}>{rank.icon} {rank.name}</span>
              {featuredBadge && <span className="text-sm">{featuredBadge.icon}</span>}
            </div>
            {profile.bio && <p className={`text-sm mt-1 ${heroTextMuted}`}>{profile.bio}</p>}
          </div>
          <Link href="/mypage/edit" className={`${heroAccent} hover:opacity-80 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors`}>
            編集
          </Link>
        </div>

        {/* ランク進捗 */}
        <div className={`${isDark ? "bg-slate-800/50" : "bg-white/10"} rounded-xl p-3 mb-4`}>
          <div className={`flex justify-between text-xs font-medium mb-1.5 ${heroTextMuted}`}>
            <span>{rank.icon} {rank.name}</span>
            {nextRank ? (
              <span>次: {nextRank.icon} {nextRank.name}（あと{nextRank.threshold - profile.cumulative_points}P）</span>
            ) : (
              <span>🏆 最高ランク達成！</span>
            )}
          </div>
          <div className={`h-3 rounded-full overflow-hidden ${isDark ? "bg-slate-700" : "bg-white/20"}`}>
            <div className={`h-full rounded-full transition-all duration-500 ${isDark ? "bg-amber-500" : "bg-white"}`} style={{ width: `${progressToNext}%` }} />
          </div>
        </div>

        {/* ポイント表示 */}
        <Link href="/mypage/points" className="grid grid-cols-2 gap-3 group">
          <div className={`${isDark ? "bg-slate-800/50 group-hover:bg-slate-800" : "bg-white/10 group-hover:bg-white/20"} rounded-xl p-3 text-center transition-colors`}>
            <div className="text-2xl font-black">{profile.cumulative_points.toLocaleString()}</div>
            <div className={`text-xs font-medium ${heroTextMuted}`}>累計ポイント</div>
          </div>
          <div className={`${isDark ? "bg-slate-800/50 group-hover:bg-slate-800" : "bg-white/10 group-hover:bg-white/20"} rounded-xl p-3 text-center transition-colors`}>
            <div className="text-2xl font-black">{monthlyTotal.toLocaleString()}</div>
            <div className={`text-xs font-medium ${heroTextMuted}`}>今月のポイント ›</div>
          </div>
        </Link>
      </div>

      {/* 統計 */}
      <div className="grid grid-cols-2 gap-2">
        <Link href="/mypage/follows?tab=following"><StatCard label="フォロー" value={followingCount} isDark={isDark} /></Link>
        <Link href="/mypage/follows?tab=followers"><StatCard label="フォロワー" value={followerCount} isDark={isDark} /></Link>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <StatCard label="投票数" value={profile.total_votes} isDark={isDark} />
        <StatCard label="1着率" value={`${winRate}%`} color="text-red-500" isDark={isDark} />
        <StatCard label="複勝率" value={`${placeRate}%`} color="text-blue-500" isDark={isDark} />
        <StatCard label="連続的中" value={`🔥${profile.current_streak}`} color="text-orange-500" isDark={isDark} />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <StatCard label="1着的中" value={`${profile.win_hits}回`} color="text-red-500" isDark={isDark} />
        <StatCard label="複勝的中" value={`${profile.place_hits}回`} color="text-blue-500" isDark={isDark} />
        <StatCard label="最長記録" value={`${profile.best_streak}連続`} color="text-orange-500" isDark={isDark} />
      </div>

      {/* メニュー */}
      <div className={`rounded-2xl border overflow-hidden ${cardClass}`}>
        <MenuItem href="/mypage/points" icon="💰" label="ポイント履歴" desc="獲得ポイントの詳細" isDark={isDark} />
        <MenuItem href="/mypage/votes" icon="📋" label="予想履歴" desc="全投票の一覧" isDark={isDark} border />
        <MenuItem href="/mypage/badges" icon="🏅" label="バッジコレクション" desc={`${badgeCount}個獲得`} isDark={isDark} border />
        <MenuItem href="/notifications" icon="🔔" label="通知" desc="お知らせ一覧" isDark={isDark} border />
        <MenuItem href="/settings" icon="⚙️" label="設定" desc="テーマ・通知・アカウント" isDark={isDark} border />
        <MenuItem href="/mypage/diagnosis" icon="🎯" label="予想スタイル診断" desc="あなたの予想傾向を分析" isDark={isDark} border />
        <MenuItem href={`/users/${user.id}`} icon="👤" label="公開プロフィール" desc="他の人から見えるページ" isDark={isDark} border />
      </div>

      {/* 最近のポイント履歴 */}
      {recentTx.length > 0 && (
        <div className={`rounded-2xl border p-5 ${cardClass}`}>
          <div className="flex items-center justify-between mb-3">
            <h2 className={`font-black ${textPrimary}`}>💰 最近のポイント</h2>
            <Link href="/mypage/points" className={`text-xs font-bold hover:underline ${isDark ? "text-amber-400" : "text-green-600"}`}>すべて見る →</Link>
          </div>
          <div className="space-y-2">
            {recentTx.map((tx) => (
              <div key={tx.id} className={`flex items-center justify-between py-2 border-b last:border-0 ${borderClass}`}>
                <div>
                  <span className={`text-sm font-medium ${textPrimary}`}>{tx.description}</span>
                  {(tx.races as any)?.name && <span className={`text-xs ml-2 ${textSecondary}`}>{(tx.races as any).name}</span>}
                </div>
                <span className={`text-sm font-black ${tx.amount > 0 ? "text-green-500" : "text-red-500"}`}>
                  {tx.amount > 0 ? "+" : ""}{tx.amount}P
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color, isDark }: { label: string; value: string | number; color?: string; isDark: boolean }) {
  return (
    <div className={`rounded-xl border p-3 text-center ${isDark ? "bg-slate-900 border-slate-700" : "bg-white border-gray-200"}`}>
      <div className={`text-lg font-black ${color ?? (isDark ? "text-slate-100" : "text-gray-900")}`}>{value}</div>
      <div className={`text-[10px] font-medium ${isDark ? "text-slate-400" : "text-gray-600"}`}>{label}</div>
    </div>
  );
}

function MenuItem({ href, icon, label, desc, isDark, border }: { href: string; icon: string; label: string; desc: string; isDark: boolean; border?: boolean }) {
  return (
    <Link href={href} className={`flex items-center gap-3 px-5 py-4 transition-colors ${border ? (isDark ? "border-t border-slate-700" : "border-t border-gray-100") : ""} ${isDark ? "hover:bg-slate-800" : "hover:bg-gray-50"}`}>
      <span className="text-xl">{icon}</span>
      <div className="flex-1">
        <div className={`text-sm font-bold ${isDark ? "text-slate-100" : "text-gray-900"}`}>{label}</div>
        <div className={`text-xs ${isDark ? "text-slate-400" : "text-gray-500"}`}>{desc}</div>
      </div>
      <span className={isDark ? "text-slate-500" : "text-gray-400"}>›</span>
    </Link>
  );
}
