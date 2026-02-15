"use client";

import Link from "next/link";
import { useTheme } from "@/contexts/ThemeContext";

export default function ContestClient() {
  const { isDark } = useTheme();

  const cardBg = isDark ? "bg-slate-900 border-slate-700" : "bg-white border-gray-200";
  const textPrimary = isDark ? "text-slate-100" : "text-gray-900";
  const textSecondary = isDark ? "text-slate-400" : "text-gray-600";
  const textMuted = isDark ? "text-slate-500" : "text-gray-400";
  const highlightBg = isDark ? "bg-gradient-to-br from-purple-500/30 to-pink-500/30" : "bg-gradient-to-br from-purple-400 to-pink-400";
  const infoBg = isDark ? "bg-slate-800 border-slate-700" : "bg-gray-50 border-gray-200";
  const prizeBg = isDark ? "bg-yellow-500/10 border-yellow-500/30" : "bg-yellow-50 border-yellow-200";

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Link href="/" className={`text-sm ${textMuted} ${isDark ? "hover:text-amber-400" : "hover:text-green-600"}`}>← トップ</Link>

      <h1 className={`text-xl font-bold ${isDark ? "text-purple-400" : "text-purple-600"}`}>🏟️ 月間大会</h1>

      <div className={`rounded-2xl p-8 text-center text-white ${highlightBg}`}>
        <div className="text-5xl mb-4">🏆</div>
        <h2 className="text-2xl font-black mb-2">近日開催予定！</h2>
        <p className="text-sm opacity-90">毎月開催の予想バトル大会を準備中です。</p>
        <p className="text-sm opacity-90">上位入賞者にはAmazonギフト券をプレゼント！</p>
      </div>

      <div className={`rounded-2xl border p-5 ${cardBg}`}>
        <h3 className={`font-bold mb-4 ${textPrimary}`}>📋 大会概要（予定）</h3>

        <div className={`rounded-xl border p-4 mb-3 ${infoBg}`}>
          <h4 className={`font-bold ${isDark ? "text-purple-400" : "text-purple-600"}`}>📅 開催期間</h4>
          <p className={textSecondary}>毎月1日 〜 月末</p>
        </div>

        <div className={`rounded-xl border p-4 mb-3 ${infoBg}`}>
          <h4 className={`font-bold ${isDark ? "text-purple-400" : "text-purple-600"}`}>📊 ルール</h4>
          <p className={textSecondary}>月間の獲得ポイントで順位を競います。一定投票数以上で参加資格を獲得。</p>
        </div>

        <div className={`rounded-xl border p-4 ${prizeBg}`}>
          <h4 className={`font-bold ${isDark ? "text-yellow-400" : "text-yellow-700"}`}>🎁 賞品（予定）</h4>
          <ul className={`mt-2 space-y-1 text-sm ${textSecondary}`}>
            <li>🥇 1位：Amazonギフト券 ¥10,000</li>
            <li>🥈 2位：Amazonギフト券 ¥5,000</li>
            <li>🥉 3位：Amazonギフト券 ¥3,000</li>
          </ul>
        </div>
      </div>

      <Link href="/rankings" className={`block text-center py-3 rounded-xl font-bold ${isDark ? "bg-amber-500 text-slate-900" : "bg-green-600 text-white"}`}>
        現在のランキングを見る →
      </Link>
    </div>
  );
}
