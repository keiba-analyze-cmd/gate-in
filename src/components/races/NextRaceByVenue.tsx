"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

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

const GRADE_COLORS: Record<string, { border: string; text: string; bg: string }> = {
  G1: { border: "border-yellow-500", text: "text-yellow-700", bg: "bg-yellow-50" },
  G2: { border: "border-red-500", text: "text-red-700", bg: "bg-red-50" },
  G3: { border: "border-green-500", text: "text-green-700", bg: "bg-green-50" },
};

export default function NextRaceByVenue({ venues }: Props) {
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
        const borderColor = gradeStyle?.border ?? "border-gray-200";
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
            className={`block rounded-xl border-2 ${borderColor} bg-white hover:shadow-md transition-all overflow-hidden`}>
            {/* 競馬場ヘッダー */}
            <div className="bg-gray-50 px-3 py-1.5 border-b border-gray-100 flex items-center justify-between">
              <span className="text-xs font-black text-gray-700">{course_name}</span>
              {race.track_type && (
                <span className="text-[10px] text-gray-400 font-medium">
                  {race.track_type === "芝" ? "🌱" : "🟤"}{race.track_type}
                </span>
              )}
            </div>

            {/* メインコンテンツ */}
            <div className="px-3 py-2.5 text-center">
              {/* グレードバッジ */}
              {race.grade && gradeStyle && (
                <span className={`inline-block text-[10px] font-black px-2 py-0.5 rounded ${gradeStyle.bg} ${gradeStyle.text} mb-1`}>
                  {race.grade}
                </span>
              )}

              {/* R番号 + レース名 */}
              <div className="flex items-center justify-center gap-1.5 mb-0.5">
                <span className={`text-lg font-black ${
                  gradeStyle ? gradeStyle.text : "text-gray-800"
                }`}>
                  {race.race_number ?? "-"}R
                </span>
              </div>
              <div className="text-xs font-bold text-gray-700 truncate mb-1">
                {race.name}
              </div>

              {/* 距離・頭数 */}
              <div className="text-[10px] text-gray-400 mb-2">
                {race.track_type}{race.distance && `${race.distance}m`}
                {race.head_count != null && race.head_count > 0 && ` ${race.head_count}頭`}
              </div>

              {/* 発走時刻 or 締切 */}
              {isPastDeadline ? (
                <div className="inline-block bg-gray-100 text-gray-500 text-[11px] font-bold px-3 py-1 rounded-lg">
                  締切済
                </div>
              ) : isUrgent ? (
                <div className="inline-block bg-red-50 border border-red-200 text-red-600 text-[11px] font-black px-3 py-1 rounded-lg animate-pulse">
                  ⏰ {formatCountdown(diffMs)}
                </div>
              ) : (
                <div className="inline-block bg-blue-50 text-blue-700 text-[11px] font-bold px-3 py-1 rounded-lg">
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
