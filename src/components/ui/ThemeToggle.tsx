"use client";

import { useTheme } from "@/contexts/ThemeContext";

export default function ThemeToggle({ showLabel = true, size = "md" }: { showLabel?: boolean; size?: "sm" | "md" | "lg" }) {
  const { isDark, toggleTheme, theme } = useTheme();
  const s = { sm: { track: "w-10 h-6", thumb: "w-4 h-4", translate: "translate-x-4" }, md: { track: "w-12 h-7", thumb: "w-5 h-5", translate: "translate-x-5" }, lg: { track: "w-14 h-8", thumb: "w-6 h-6", translate: "translate-x-6" } }[size];

  return (
    <div className="flex items-center justify-between">
      {showLabel && <div className="flex items-center gap-3"><span className="text-xl">{isDark ? "🌙" : "☀️"}</span><div><div className={`text-sm font-bold ${theme.textPrimary}`}>ダークモード</div><div className={`text-xs ${theme.textMuted}`}>目に優しい暗い配色</div></div></div>}
      <button onClick={toggleTheme} className={`relative inline-flex shrink-0 cursor-pointer rounded-full p-1 transition-colors duration-200 ${s.track} ${isDark ? "bg-amber-500" : "bg-gray-300"} focus:outline-none focus:ring-2 focus:ring-offset-2 ${isDark ? "focus:ring-amber-500" : "focus:ring-green-500"}`} role="switch" aria-checked={isDark} aria-label="ダークモード切り替え">
        <span className={`${s.thumb} rounded-full bg-white shadow-md transition-transform duration-200 ${isDark ? s.translate : "translate-x-0"}`} />
      </button>
    </div>
  );
}
