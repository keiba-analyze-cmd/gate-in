"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useTheme } from "@/contexts/ThemeContext";

type Race = {
  id: string;
  name: string;
  course_name: string;
  race_number: number | null;
  grade: string | null;
  distance: number | null;
  track_type: string | null;
  head_count: number | null;
  post_time: string | null;
  status: string;
};

type Props = {
  venues: { course_name: string; race: Race }[];
};

const VENUE_COLORS: Record<string, string> = {
  東京: "#2563eb",
  中山: "#16a34a",
  京都: "#16a34a",
  阪神: "#d97706",
  新潟: "#9333ea",
  福島: "#ec4899",
  小倉: "#f97316",
  札幌: "#0891b2",
  函館: "#0d9488",
  中京: "#dc2626",
};

export default function NextRaceByVenue({ venues }: Props) {
  const { isDark } = useTheme();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  if (venues.length === 0) return null;

  return (
    <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
      {venues.map(({ course_name, race }) => {
        const color = VENUE_COLORS[course_name] || "#666";
        const postTime = race.post_time ? new Date(race.post_time) : null;
        const timeStr = postTime
          ? postTime.toLocaleTimeString("ja-JP", {
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "Asia/Tokyo",
            })
          : "";
        const deadline = postTime ? new Date(postTime.getTime() + 30 * 1000) : null;
        const isPast = deadline ? now > deadline : false;
        const diffMs = deadline ? deadline.getTime() - now.getTime() : 0;
        const isUrgent = !isPast && diffMs > 0 && diffMs < 15 * 60 * 1000;

        const cardBg = isDark ? "bg-slate-800" : "bg-white";
        const borderStyle = isDark ? "border-slate-700" : "border-gray-200";
        const textPrimary = isDark ? "text-slate-100" : "text-gray-900";
        const textMuted = isDark ? "text-slate-400" : "text-gray-400";

        return (
          <Link
            key={race.id}
            href={`/races/${race.id}`}
            className={`min-w-[156px] rounded-xl border ${borderStyle} ${cardBg} p-3 hover:shadow-md transition-all shrink-0`}
          >
            {/* Venue + time */}
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <div
                  className="w-[6px] h-[6px] rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span
                  className="text-[10px] font-bold"
                  style={{ color }}
                >
                  {course_name}
                </span>
              </div>
              <span className={`text-[9px] ${textMuted}`}>{timeStr}</span>
            </div>

            {/* Race info */}
            <div className={`text-sm font-bold ${textPrimary} mb-0.5 truncate`}>
              {race.race_number && `${race.race_number}R `}
              {race.name}
            </div>
            <div className={`text-[10px] ${textMuted} mb-2`}>
              {race.track_type === "芝" ? "芝" : race.track_type === "ダート" ? "ダ" : race.track_type || ""}
              {race.distance && `${race.distance}m`}
              {race.head_count ? ` ${race.head_count}頭` : ""}
            </div>

            {/* Status */}
            {isPast ? (
              <div className={`text-center text-[10px] font-medium py-1 rounded-md ${
                isDark ? "bg-slate-700 text-slate-500" : "bg-gray-100 text-gray-400"
              }`}>
                締切済
              </div>
            ) : isUrgent ? (
              <div className="text-center text-[10px] font-bold py-1 rounded-md bg-red-50 text-red-600 dark:bg-red-500/20 dark:text-red-400 animate-pulse">
                ⏰ あと{Math.floor(diffMs / 60000)}分
              </div>
            ) : (
              <div className={`text-center text-[10px] font-medium py-1 rounded-md ${
                isDark ? "bg-amber-500/20 text-amber-400" : "bg-green-50 text-green-600"
              }`}>
                受付中
              </div>
            )}

            {/* Grade badge (if grade race) */}
            {race.grade && (
              <div className="mt-1.5 flex justify-center">
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                  race.grade === "G1" ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
                  : race.grade === "G2" ? "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"
                  : "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400"
                }`}>
                  {race.grade}
                </span>
              </div>
            )}
          </Link>
        );
      })}
    </div>
  );
}
