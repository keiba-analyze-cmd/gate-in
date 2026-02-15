"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { getRank } from "@/lib/constants/ranks";

type MVPData = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  rank_id: string;
  weekly_points: number;
  hit_rate: number;
};

export default function WeeklyMVPBanner() {
  const [mvp, setMvp] = useState<MVPData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/rankings/weekly?week=last")
      .then((res) => res.json())
      .then((data) => {
        setMvp(data.mvp);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading || !mvp) {
    return null;
  }

  const rank = getRank(mvp.rank_id);

  return (
    <Link
      href="/rankings"
      className="block bg-gradient-to-r from-yellow-400 to-orange-400 rounded-2xl p-4 text-white hover:from-yellow-500 hover:to-orange-500 transition-all"
    >
      <div className="flex items-center gap-4">
        <div className="text-3xl">🏆</div>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-yellow-100 mb-0.5">先週のMVP</div>
          <div className="flex items-center gap-2">
            {mvp.avatar_url ? (
              <Image
                src={mvp.avatar_url}
                alt=""
                width={32}
                height={32}
                className="w-8 h-8 rounded-full border-2 border-white/50"
                unoptimized
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm">👑</div>
            )}
            <div>
              <div className="font-bold truncate">{mvp.display_name}</div>
              <div className="text-xs text-yellow-100">
                +{mvp.weekly_points}P • 的中率{mvp.hit_rate}%
              </div>
            </div>
          </div>
        </div>
        <div className="text-yellow-100 text-sm">詳細 →</div>
      </div>
    </Link>
  );
}
