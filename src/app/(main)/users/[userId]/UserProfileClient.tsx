"use client";

import Link from "next/link";
import { useTheme } from "@/contexts/ThemeContext";
import FollowButton from "@/components/social/FollowButton";
import BlockButton from "@/components/social/BlockButton";
import UserActivityFeed from "@/components/social/UserActivityFeed";

type Rank = { id: string; name: string; icon: string; threshold: number };

type Props = {
  profile: any;
  rank: Rank;
  nextRank: Rank | null;
  isOwnProfile: boolean;
  isFollowing: boolean;
  isBlocked: boolean;
  followingCount: number;
  followerCount: number;
  userBadges: any[];
  winRate: number;
  placeRate: number;
  progressToNext: number;
  userId: string;
};

export default function UserProfileClient({
  profile, rank, nextRank, isOwnProfile, isFollowing, isBlocked,
  followingCount, followerCount, userBadges, winRate, placeRate, progressToNext, userId
}: Props) {
  const { isDark } = useTheme();

  const cardBg = isDark ? "bg-slate-900 border-slate-700" : "bg-white border-gray-200";
  const textPrimary = isDark ? "text-slate-100" : "text-gray-900";
  const textSecondary = isDark ? "text-slate-400" : "text-gray-600";
  const textMuted = isDark ? "text-slate-500" : "text-gray-500";
  const statBg = isDark ? "bg-slate-800 border-slate-700" : "bg-gray-50 border-gray-100";
  const accentColor = isDark ? "text-amber-400" : "text-green-600";
  const avatarBg = isDark ? "bg-slate-700" : "bg-green-100";
  const progressBg = isDark ? "bg-slate-700" : "bg-gray-200";
  const progressFill = isDark ? "bg-amber-500" : "bg-green-500";
  const badgeBg = isDark ? "bg-slate-800 border-slate-700" : "bg-gray-50 border-gray-100";
  const linkHover = isDark ? "hover:border-amber-500/50" : "hover:border-green-300";

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Link href="/rankings" className={`text-sm ${textMuted} ${isDark ? "hover:text-amber-400" : "hover:text-green-600"}`}>← ユーザー検索</Link>

      <div className={`rounded-2xl border p-6 ${cardBg}`}>
        <div className="flex items-start gap-4 mb-4">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-20 h-20 rounded-full" />
          ) : (
            <div className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl ${avatarBg}`}>🏇</div>
          )}
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <h1 className={`text-xl font-black ${textPrimary}`}>{profile.display_name}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-sm font-medium ${textSecondary}`}>{rank.icon} {rank.name}</span>
                  <span className={`text-sm font-black ${accentColor}`}>{profile.cumulative_points} P</span>
                </div>
              </div>
              {!isOwnProfile && (
                <div className="flex items-center gap-2">
                  <FollowButton targetUserId={userId} initialFollowing={isFollowing} />
                  <BlockButton targetUserId={userId} initialBlocked={isBlocked} />
                </div>
              )}
            </div>
            {profile.bio && <p className={`text-sm mt-2 ${textSecondary}`}>{profile.bio}</p>}
          </div>
        </div>

        {nextRank && (
          <div className="mb-4">
            <div className="flex justify-between text-xs mb-1">
              <span className={`font-bold ${textSecondary}`}>{rank.name}</span>
              <span className={textMuted}>{nextRank.name}まであと{nextRank.threshold - profile.cumulative_points}P</span>
            </div>
            <div className={`h-2.5 rounded-full overflow-hidden ${progressBg}`}>
              <div className={`h-full rounded-full transition-all ${progressFill}`} style={{ width: `${Math.min(progressToNext, 100)}%` }} />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 mb-2">
          <Link href={`/users/${userId}/follows?tab=following`} className={`rounded-xl p-3 text-center border transition-colors ${statBg} ${linkHover}`}>
            <div className={`text-xl font-black ${textPrimary}`}>{followingCount}</div>
            <div className={`text-xs font-medium ${textSecondary}`}>フォロー</div>
          </Link>
          <Link href={`/users/${userId}/follows?tab=followers`} className={`rounded-xl p-3 text-center border transition-colors ${statBg} ${linkHover}`}>
            <div className={`text-xl font-black ${textPrimary}`}>{followerCount}</div>
            <div className={`text-xs font-medium ${textSecondary}`}>フォロワー</div>
          </Link>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <div className={`rounded-xl p-3 text-center border ${statBg}`}>
            <div className={`text-lg font-black ${textPrimary}`}>{profile.total_votes}</div>
            <div className={`text-[10px] font-medium ${textSecondary}`}>投票数</div>
          </div>
          <div className={`rounded-xl p-3 text-center border ${statBg}`}>
            <div className="text-lg font-black text-red-500">{winRate}%</div>
            <div className={`text-[10px] font-medium ${textSecondary}`}>1着率</div>
          </div>
          <div className={`rounded-xl p-3 text-center border ${statBg}`}>
            <div className="text-lg font-black text-blue-500">{placeRate}%</div>
            <div className={`text-[10px] font-medium ${textSecondary}`}>複勝率</div>
          </div>
          <div className={`rounded-xl p-3 text-center border ${statBg}`}>
            <div className="text-lg font-black text-orange-500">🔥{profile.best_streak}</div>
            <div className={`text-[10px] font-medium ${textSecondary}`}>最長連続</div>
          </div>
        </div>
      </div>

      {userBadges.length > 0 && (
        <div className={`rounded-2xl border p-5 ${cardBg}`}>
          <h2 className={`font-black mb-3 ${textPrimary}`}>🏅 獲得バッジ</h2>
          <div className="flex flex-wrap gap-2">
            {userBadges.map((ub) => (
              <div key={ub.badge_id} className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 border ${badgeBg}`} title={(ub.badges as any)?.description}>
                <span>{(ub.badges as any)?.icon}</span>
                <span className={`text-xs font-bold ${textSecondary}`}>{(ub.badges as any)?.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <UserActivityFeed userId={userId} />
    </div>
  );
}
