"use client";

import Link from "next/link";
import { useTheme } from "@/contexts/ThemeContext";

export default function Footer() {
  const { isDark } = useTheme();

  const bgClass = isDark ? "bg-slate-900 border-slate-800" : "bg-gray-50 border-gray-200";
  const linkClass = isDark ? "text-slate-500 hover:text-amber-400" : "text-gray-400 hover:text-green-600";
  const copyClass = isDark ? "text-slate-600" : "text-gray-300";

  return (
    <footer className={`border-t mt-8 pb-20 md:pb-0 ${bgClass}`}>
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mb-4">
          <Link href="/terms" className={`text-[11px] transition-colors ${linkClass}`}>
            利用規約
          </Link>
          <Link href="/privacy" className={`text-[11px] transition-colors ${linkClass}`}>
            プライバシーポリシー
          </Link>
          <Link href="/legal" className={`text-[11px] transition-colors ${linkClass}`}>
            特定商取引法に基づく表記
          </Link>
          <Link href="/contact" className={`text-[11px] transition-colors ${linkClass}`}>
            お問い合わせ
          </Link>
        </div>
        <p className={`text-center text-[10px] ${copyClass}`}>
          © 2026 ゲートイン！ All rights reserved.
        </p>
      </div>
    </footer>
  );
}
