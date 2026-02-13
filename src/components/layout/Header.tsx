import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { getRank } from "@/lib/constants/ranks";
import LogoutButton from "@/components/LogoutButton";

export default async function Header() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let profile = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("display_name, avatar_url, rank_id, cumulative_points")
      .eq("id", user.id)
      .single();
    profile = data;
  }

  let unreadCount = 0;
  if (user) {
    const { count } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_read", false);
    unreadCount = count ?? 0;
  }

  const rank = profile ? getRank(profile.rank_id) : null;

  return (
    <header className="sticky top-0 z-50 bg-white border-b-2 border-green-600">
      <div className="max-w-5xl mx-auto flex items-center justify-between px-4 h-12">
        {/* ロゴ */}
        <Link href="/" className="flex items-center gap-1.5 shrink-0">
          <span className="text-xl">🏇</span>
          <span className="text-lg font-black text-gray-800">
            ゲートイン<span className="text-orange-600">！</span>
          </span>
        </Link>

        {/* PC ナビ */}
        <nav className="hidden md:flex items-center gap-0.5 ml-6">
          <NavLink href="/">トップ</NavLink>
          <NavLink href="/races">レース</NavLink>
          <NavLink href="/rankings">ランキング</NavLink>
          <NavLink href="/contest">大会</NavLink>
          <NavLink href="/timeline">TL</NavLink>
        </nav>

        {/* 右側 */}
        <div className="flex items-center gap-2">
          {profile && user ? (
            <>
              <Link
                href="/notifications"
                className="relative p-1.5 text-gray-500 hover:text-green-600 transition-colors"
              >
                <span className="text-base">🔔</span>
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-bold min-w-[16px] h-4 rounded-full flex items-center justify-center px-1">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>

              <Link
                href="/mypage"
                className="flex items-center gap-1.5 bg-green-50 px-2.5 py-1 rounded-full hover:bg-green-100 transition-colors border border-green-200"
              >
                <span className="text-xs">💰</span>
                <span className="text-sm font-black text-gray-800 font-num">
                  {profile.cumulative_points.toLocaleString()}
                  <span className="text-[10px] text-gray-500 ml-0.5">P</span>
                </span>
              </Link>

              <Link
                href="/mypage"
                className="flex items-center gap-1.5 hover:opacity-70 transition-opacity"
                title="マイページ"
              >
                {profile.avatar_url ? (
                  <Image src={profile.avatar_url} alt="" width={28} height={28} className="w-7 h-7 rounded-full border border-gray-200" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center text-xs border border-green-200">
                    {rank?.icon ?? "🏇"}
                  </div>
                )}
              </Link>

              <LogoutButton />
            </>
          ) : (
            <Link href="/login" className="text-sm bg-green-600 text-white px-4 py-1.5 rounded-lg font-bold hover:bg-green-700 transition-colors">
              ログイン
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="px-3 py-1.5 text-sm font-bold text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors">
      {children}
    </Link>
  );
}
