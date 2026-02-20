"use client";

import { useState, useEffect } from "react";

export default function RaceCardCountdown({ postTime }: { postTime: string }) {
  const [remaining, setRemaining] = useState("");

  useEffect(() => {
    const update = () => {
      const deadline = new Date(postTime).getTime() + 30 * 1000;
      const now = Date.now();
      const diff = deadline - now;
      if (diff <= 0) {
        setRemaining("締切");
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      if (h > 0) setRemaining(`残${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
      else setRemaining(`残${m}:${String(s).padStart(2, "0")}`);
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [postTime]);

  if (!remaining) return null;

  return (
    <span className={`text-[10px] font-bold ${remaining === "締切" ? "text-red-500" : "text-orange-500"}`}>
      ⏱{remaining}
    </span>
  );
}
