"use client";

import Link from "next/link";
import UserAvatar from "@/components/ui/UserAvatar";
import { useTheme } from "@/contexts/ThemeContext";
import FollowButton from "@/components/social/FollowButton";
import BlockButton from "@/components/social/BlockButton";
import UserActivityFeed from "@/components/social/UserActivityFeed";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import RatingBlock from "@/components/rating/RatingBlock";

type Rank = { id: string; name: string; icon: string; threshold: number };

type Props = {
  profile: any;
  rank: Rank;
  isVerified: boolean;
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
  followingCount, followerCount, userBadges, winRate, placeRate, progressToNext, userId, isVerified
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
      <Link href="/rankings" className={`text-sm ${textMuted} ${isDark ? "hover:text-amber-400" : "hover:text-green-600"}`}>
        ← ユーザー検索
      </Link>

      {/* プロフィールカード */}
      <div className={`rounded-2xl border p-5 ${cardBg}`}>
        {/* ヘッダー：アバター + 名前 + ボタン */}
        <div className="flex items-center gap-3 mb-4">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-14 h-14 rounded-full" />
          ) : (
            <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl ${avatarBg}`}>🏇</div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className={`text-lg font-black truncate flex items-center gap-1 ${textPrimary}`}>
              {profile.display_name}
              {isVerified && <VerifiedBadge size="md" />}
            </h1>
            {profile.user_handle && (
              <div className="text-xs font-mono text-green-200">@{profile.user_handle}</div>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs font-medium ${textSecondary}`}>{rank.icon} {rank.name}</span>
              <span className={`text-xs font-black ${accentColor}`}>{profile.cumulative_points}P</span>
              {profile.featured_badge && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? "bg-slate-700" : "bg-gray-100"}`} title={profile.featured_badge.name}>
                  {profile.featured_badge.icon} {profile.featured_badge.name}
                </span>
              )}
            </div>
          </div>
          {!isOwnProfile && (
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <FollowButton targetUserId={userId} initialFollowing={isFollowing} />
              <BlockButton targetUserId={userId} initialBlocked={isBlocked} />
            </div>
          )}
        </div>

        {/* 実力レート */}
        <div className="mb-4">
          <RatingBlock userId={userId} />
        </div>

        {/* 自己紹介 */}
        {profile.bio && (
          <p className={`text-sm mb-4 ${textSecondary}`}>{profile.bio}</p>
        )}

        {/* ランク進捗 */}
        {nextRank && (
          <div className="mb-4">
            <div className="flex justify-between text-xs mb-1">
              <span className={`font-bold ${textSecondary}`}>{rank.name}</span>
              <span className={textMuted}>{nextRank.name}まであと{nextRank.threshold - profile.cumulative_points}P</span>
            </div>
            <div className={`h-2 rounded-full overflow-hidden ${progressBg}`}>
              <div className={`h-full rounded-full transition-all ${progressFill}`} style={{ width: `${Math.min(progressToNext, 100)}%` }} />
            </div>
          </div>
        )}

        {/* 統計：フォロー・フォロワー・投票数を1行に */}
        <div className="grid grid-cols-6 gap-2 mb-3">
          <Link href={`/users/${userId}/follows?tab=following`} className={`col-span-2 rounded-xl p-2.5 text-center border transition-colors ${statBg} ${linkHover}`}>
            <div className={`text-lg font-black ${textPrimary}`}>{followingCount}</div>
            <div className={`text-[10px] ${textMuted}`}>フォロー</div>
          </Link>
          <Link href={`/users/${userId}/follows?tab=followers`} className={`col-span-2 rounded-xl p-2.5 text-center border transition-colors ${statBg} ${linkHover}`}>
            <div className={`text-lg font-black ${textPrimary}`}>{followerCount}</div>
            <div className={`text-[10px] ${textMuted}`}>フォロワー</div>
          </Link>
          <div className={`col-span-2 rounded-xl p-2.5 text-center border ${statBg}`}>
            <div className={`text-lg font-black ${textPrimary}`}>{profile.total_votes}</div>
            <div className={`text-[10px] ${textMuted}`}>投票数</div>
          </div>
        </div>

        {/* 統計：成績を1行に */}
        <div className="grid grid-cols-3 gap-2">
          <div className={`rounded-xl p-2.5 text-center border ${statBg}`}>
            <div className="text-lg font-black text-red-500">{winRate}%</div>
            <div className={`text-[10px] ${textMuted}`}>1着率</div>
          </div>
          <div className={`rounded-xl p-2.5 text-center border ${statBg}`}>
            <div className="text-lg font-black text-blue-500">{placeRate}%</div>
            <div className={`text-[10px] ${textMuted}`}>複勝率</div>
          </div>
          <div className={`rounded-xl p-2.5 text-center border ${statBg}`}>
            <div className="text-lg font-black text-orange-500">🔥{profile.best_streak}</div>
            <div className={`text-[10px] ${textMuted}`}>最長連続</div>
          </div>
        </div>
      </div>

      {/* 獲得バッジ */}
      {userBadges.length > 0 && (
        <div className={`rounded-2xl border p-5 ${cardBg}`}>
          <h2 className={`font-bold text-sm mb-3 ${textPrimary}`}>🏅 獲得バッジ</h2>
          <div className="flex flex-wrap gap-2">
            {userBadges.map((ub) => (
              <div
                key={ub.badge_id}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 border ${badgeBg}`}
                title={(ub.badges as any)?.description}
              >
                <span>{(ub.badges as any)?.icon}</span>
                <span className={`text-xs font-bold ${textSecondary}`}>{(ub.badges as any)?.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* アクティビティ */}
      <UserActivityFeed userId={userId} />
    </div>
  );
}
