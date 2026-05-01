"use client";

import Link from "next/link";
import Image from "next/image";

const EXPIRY_DATE = new Date("2026-05-18T23:59:59+09:00"); // 約2.5週間後に非表示

const CHARS = [
  { id: "hayate", color: "#1E40AF" },
  { id: "kazan", color: "#DC2626" },
  { id: "hakusen", color: "#059669" },
  { id: "hibari", color: "#D97706" },
  { id: "gantetsu", color: "#475569" },
];

export default function AIPredictorLaunchBanner() {
  if (new Date() > EXPIRY_DATE) return null;

  return (
    <Link href="/predictors" className="block">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-800 via-emerald-700 to-red-700 p-[1px]">
        <div className="relative rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-5 py-4 overflow-hidden">
          {/* 背景パターン */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute top-2 right-4 text-[100px] leading-none">🤖</div>
          </div>

          <div className="relative">
            {/* バッジ */}
            <span className="inline-block text-[10px] font-bold text-amber-300 bg-amber-400/15 px-3 py-1 rounded-full mb-2.5 tracking-wider">
              NEW FEATURE
            </span>

            {/* タイトル */}
            <h2 className="text-lg font-black text-white leading-tight mb-1">
              AI予想家、始動。
            </h2>
            <p className="text-xs text-white/60 mb-3">
              5体のAIがそれぞれ異なる視点で◎本命を選出
            </p>

            {/* キャラアイコン横並び */}
            <div className="flex items-center justify-between">
              <div className="flex -space-x-1.5">
                {CHARS.map((c) => (
                  <div
                    key={c.id}
                    className="w-9 h-9 rounded-full border-2 border-slate-900 overflow-hidden"
                    style={{ backgroundColor: c.color + "30" }}
                  >
                    <Image
                      src={`/images/predictors/${c.id}.webp`}
                      alt={c.id}
                      width={36}
                      height={36}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
              <span className="text-xs font-bold text-white bg-white/15 px-4 py-2 rounded-xl">
                詳しく見る →
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
