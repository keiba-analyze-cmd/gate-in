"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTheme } from "@/contexts/ThemeContext";

type Props = {
  race: {
    id: string;
    name: string;
    grade: string | null;
    course_name: string;
    race_date: string;
    post_time: string | null;
    distance: string | null;
    head_count: number | null;
  };
  voteCount?: number;
};

export default function G1FeatureCard({ race, voteCount = 0 }: Props) {
  const { isDark } = useTheme();
  const [timeLeft, setTimeLeft] = useState("");
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    if (!race.post_time) return;
    const update = () => {
      const diff = new Date(race.post_time!).getTime() - Date.now();
      if (diff <= 0) { setIsLive(true); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      if (d > 0) setTimeLeft(`${d}日${h}時間`);
      else if (h > 0) setTimeLeft(`${h}時間${m}分`);
      else setTimeLeft(`${m}分`);
    };
    update();
    const iv = setInterval(update, 30000);
    return () => clearInterval(iv);
  }, [race.post_time]);

  const dateStr = new Date(race.race_date + "T00:00:00+09:00").toLocaleDateString("ja-JP", {
    month: "short", day: "numeric", weekday: "short",
  });

  const postTimeStr = race.post_time
    ? new Date(race.post_time).toLocaleTimeString("ja-JP", {
        timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit",
      })
    : null;

  return (
    <Link href={`/races/${race.id}`} className="block group">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 via-yellow-500 to-orange-500 shadow-lg group-hover:shadow-xl transition-all">
        {/* Background circles */}
        <div className="absolute -right-8 -top-8 w-28 h-28 rounded-full bg-white/10" />
        <div className="absolute right-12 -bottom-6 w-20 h-20 rounded-full bg-white/5" />

        <div className="relative p-5">
          {/* Top row */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="bg-white/25 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">
                {race.grade}
              </span>
              <span className="text-white/70 text-xs">{dateStr}</span>
            </div>
            {isLive ? (
              <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                LIVE
              </span>
            ) : timeLeft ? (
              <span className="text-white/60 text-xs">
                あと {timeLeft}
              </span>
            ) : null}
          </div>

          {/* Race name */}
          <h2 className="text-[22px] font-black text-white mb-1 leading-tight">
            {race.name}
          </h2>

          {/* Details */}
          <div className="text-white/80 text-xs mb-4">
            {race.course_name}
            {race.distance && ` ${race.distance}`}
            {race.head_count && ` ・ ${race.head_count}頭`}
            {postTimeStr && ` ・ ${postTimeStr}発走`}
          </div>

          {/* Bottom row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Avatar stack */}
              <div className="flex -space-x-1.5">
                {[...Array(Math.min(3, voteCount || 1))].map((_, i) => (
                  <div
                    key={i}
                    className="w-6 h-6 rounded-full bg-white/30 border-[1.5px] border-white/60"
                  />
                ))}
              </div>
              <span className="text-white/90 text-xs">
                {voteCount > 0 ? `${voteCount}人が予想済み` : "最初の予想者になろう"}
              </span>
            </div>
            <div className="bg-white text-amber-600 px-4 py-1.5 rounded-full text-xs font-bold group-hover:scale-105 transition-transform shadow">
              予想する
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
