"use client";

import Link from "next/link";
import { useTheme } from "@/contexts/ThemeContext";

export default function SettingsClient() {
  const { isDark, toggleTheme, theme } = useTheme();

  const cardClass = isDark 
    ? "bg-slate-900 border-slate-700" 
    : "bg-white border-gray-200";
  
  const itemClass = isDark
    ? "hover:bg-slate-800"
    : "hover:bg-gray-50";

  const textPrimary = isDark ? "text-slate-100" : "text-gray-900";
  const textSecondary = isDark ? "text-slate-400" : "text-gray-500";
  const borderClass = isDark ? "border-slate-700" : "border-gray-100";

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h1 className={`text-xl font-black ${textPrimary}`}>⚙️ 設定</h1>

      {/* ダークモード切替 */}
      <div className={`rounded-2xl border overflow-hidden ${cardClass}`}>
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="text-xl">{isDark ? "🌙" : "☀️"}</span>
            <div>
              <div className={`text-sm font-bold ${textPrimary}`}>ダークモード</div>
              <div className={`text-xs ${textSecondary}`}>目に優しい暗い配色</div>
            </div>
          </div>
          <button
            onClick={toggleTheme}
            className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full p-1 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              isDark ? "bg-amber-500 focus:ring-amber-500" : "bg-gray-300 focus:ring-green-500"
            }`}
            role="switch"
            aria-checked={isDark}
          >
            <span className={`h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-200 ${isDark ? "translate-x-5" : "translate-x-0"}`} />
          </button>
        </div>
      </div>

      {/* 設定メニュー */}
      <div className={`rounded-2xl border overflow-hidden ${cardClass}`}>
        <MenuItem href="/mypage/notification-settings" icon="🔔" label="通知設定" desc="プッシュ通知のON/OFF" isDark={isDark} />
        <MenuItem href="/mypage/newspaper" icon="📰" label="My競馬新聞設定" desc="表示する予想家を選ぶ" isDark={isDark} border />
        <MenuItem href="/mypage/edit" icon="👤" label="プロフィール編集" desc="表示名・自己紹介を変更" isDark={isDark} border />
      </div>

      {/* アカウント設定 */}
      <div className={`rounded-2xl border overflow-hidden ${cardClass}`}>
        <MenuItem href="/mypage/delete" icon="🚪" label="アカウント削除" desc="退会する" isDark={isDark} danger />
      </div>

      <div className="text-center pt-4">
        <Link href="/mypage" className={`text-sm font-medium ${textSecondary} hover:opacity-70`}>
          ← マイページに戻る
        </Link>
      </div>
    </div>
  );
}

function MenuItem({ href, icon, label, desc, isDark, border, danger }: { 
  href: string; icon: string; label: string; desc: string; isDark: boolean; border?: boolean; danger?: boolean 
}) {
  return (
    <Link 
      href={href} 
      className={`flex items-center gap-3 px-5 py-4 transition-colors ${border ? (isDark ? "border-t border-slate-700" : "border-t border-gray-100") : ""} ${isDark ? "hover:bg-slate-800" : "hover:bg-gray-50"}`}
    >
      <span className="text-xl">{icon}</span>
      <div className="flex-1">
        <div className={`text-sm font-bold ${danger ? "text-red-500" : (isDark ? "text-slate-100" : "text-gray-900")}`}>{label}</div>
        <div className={`text-xs ${isDark ? "text-slate-400" : "text-gray-500"}`}>{desc}</div>
      </div>
      <span className={isDark ? "text-slate-500" : "text-gray-400"}>›</span>
    </Link>
  );
}
