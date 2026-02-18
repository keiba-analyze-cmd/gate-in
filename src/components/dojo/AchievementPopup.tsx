// src/components/dojo/AchievementPopup.tsx
"use client";

import { useState, useEffect } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { RARITY_COLORS, type BadgeDefinition } from "@/lib/constants/gamification";

type Achievement = {
  type: "badge" | "title" | "xp";
  badge?: BadgeDefinition;
  titleName?: string;
  titleEmoji?: string;
  xpAmount?: number;
};

type Props = {
  achievements: Achievement[];
  onClose: () => void;
};

export default function AchievementPopup({ achievements, onClose }: Props) {
  const { isDark } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (achievements.length > 0) {
      setTimeout(() => setIsVisible(true), 100);
    }
  }, [achievements]);

  if (achievements.length === 0) return null;

  const current = achievements[currentIndex];
  const isLast = currentIndex >= achievements.length - 1;

  const handleNext = () => {
    if (isLast) {
      setIsVisible(false);
      setTimeout(onClose, 300);
    } else {
      setCurrentIndex((i) => i + 1);
    }
  };

  const rarityStyle = current.badge
    ? RARITY_COLORS[current.badge.rarity]
    : null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${
        isVisible ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      {/* オーバーレイ */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleNext}
      />

      {/* カード */}
      <div
        className={`relative max-w-sm w-full rounded-2xl border-2 p-6 text-center transition-all duration-500 ${
          isVisible ? "scale-100 translate-y-0" : "scale-90 translate-y-8"
        } ${
          isDark ? "bg-slate-900 border-slate-600" : "bg-white border-gray-200"
        }`}
      >
        {/* パーティクル風エフェクト */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex gap-1">
          {["✨", "🎊", "✨"].map((e, i) => (
            <span
              key={i}
              className="text-xl animate-bounce"
              style={{ animationDelay: `${i * 150}ms` }}
            >
              {e}
            </span>
          ))}
        </div>

        {/* バッジ獲得 */}
        {current.type === "badge" && current.badge && (
          <>
            <div className="text-5xl mb-3 animate-pulse">
              {current.badge.emoji}
            </div>
            <div
              className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mb-2 ${
                isDark
                  ? `${rarityStyle?.dark_bg} ${rarityStyle?.dark_text}`
                  : `${rarityStyle?.bg} ${rarityStyle?.text}`
              }`}
            >
              {rarityStyle?.label}
            </div>
            <h2
              className={`text-xl font-black mb-1 ${
                isDark ? "text-slate-100" : "text-gray-900"
              }`}
            >
              バッジ獲得！
            </h2>
            <p
              className={`text-lg font-bold mb-1 ${
                isDark ? "text-amber-400" : "text-green-600"
              }`}
            >
              {current.badge.name}
            </p>
            <p
              className={`text-sm ${
                isDark ? "text-slate-400" : "text-gray-500"
              }`}
            >
              {current.badge.description}
            </p>
          </>
        )}

        {/* 称号昇格 */}
        {current.type === "title" && (
          <>
            <div className="text-5xl mb-3 animate-pulse">
              {current.titleEmoji}
            </div>
            <h2
              className={`text-xl font-black mb-1 ${
                isDark ? "text-slate-100" : "text-gray-900"
              }`}
            >
              称号アップ！
            </h2>
            <p
              className={`text-lg font-bold ${
                isDark ? "text-amber-400" : "text-green-600"
              }`}
            >
              {current.titleName}
            </p>
          </>
        )}

        {/* XP通知 */}
        {current.type === "xp" && (
          <>
            <div className="text-5xl mb-3">🎯</div>
            <h2
              className={`text-xl font-black mb-1 ${
                isDark ? "text-slate-100" : "text-gray-900"
              }`}
            >
              +{current.xpAmount} XP
            </h2>
          </>
        )}

        {/* ボタン */}
        <button
          onClick={handleNext}
          className={`mt-5 w-full py-3 rounded-xl font-bold transition-colors ${
            isDark
              ? "bg-amber-500 text-slate-900 hover:bg-amber-400"
              : "bg-green-600 text-white hover:bg-green-700"
          }`}
        >
          {isLast ? "OK！" : `次へ (${currentIndex + 1}/${achievements.length})`}
        </button>

        {/* カウンター */}
        {achievements.length > 1 && (
          <div className="flex justify-center gap-1 mt-3">
            {achievements.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full ${
                  i === currentIndex
                    ? isDark
                      ? "bg-amber-500"
                      : "bg-green-500"
                    : isDark
                      ? "bg-slate-700"
                      : "bg-gray-200"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
