"use client";

import { useTheme } from "@/contexts/ThemeContext";
import TimelineFeed from "@/components/social/TimelineFeed";

type Props = {
  followingCount: number;
};

export default function TimelineClient({ followingCount }: Props) {
  const { isDark } = useTheme();

  const textPrimary = isDark ? "text-slate-100" : "text-gray-800";
  const textMuted = isDark ? "text-slate-400" : "text-gray-400";
  const tipBg = isDark ? "bg-blue-500/10 border-blue-500/30 text-blue-400" : "bg-blue-50 border-blue-200 text-blue-700";

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className={`text-xl font-black ${textPrimary}`}>📰 タイムライン</h1>
        <span className={`text-xs ${textMuted}`}>
          {followingCount}人をフォロー中
        </span>
      </div>

      {followingCount === 0 && (
        <div className={`border rounded-xl p-4 text-sm ${tipBg}`}>
          💡 他のユーザーをフォローすると、ここに投票結果やコメントが表示されます。
          レースの掲示板で気になるユーザーを見つけたら、プロフィールからフォローしてみましょう！
        </div>
      )}

      <TimelineFeed />
    </div>
  );
}
