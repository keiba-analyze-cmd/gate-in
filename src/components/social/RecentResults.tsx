"use client";

import Link from "next/link";
import { useTheme } from "@/contexts/ThemeContext";

type Race = {
  id: string;
  name: string;
  grade: string | null;
  course_name: string;
  race_date: string;
  status: string;
};

type UserResult = {
  race_id: string;
  status: string;
  earned_points: number;
};

type Props = {
  races: Race[];
  userResults?: Record<string, UserResult>;
};

export default function RecentResults({ races, userResults = {} }: Props) {
  const { isDark } = useTheme();

  if (races.length === 0) return null;

  const textPrimary = isDark ? "text-slate-100" : "text-gray-900";
  const textMuted = isDark ? "text-slate-500" : "text-gray-400";
  const borderColor = isDark ? "border-slate-700" : "border-gray-200";
  const cardBg = isDark ? "bg-slate-900" : "bg-white";

  return (
    <div className={`rounded-xl border overflow-hidden ${cardBg} ${borderColor}`}>
      {races.map((race, i) => {
        const result = userResults[race.id];
        const isHit = result?.status === "settled_hit";
        const isMiss = result?.status === "settled_miss";
        const isLast = i === races.length - 1;

        return (
          <Link
            key={race.id}
            href={`/races/${race.id}`}
            className={`flex items-center gap-2 px-3 py-2.5 transition-colors ${
              !isLast ? `border-b ${isDark ? "border-slate-800" : "border-gray-50"}` : ""
            } ${isDark ? "hover:bg-slate-800/50" : "hover:bg-gray-50"}`}
          >
            {/* Badge */}
            {result ? (
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                isHit
                  ? isDark ? "bg-green-500/20 text-green-400" : "bg-green-50 text-green-600"
                  : isDark ? "bg-red-500/20 text-red-400" : "bg-red-50 text-red-500"
              }`}>
                {isHit ? "的中" : "ハズレ"}
              </span>
            ) : (
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                isDark ? "bg-slate-700 text-slate-500" : "bg-gray-100 text-gray-400"
              }`}>
                未投票
              </span>
            )}

            {/* Grade */}
            {race.grade && (
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                race.grade === "G1" ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
                : race.grade === "G2" ? "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"
                : race.grade === "G3" ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400"
                : "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-400"
              }`}>
                {race.grade}
              </span>
            )}

            {/* Race name */}
            <span className={`text-sm flex-1 truncate ${textPrimary}`}>
              {race.name}
            </span>

            {/* Points */}
            {result && (
              <span className={`text-xs font-bold shrink-0 ${
                isHit
                  ? isDark ? "text-green-400" : "text-green-600"
                  : isDark ? "text-slate-600" : "text-gray-300"
              }`}>
                {isHit ? `+${result.earned_points}P` : "0P"}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
