"use client";

import Link from "next/link";
import Image from "next/image";
import { useTheme } from "@/contexts/ThemeContext";

type Props = {
  user: { id: string } | null;
  profile: {
    display_name: string | null;
    avatar_url: string | null;
    cumulative_points: number;
    rank_icon: string;
  } | null;
  unreadCount: number;
};

export default function HeaderClient({ user, profile, unreadCount }: Props) {
  const { isDark } = useTheme();

  const getInitial = (name: string | null): string => {
    if (!name) return "G";
    return name.charAt(0).toUpperCase();
  };

  return (
    <header className={`sticky top-0 z-50 border-b-2 transition-colors ${isDark ? "bg-slate-900 border-amber-500" : "bg-white border-green-600"}`}>
      <div className="max-w-5xl mx-auto flex items-center justify-between px-4 h-12">
        <Link href="/" className="flex items-center gap-1.5 shrink-0">
          <span className="text-xl">🏇</span>
          <span className={`text-lg font-black ${isDark ? "text-slate-100" : "text-gray-800"}`}>
            ゲートイン<span className={isDark ? "text-amber-400" : "text-orange-600"}>！</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-0.5 ml-6">
          <NavLink href="/" isDark={isDark}>トップ</NavLink>
          <NavLink href="/races" isDark={isDark}>レース</NavLink>
          <NavLink href="/rankings" isDark={isDark}>ランキング</NavLink>
          <NavLink href="/contest" isDark={isDark}>大会</NavLink>
          <NavLink href="/timeline" isDark={isDark}>TL</NavLink>
          <NavLink href="/dojo" isDark={isDark}>道場</NavLink>
          <NavLink href="/users" isDark={isDark}>検索</NavLink>
        </nav>

        <div className="flex items-center gap-3">
          {profile && user ? (
            <>
              <Link href="/notifications" className={`relative p-1 transition-colors ${isDark ? "text-slate-400 hover:text-amber-400" : "text-gray-500 hover:text-green-600"}`}>
                <span className="text-xl">🔔</span>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>

              <Link href="/mypage" className="block">
                {profile.avatar_url ? (
                  <Image src={profile.avatar_url} alt="マイページ" width={32} height={32} className={`w-8 h-8 rounded-full border-2 cursor-pointer ${isDark ? "border-amber-500" : "border-green-500"}`} />
                ) : (
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 cursor-pointer ${isDark ? "bg-gradient-to-br from-amber-500 to-orange-500 text-slate-900 border-amber-400" : "bg-gradient-to-br from-green-500 to-emerald-500 text-white border-green-400"}`}>
                    {getInitial(profile.display_name)}
                  </div>
                )}
              </Link>
            </>
          ) : (
            <Link href="/login" className={`text-sm px-4 py-1.5 rounded-lg font-bold transition-colors ${isDark ? "bg-amber-500 text-slate-900 hover:bg-amber-400" : "bg-green-600 text-white hover:bg-green-700"}`}>
              ログイン
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

function NavLink({ href, children, isDark }: { href: string; children: React.ReactNode; isDark: boolean }) {
  return (
    <Link href={href} className={`px-3 py-1.5 text-sm font-bold rounded-lg transition-colors ${isDark ? "text-slate-400 hover:text-amber-400 hover:bg-slate-800" : "text-gray-500 hover:text-green-600 hover:bg-green-50"}`}>
      {children}
    </Link>
  );
}
