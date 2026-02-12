"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", icon: "🏠", label: "トップ", match: /^\/$/ },
  { href: "/races", icon: "🏇", label: "レース", match: /^\/races/ },
  { href: "/rankings", icon: "🏆", label: "ランキング", match: /^\/(rankings|contest)/ },
  { href: "/timeline", icon: "📰", label: "TL", match: /^\/timeline/ },
  { href: "/mypage", icon: "👤", label: "マイ", match: /^\/(mypage|users|notifications)/ },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 safe-area-bottom">
      <div className="flex">
        {NAV_ITEMS.map((item) => {
          const isActive = item.match.test(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center py-1.5 transition-colors ${
                isActive ? "text-green-600" : "text-gray-400"
              }`}
            >
              <span className="text-lg leading-none">{item.icon}</span>
              <span className={`text-[10px] mt-0.5 ${isActive ? "font-bold" : ""}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
      {/* iPhoneのSafeArea対応 */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
