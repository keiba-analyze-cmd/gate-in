"use client";

import Image from "next/image";
import { useTheme } from "@/contexts/ThemeContext";

const COLUMNS = [
  {
    ai: { id: "hakusen", name: "ハクセン", type: "血統分析型", img: "/images/predictors/hakusen.png", color: "#059669" },
    title: "今週の血統注目馬",
    desc: "コース×距離×種牡馬の相性データから、今週注目すべき血統を解説",
    time: "毎週金曜更新",
  },
  {
    ai: { id: "hayate", name: "ハヤテ", type: "データ分析型", img: "/images/predictors/hayate.png", color: "#1E40AF" },
    title: "データで読む重賞展望",
    desc: "IDMトレンドと騎手データから、重賞レースの傾向を分析",
    time: "毎週土曜更新",
  },
];

export default function AIColumnPreview() {
  const { isDark } = useTheme();

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className={`text-sm font-black ${isDark ? "text-white" : "text-gray-900"}`}>📝 AI予想家コラム</h2>
      </div>
      <div className="space-y-2">
        {COLUMNS.map((col, i) => (
          <div
            key={i}
            className={`rounded-2xl p-4 border cursor-pointer transition-shadow hover:shadow-md ${
              isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"
            }`}
            style={{ borderColor: col.ai.color + "20", backgroundColor: isDark ? undefined : col.ai.color + "04" }}
          >
            <div className="flex items-center gap-3 mb-2">
              <Image
                src={col.ai.img}
                alt={col.ai.name}
                width={36}
                height={36}
                className="rounded-full object-cover"
                style={{ border: `2px solid ${col.ai.color}30` }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-black ${isDark ? "text-white" : "text-gray-900"}`}>{col.ai.name}</span>
                  <span
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded-md"
                    style={{ backgroundColor: col.ai.color + "12", color: col.ai.color }}
                  >
                    {col.ai.type}
                  </span>
                </div>
                <span className={`text-[10px] ${isDark ? "text-slate-500" : "text-gray-400"}`}>{col.time}</span>
              </div>
            </div>
            <div className={`text-sm font-bold mb-1 ${isDark ? "text-white" : "text-gray-900"}`}>{col.title}</div>
            <div className={`text-xs leading-relaxed ${isDark ? "text-slate-400" : "text-gray-500"}`}>{col.desc}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
