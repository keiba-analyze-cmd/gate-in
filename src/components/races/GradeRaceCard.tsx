"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

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

export default function GradeRaceCard({ race, voteCount = 0 }: Props) {
  const [timeLeft, setTimeLeft] = useState<string>("");

  useEffect(() => {
    if (!race.post_time) return;

    const updateTime = () => {
      const now = new Date().getTime();
      const postTime = new Date(race.post_time!).getTime();
      const diff = postTime - now;

      if (diff <= 0) {
        setTimeLeft("まもなく発走");
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setTimeLeft(`${days}日${hours}時間`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}時間${minutes}分`);
      } else {
        setTimeLeft(`${minutes}分`);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 60000); // 1分ごとに更新
    return () => clearInterval(interval);
  }, [race.post_time]);

  const gradeColors: Record<string, string> = {
    G2: "from-red-500 to-red-600",
    G3: "from-green-500 to-green-600",
    OP: "from-gray-500 to-gray-600",
    L: "from-blue-500 to-blue-600",
  };
  const bg = gradeColors[race.grade ?? ""] ?? "from-green-500 to-green-600";

  const raceDate = new Date(race.race_date + "T00:00:00+09:00");
  const dateStr = raceDate.toLocaleDateString("ja-JP", { 
    month: "numeric", 
    day: "numeric", 
    weekday: "short" 
  });

  return (
    <Link href={`/races/${race.id}`} className="block group">
      <div className={`rounded-2xl p-4 text-white relative overflow-hidden bg-gradient-to-br ${bg} group-hover:shadow-lg transition-shadow`}>
        <div className="flex items-start justify-between mb-2">
          <span className="bg-white/25 text-white text-xs font-black px-2 py-0.5 rounded">
            {race.grade}
          </span>
          <span className="text-white/80 text-xs font-medium">
            {dateStr}
          </span>
        </div>
        <h3 className="text-xl font-black mb-1">{race.name}</h3>
        <p className="text-white/80 text-xs font-medium">
          {race.course_name}
          {race.distance && ` ${race.distance}`}
          {race.head_count && ` ${race.head_count}頭`}
        </p>
        
        {/* 残り時間と投票人数 */}
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-3 text-white/90 text-xs">
            {timeLeft && (
              <span className="flex items-center gap-1">
                ⏰ {timeLeft}
              </span>
            )}
            <span className="flex items-center gap-1">
              👥 {voteCount}人
            </span>
          </div>
          <span className="inline-block bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full group-hover:bg-white/30 transition-colors">
            予想する →
          </span>
        </div>
      </div>
    </Link>
  );
}
