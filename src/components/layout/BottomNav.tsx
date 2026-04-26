"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "@/contexts/ThemeContext";

const NAV_ITEMS = [
  { id: 'home', href: '/', icon: '🏠', label: 'トップ', match: /^\/$/ },
  { id: 'races', href: '/races', icon: '🏇', label: 'レース', match: /^\/races/ },
  { id: 'timeline', href: '/timeline', icon: '📣', label: 'TL', match: /^\/timeline/ },
  { id: 'contest', href: '/contest', icon: '🏆', label: '大会', match: /^\/contest/ },
  { id: 'mypage', href: '/mypage', icon: '👤', label: 'マイページ', match: /^\/mypage/ },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { isDark } = useTheme();

  return (
    <nav className={`md:hidden fixed bottom-0 left-0 right-0 z-50 border-t transition-colors ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-gray-200"} safe-area-bottom`}>
      <div className="flex">
        {NAV_ITEMS.map((item) => {
          const isActive = item.match.test(pathname);
          return (
            <Link key={item.id} href={item.href} className={`flex-1 flex flex-col items-center py-1.5 transition-colors ${isActive ? (isDark ? "text-amber-400" : "text-green-600") : (isDark ? "text-slate-500" : "text-gray-400")}`}>
              <span className="text-lg leading-none">{item.icon}</span>
              <span className={`text-[10px] mt-0.5 ${isActive ? "font-bold" : ""}`}>{item.label}</span>
            </Link>
          );
        })}
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
