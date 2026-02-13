"use client";

import { useEffect, useState } from "react";

type Props = {
  startTime: string; // ISO or time string
  raceDate: string;
  status: string;
};

export default function RaceCountdown({ startTime, raceDate, status }: Props) {
  const [remaining, setRemaining] = useState("");
  const [urgent, setUrgent] = useState(false);

  useEffect(() => {
    if (status !== "voting_open") return;

    // 発走時刻を組み立て
    const targetStr = startTime.includes("T") ? startTime : `${raceDate}T${startTime}:00+09:00`;
    const target = new Date(targetStr);

    const update = () => {
      const now = new Date();
      const diff = target.getTime() - now.getTime();

      if (diff <= 0) {
        setRemaining("締切");
        setUrgent(false);
        return;
      }

      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);

      if (hours > 0) {
        setRemaining(`${hours}時間${minutes}分`);
        setUrgent(false);
      } else if (minutes > 10) {
        setRemaining(`${minutes}分`);
        setUrgent(false);
      } else {
        setRemaining(`${minutes}:${String(seconds).padStart(2, "0")}`);
        setUrgent(true);
      }
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startTime, raceDate, status]);

  if (status !== "voting_open" || !remaining) return null;

  return (
    <div className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full ${
      urgent
        ? "bg-red-100 text-red-600 animate-pulse"
        : "bg-orange-50 text-orange-600"
    }`}>
      <span>⏰</span>
      <span>締切まで {remaining}</span>
    </div>
  );
}
