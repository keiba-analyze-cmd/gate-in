"use client";

import { useTheme } from "@/contexts/ThemeContext";
import RankingTabs from "@/components/rankings/RankingTabs";

type Props = {
  currentUserId: string;
};

export default function RankingsClient({ currentUserId }: Props) {
  const { isDark } = useTheme();

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h1 className={`text-xl font-black ${isDark ? "text-slate-100" : "text-gray-800"}`}>🏆 ランキング</h1>
      <RankingTabs currentUserId={currentUserId} />
    </div>
  );
}
