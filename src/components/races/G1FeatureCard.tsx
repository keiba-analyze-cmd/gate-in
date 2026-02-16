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
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    if (!race.post_time) return;

    const updateCountdown = () => {
      const now = new Date().getTime();
      const postTime = new Date(race.post_time!).getTime();
      const diff = postTime - now;

      if (diff <= 0) {
        setIsLive(true);
        return;
      }

      setCountdown({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [race.post_time]);

  const raceDate = new Date(race.race_date + "T00:00:00+09:00");
  const dateStr = raceDate.toLocaleDateString("ja-JP", { 
    month: "long", 
    day: "numeric", 
    weekday: "short" 
  });

  return (
    <Link href={`/races/${race.id}`} className="block group">
      <div className={`relative overflow-hidden rounded-3xl ${
        isDark 
          ? "bg-gradient-to-br from-yellow-600 via-amber-500 to-orange-600" 
          : "bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-500"
      } shadow-xl group-hover:shadow-2xl transition-all duration-300`}>
        
        {/* 背景装飾 */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[200px] opacity-5">🏆</div>
        </div>

        <div className="relative p-6">
          {/* ヘッダー */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="bg-white text-amber-600 text-xs font-black px-3 py-1 rounded-full shadow-lg animate-pulse">
                👑 {race.grade}
              </span>
              {isLive && (
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse">
                  🔴 LIVE
                </span>
              )}
            </div>
            <span className="text-white/80 text-sm font-medium">{dateStr}</span>
          </div>

          {/* レース名 */}
          <h2 className="text-2xl sm:text-3xl font-black text-white mb-2 drop-shadow-lg">
            {race.name}
          </h2>

          {/* レース情報 */}
          <div className="flex flex-wrap gap-3 text-white/90 text-sm mb-5">
            <span className="flex items-center gap-1">
              📍 {race.course_name}
            </span>
            {race.distance && (
              <span className="flex items-center gap-1">
                🏁 {race.distance}
              </span>
            )}
            {race.head_count && (
              <span className="flex items-center gap-1">
                🐴 {race.head_count}頭立て
              </span>
            )}
          </div>

          {/* カウントダウン */}
          {!isLive && race.post_time && (
            <div className="bg-black/20 backdrop-blur-sm rounded-2xl p-4 mb-5">
              <div className="text-white/70 text-xs text-center mb-2">⏰ 発走まで</div>
              <div className="flex justify-center gap-3">
                {countdown.days > 0 && (
                  <div className="text-center">
                    <div className="text-3xl font-black text-white">{countdown.days}</div>
                    <div className="text-xs text-white/60">日</div>
                  </div>
                )}
                <div className="text-center">
                  <div className="text-3xl font-black text-white">{String(countdown.hours).padStart(2, '0')}</div>
                  <div className="text-xs text-white/60">時間</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-black text-white">{String(countdown.minutes).padStart(2, '0')}</div>
                  <div className="text-xs text-white/60">分</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-black text-white">{String(countdown.seconds).padStart(2, '0')}</div>
                  <div className="text-xs text-white/60">秒</div>
                </div>
              </div>
            </div>
          )}

          {/* 参加者数 & CTAボタン */}
          <div className="flex items-center justify-between">
            <div className="text-white/80 text-sm">
              👥 <span className="font-bold text-white">{voteCount}</span>人が予想済み
            </div>
            <span className="inline-flex items-center gap-2 bg-white text-amber-600 font-black text-sm px-5 py-2.5 rounded-full shadow-lg group-hover:scale-105 transition-transform">
              🗳 予想する
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
