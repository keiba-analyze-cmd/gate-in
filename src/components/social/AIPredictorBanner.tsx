"use client";

import Link from "next/link";
import Image from "next/image";
import { useTheme } from "@/contexts/ThemeContext";

const PREDICTORS = [
  { id: "hayate", name: "ハヤテ", type: "データ分析型", img: "/images/predictors/hayate.png", color: "#1E40AF" },
  { id: "gantetsu", name: "ガンテツ", type: "軸馬特化型", img: "/images/predictors/gantetsu.png", color: "#475569" },
  { id: "kazan", name: "カザン", type: "穴馬予測型", img: "/images/predictors/kazan.png", color: "#DC2626" },
  { id: "hakusen", name: "ハクセン", type: "血統分析型", img: "/images/predictors/hakusen.png", color: "#059669" },
  { id: "hibari", name: "ヒバリ", type: "当日データ型", img: "/images/predictors/hibari.png", color: "#D97706" },
];

export default function AIPredictorBanner() {
  const { isDark } = useTheme();

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className={`text-sm font-black ${isDark ? "text-white" : "text-gray-900"}`}>🤖 AI予想家</h2>
        <span className={`text-xs font-bold ${isDark ? "text-amber-400" : "text-green-600"}`}>
          レース詳細で予想を見る →
        </span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide md:justify-center">
        {PREDICTORS.map((p) => (
          <div
            key={p.id}
            className={`min-w-[110px] flex-shrink-0 rounded-2xl p-3 text-center border cursor-pointer transition-shadow hover:shadow-md ${
              isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"
            }`}
            style={{ borderColor: p.color + "30" }}
          >
            <div className="mx-auto mb-2 relative w-11 h-11">
              <Image
                src={p.img}
                alt={p.name}
                width={44}
                height={44}
                className="rounded-full object-cover"
                style={{ border: `2px solid ${p.color}40` }}
              />
            </div>
            <div className={`text-sm font-black ${isDark ? "text-white" : "text-gray-900"}`}>{p.name}</div>
            <div
              className="text-[10px] font-bold rounded-full px-2 py-0.5 mt-1 inline-block"
              style={{ backgroundColor: p.color + "15", color: p.color }}
            >
              {p.type}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
