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

const GRADE_COLORS: Record<string, { border: string; borderDark: string; text: string; textDark: string; bg: string; bgDark: string }> = {
  G1: { border: "border-yellow-500", borderDark: "border-yellow-400", text: "text-yellow-700", textDark: "text-yellow-400", bg: "bg-yellow-50", bgDark: "bg-yellow-500/20" },
  G2: { border: "border-red-500", borderDark: "border-red-400", text: "text-red-700", textDark: "text-red-400", bg: "bg-red-50", bgDark: "bg-red-500/20" },
  G3: { border: "border-green-500", borderDark: "border-green-400", text: "text-green-700", textDark: "text-green-400", bg: "bg-green-50", bgDark: "bg-green-500/20" },
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
    <div className={`grid gap-3 ${
      venues.length === 3 ? "grid-cols-3" :
      venues.length === 2 ? "grid-cols-2" : "grid-cols-1"
    }`}>
      {venues.map(({ course_name, race }) => {
        const gradeStyle = race.grade ? GRADE_COLORS[race.grade] : null;
        const borderColor = gradeStyle 
          ? (isDark ? gradeStyle.borderDark : gradeStyle.border)
          : (isDark ? "border-slate-700" : "border-gray-200");
        const cardBg = isDark ? "bg-slate-800" : "bg-white";
        const headerBg = isDark ? "bg-slate-700" : "bg-gray-50";
        const headerBorder = isDark ? "border-slate-600" : "border-gray-100";
        const textPrimary = isDark ? "text-slate-100" : "text-gray-800";
        const textSecondary = isDark ? "text-slate-300" : "text-gray-700";
        const textMuted = isDark ? "text-slate-400" : "text-gray-400";

        const postTime = race.post_time ? new Date(race.post_time) : null;
        const timeStr = postTime
          ? postTime.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tokyo" })
          : "";
        const deadline = postTime ? new Date(postTime.getTime() + 30 * 1000) : null;
        const isPastDeadline = deadline ? now > deadline : false;
        const diffMs = deadline ? deadline.getTime() - now.getTime() : 0;
        const isUrgent = !isPastDeadline && diffMs > 0 && diffMs < 15 * 60 * 1000;

        return (
          <Link key={race.id} href={`/races/${race.id}`}
            className={`block rounded-xl border-2 ${borderColor} ${cardBg} hover:shadow-md transition-all overflow-hidden`}>
            {/* 競馬場ヘッダー */}
            <div className={`${headerBg} px-3 py-1.5 border-b ${headerBorder} flex items-center justify-between`}>
              <span className={`text-xs font-black ${textSecondary}`}>{course_name}</span>
              {race.track_type && (
                <span className={`text-[10px] ${textMuted} font-medium`}>
                  {race.track_type === "芝" ? "🌱" : "🟤"}{race.track_type}
                </span>
              )}
            </div>

            {/* メインコンテンツ */}
            <div className="px-3 py-2.5 text-center">
              {/* グレードバッジ */}
              {race.grade && gradeStyle && (
                <span className={`inline-block text-[10px] font-black px-2 py-0.5 rounded ${isDark ? gradeStyle.bgDark : gradeStyle.bg} ${isDark ? gradeStyle.textDark : gradeStyle.text} mb-1`}>
                  {race.grade}
                </span>
              )}

              {/* R番号 + レース名 */}
              <div className="flex items-center justify-center gap-1.5 mb-0.5">
                <span className={`text-lg font-black ${
                  gradeStyle 
                    ? (isDark ? gradeStyle.textDark : gradeStyle.text)
                    : textPrimary
                }`}>
                  {race.race_number ?? "-"}R
                </span>
              </div>
              <div className={`text-xs font-bold ${textSecondary} truncate mb-1`}>
                {race.name}
              </div>

              {/* 距離・頭数 */}
              <div className={`text-[10px] ${textMuted} mb-2`}>
                {race.track_type}{race.distance && `${race.distance}m`}
                {race.head_count != null && race.head_count > 0 && ` ${race.head_count}頭`}
              </div>

              {/* 発走時刻 or 締切 */}
              {isPastDeadline ? (
                <div className={`inline-block ${isDark ? "bg-slate-700 text-slate-400" : "bg-gray-100 text-gray-500"} text-[11px] font-bold px-3 py-1 rounded-lg`}>
                  締切済
                </div>
              ) : isUrgent ? (
                <div className={`inline-block ${isDark ? "bg-red-500/20 border-red-400 text-red-400" : "bg-red-50 border border-red-200 text-red-600"} text-[11px] font-black px-3 py-1 rounded-lg animate-pulse`}>
                  ⏰ {formatCountdown(diffMs)}
                </div>
              ) : (
                <div className={`inline-block ${isDark ? "bg-blue-500/20 text-blue-400" : "bg-blue-50 text-blue-700"} text-[11px] font-bold px-3 py-1 rounded-lg`}>
                  {timeStr}
                </div>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function formatCountdown(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `あと${min}分${sec < 10 ? "0" + sec : sec}秒`;
}
