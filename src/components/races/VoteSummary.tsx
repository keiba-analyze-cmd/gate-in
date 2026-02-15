"use client";

import { useTheme } from "@/contexts/ThemeContext";

type Props = {
  vote: {
    status: string;
    earned_points: number;
    is_perfect: boolean;
    vote_picks: {
      pick_type: string;
      hit_type: string | null;
      earned_points: number;
      race_entries: { post_number: number; horses: { name: string } | null } | null;
    }[];
  };
  isFinished: boolean;
};

export default function VoteSummary({ vote, isFinished }: Props) {
  const { isDark } = useTheme();

  const cardBg = isDark ? "bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/30" : "bg-gradient-to-br from-green-50 to-emerald-50 border-green-200";
  const textPrimary = isDark ? "text-slate-100" : "text-gray-900";
  const textSecondary = isDark ? "text-slate-400" : "text-gray-600";

  const isHit = vote.status === "settled_hit";
  const picks = vote.vote_picks ?? [];

  const PICK_LABELS: Record<string, { label: string; color: string }> = {
    win: { label: "◎ 1着", color: "text-red-500" },
    place: { label: "○ 複勝", color: "text-blue-500" },
    back: { label: "△ 抑え", color: isDark ? "text-yellow-400" : "text-yellow-600" },
    danger: { label: "⚠️ 危険", color: textSecondary },
  };

  return (
    <div className={`rounded-2xl border p-5 ${cardBg}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className={`font-bold ${textPrimary}`}>📦 あなたの予想</h3>
        {isFinished && (
          <span className={`text-xs font-bold px-2 py-1 rounded-full ${isHit ? (isDark ? "bg-green-500/20 text-green-400" : "bg-green-100 text-green-700") : (isDark ? "bg-slate-700 text-slate-400" : "bg-gray-100 text-gray-500")}`}>
            {isHit ? "🎉 的中！" : "😢 ハズレ"}
          </span>
        )}
      </div>

      <div className="space-y-2">
        {picks.map((pick, i) => {
          const style = PICK_LABELS[pick.pick_type] ?? PICK_LABELS.back;
          const hitPoints = pick.earned_points > 0;
          const pointsText = hitPoints ? `✓ +${pick.earned_points}P` : "×";
          return (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`text-sm font-bold ${style.color}`}>{style.label}</span>
                <span className={textPrimary}>{pick.race_entries?.post_number} {pick.race_entries?.horses?.name ?? "不明"}</span>
              </div>
              {isFinished && (
                <span className={`text-sm font-bold ${hitPoints ? (isDark ? "text-green-400" : "text-green-600") : (isDark ? "bg-red-500/20 text-red-400 px-2 py-0.5 rounded" : "bg-red-100 text-red-500 px-2 py-0.5 rounded")}`}>
                  {pointsText}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {isFinished && (
        <div className={`mt-4 pt-3 border-t flex items-center justify-between ${isDark ? "border-green-500/30" : "border-green-200"}`}>
          <span className={`font-bold ${textPrimary}`}>獲得ポイント</span>
          <span className={`text-xl font-black ${isDark ? "text-green-400" : "text-green-600"}`}>+{vote.earned_points} P</span>
        </div>
      )}
    </div>
  );
}
