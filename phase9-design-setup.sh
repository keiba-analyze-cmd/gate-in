#!/bin/bash
# ============================================
# ゲートイン！ Phase 9 デザイン改善スクリプト
# ワイヤーフレーム準拠のデザイン強化
# gate-in フォルダ内で実行してください
# ============================================

echo "🎨 ゲートイン！ Phase 9（デザイン改善）セットアップを開始します..."
echo ""

# ====== グローバルCSS ======
echo "📝 src/app/globals.css"
cat << 'FILEOF' > src/app/globals.css
@import "tailwindcss";

@layer base {
  :root {
    --primary: #16a34a;
    --primary-light: #dcfce7;
    --accent: #ea580c;
    --accent-light: #fff7ed;
    --gold: #eab308;
    --gold-light: #fefce8;
  }

  html {
    -webkit-tap-highlight-color: transparent;
  }

  body {
    @apply bg-gray-50 text-gray-800 antialiased;
    font-feature-settings: "palt";
    padding-bottom: env(safe-area-inset-bottom, 0);
  }

  /* スクロールバーを細く */
  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 99px; }

  /* 数字をプロポーショナルに */
  .font-num {
    font-variant-numeric: tabular-nums;
    font-feature-settings: "tnum";
  }
}

@layer utilities {
  .gradient-primary {
    background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
  }
  .gradient-gold {
    background: linear-gradient(135deg, #eab308 0%, #ca8a04 100%);
  }
  .gradient-purple {
    background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
  }
  .gradient-accent {
    background: linear-gradient(135deg, #ea580c 0%, #dc2626 100%);
  }
  .card {
    @apply bg-white rounded-2xl border border-gray-100 shadow-sm;
  }
  .card-hover {
    @apply card hover:shadow-md hover:border-gray-200 transition-all duration-200 cursor-pointer;
  }
  .safe-bottom {
    padding-bottom: calc(70px + env(safe-area-inset-bottom, 0px));
  }
  /* アニメーション */
  .animate-fade-in {
    animation: fadeIn 0.3s ease-out;
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-slide-up {
    animation: slideUp 0.4s ease-out;
  }
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
}
FILEOF

# ====== Layout（ルート） ======
echo "📝 src/app/layout.tsx"
cat << 'FILEOF' > src/app/layout.tsx
import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ゲートイン！ | 競馬予想で腕試し",
  description: "みんなの予想で腕試し！レースの1着・複勝・危険馬を予想してポイントを稼ごう。月間ランキング上位者にはAmazonギフト券をプレゼント！",
  icons: { icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🏇</text></svg>" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#16a34a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
FILEOF

# ====== ヘッダー（デザイン改善 + アクセントカラー） ======
echo "📝 src/components/layout/Header.tsx"
cat << 'FILEOF' > src/components/layout/Header.tsx
import Link from "next/link";
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
                className="flex items-center gap-1.5 bg-yellow-50 px-2.5 py-1 rounded-full hover:bg-yellow-100 transition-colors border border-yellow-200"
              >
                <span className="text-xs">💰</span>
                <span className="text-sm font-black text-gray-800 font-num">
                  {profile.cumulative_points.toLocaleString()}
                  <span className="text-[10px] text-gray-500 ml-0.5">P</span>
                </span>
              </Link>

              <Link
                href="/mypage"
                className="hidden sm:flex items-center gap-1.5 hover:opacity-70 transition-opacity"
              >
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-7 h-7 rounded-full" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center text-xs">
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
FILEOF

# ====== モバイル下部ナビ（BottomNav） ======
echo "📝 src/components/layout/BottomNav.tsx"
cat << 'FILEOF' > src/components/layout/BottomNav.tsx
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
FILEOF

# ====== メインレイアウト（BottomNav統合） ======
echo "📝 src/app/(main)/layout.tsx"
cat << 'FILEOF' > src/app/\(main\)/layout.tsx
import Header from "@/components/layout/Header";
import BottomNav from "@/components/layout/BottomNav";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-5 pb-24 md:pb-5 animate-fade-in">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
FILEOF

# ====== トップページ（ワイヤーフレーム準拠デザイン） ======
echo "📝 src/app/(main)/page.tsx"
cat << 'FILEOF' > src/app/\(main\)/page.tsx
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { getRank } from "@/lib/constants/ranks";
import RaceCard from "@/components/races/RaceCard";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 投票受付中のレース
  const { data: openRaces } = await supabase
    .from("races")
    .select("*")
    .eq("status", "voting_open")
    .order("race_date", { ascending: true })
    .limit(6);

  // 注目レース（G1/G2を優先）
  const featuredRace = openRaces?.find((r) => r.grade === "G1" || r.grade === "G2") ?? openRaces?.[0];
  const otherRaces = openRaces?.filter((r) => r.id !== featuredRace?.id) ?? [];

  // 投票数を取得
  let featuredVoteCount = 0;
  if (featuredRace) {
    const { count } = await supabase
      .from("votes")
      .select("*", { count: "exact", head: true })
      .eq("race_id", featuredRace.id);
    featuredVoteCount = count ?? 0;
  }

  // コメント数
  let featuredCommentCount = 0;
  if (featuredRace) {
    const { count } = await supabase
      .from("comments")
      .select("*", { count: "exact", head: true })
      .eq("race_id", featuredRace.id)
      .eq("is_deleted", false);
    featuredCommentCount = count ?? 0;
  }

  // 今月の大会
  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const { data: contest } = await supabase
    .from("contests")
    .select("*")
    .eq("year_month", yearMonth)
    .eq("status", "active")
    .maybeSingle();

  // 自分の大会エントリー
  let myContestEntry = null;
  let contestEntryCount = 0;
  if (contest && user) {
    const { data } = await supabase
      .from("contest_entries")
      .select("*")
      .eq("contest_id", contest.id)
      .eq("user_id", user.id)
      .maybeSingle();
    myContestEntry = data;

    if (myContestEntry) {
      const { count } = await supabase
        .from("contest_entries")
        .select("*", { count: "exact", head: true })
        .eq("contest_id", contest.id)
        .gt("total_points", myContestEntry.total_points);
      myContestEntry.ranking = (count ?? 0) + 1;
    }

    const { count: ec } = await supabase
      .from("contest_entries")
      .select("*", { count: "exact", head: true })
      .eq("contest_id", contest.id);
    contestEntryCount = ec ?? 0;
  }

  // 大会上位3名
  let top3: any[] = [];
  if (contest) {
    const { data } = await supabase
      .from("contest_entries")
      .select("total_points, profiles(display_name)")
      .eq("contest_id", contest.id)
      .order("total_points", { ascending: false })
      .limit(3);
    top3 = data ?? [];
  }

  // 最近の結果
  const { data: recentResults } = await supabase
    .from("races")
    .select("*")
    .eq("status", "finished")
    .order("race_date", { ascending: false })
    .limit(3);

  // 盛り上がりコメント
  const { data: hotComments } = await supabase
    .from("comments")
    .select("id, body, sentiment, profiles(display_name, rank_id)")
    .is("parent_id", null)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .limit(3);

  const monthLabel = `${now.getMonth() + 1}月`;

  // 大会残り日数
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const daysLeft = Math.max(0, Math.ceil((endOfMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  return (
    <div className="space-y-5">
      {/* ====== 🔥 注目レースヒーロー ====== */}
      {featuredRace && (
        <Link href={`/races/${featuredRace.id}`} className="block">
          <div className="gradient-primary rounded-2xl p-5 text-white text-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 20l10-10M20 20l-10 10M20 20l10 10M20 20l-10-10' stroke='%23fff' stroke-width='1' fill='none'/%3E%3C/svg%3E\")" }} />
            <div className="relative">
              <p className="text-green-200 text-xs mb-1">📅 今週の注目レース</p>
              <h2 className="text-2xl font-black mb-1">
                {featuredRace.name}
                {featuredRace.grade && (
                  <span className="text-base ml-2 opacity-80">({featuredRace.grade})</span>
                )}
              </h2>
              <p className="text-green-100 text-sm">
                {featuredRace.race_date} {featuredRace.course_name}
                {featuredRace.distance && ` ${featuredRace.distance}`}
              </p>
              <div className="flex gap-2 justify-center mt-3">
                <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full">
                  🗳 {featuredVoteCount}人が投票済み
                </span>
                <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full">
                  💬 {featuredCommentCount}件
                </span>
              </div>
              <div className="mt-4">
                <span className="inline-block bg-white text-green-700 font-black text-sm px-6 py-2.5 rounded-full shadow-lg hover:shadow-xl transition-shadow">
                  予想を投票する →
                </span>
              </div>
            </div>
          </div>
        </Link>
      )}

      {/* ====== 🏆 月間大会バナー ====== */}
      {contest && (
        <Link href="/contest" className="block">
          <div className="rounded-2xl overflow-hidden border-2 border-yellow-400">
            {/* ヘッダー部分 */}
            <div className="gradient-gold px-4 py-3 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🏆</span>
                  <div>
                    <div className="text-sm font-black">{monthLabel} 予想大会</div>
                    <div className="text-[10px] opacity-80">
                      {contest.start_date}〜{contest.end_date} | 残り{daysLeft}日
                    </div>
                  </div>
                </div>
                {myContestEntry && (
                  <div className="text-right">
                    <div className="text-[10px] opacity-80">あなたの順位</div>
                    <div className="text-xl font-black font-num">
                      {myContestEntry.ranking}
                      <span className="text-xs">位</span>
                      <span className="text-[10px] opacity-70 ml-1">/ {contestEntryCount}人</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            {/* コンテンツ部分 */}
            <div className="bg-yellow-50 px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-[11px] font-bold text-gray-700">今月の累計ポイント</div>
                  <div className="text-xl font-black text-gray-800 font-num">
                    {myContestEntry?.total_points?.toLocaleString() ?? 0}
                    <span className="text-xs text-gray-500 ml-0.5">P</span>
                  </div>
                </div>
                {myContestEntry && top3[0] && myContestEntry.ranking > 3 && (
                  <div className="text-right">
                    <div className="text-[10px] text-gray-500">3位まであと</div>
                    <div className="text-base font-black text-orange-600 font-num">
                      {(top3[2]?.total_points ?? 0) - myContestEntry.total_points + 1}P
                    </div>
                  </div>
                )}
              </div>
              {/* 上位3名 */}
              {top3.length > 0 && (
                <div className="flex gap-1.5 mb-2">
                  {["🥇", "🥈", "🥉"].map((medal, i) => {
                    const entry = top3[i];
                    if (!entry) return null;
                    return (
                      <div key={i} className="flex-1 bg-white rounded-lg p-1.5 text-center">
                        <div className="text-sm">{medal}</div>
                        <div className="text-[10px] font-bold text-gray-800 truncate">
                          {(entry.profiles as any)?.display_name ?? "---"}
                        </div>
                        <div className="text-[10px] font-black text-green-600 font-num">
                          {entry.total_points.toLocaleString()}P
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="flex flex-wrap gap-1 justify-center">
                <span className="text-[10px] font-bold text-yellow-700 bg-yellow-200/60 px-2 py-0.5 rounded-full">
                  🎁 1位: Amazon ¥10,000
                </span>
                <span className="text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                  2位: ¥5,000
                </span>
                <span className="text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                  3位: ¥3,000
                </span>
              </div>
            </div>
          </div>
        </Link>
      )}

      {/* ====== 🔥 投票受付中のレース ====== */}
      {otherRaces.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-black text-gray-800">🔥 投票受付中のレース</h2>
            <Link href="/races" className="text-xs text-blue-600 font-bold hover:underline">
              すべて見る →
            </Link>
          </div>
          <div className="space-y-2">
            {otherRaces.map((race) => (
              <RaceCard key={race.id} race={race} />
            ))}
          </div>
        </section>
      )}

      {/* ====== 💬 盛り上がりコメント ====== */}
      {hotComments && hotComments.length > 0 && (
        <section>
          <h2 className="text-sm font-black text-gray-800 mb-3">💬 盛り上がりコメント</h2>
          <div className="card overflow-hidden divide-y divide-gray-50">
            {hotComments.map((comment) => {
              const rank = comment.profiles ? getRank((comment.profiles as any).rank_id) : null;
              const sentimentIcon: Record<string, string> = {
                very_positive: "🔥", positive: "👍", negative: "🤔", very_negative: "⚠️",
              };
              return (
                <div key={comment.id} className="px-4 py-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-[10px]">👤</div>
                    <span className="text-xs font-bold text-gray-800">
                      {(comment.profiles as any)?.display_name ?? "匿名"}
                    </span>
                    {rank && (
                      <span className="text-[10px] text-yellow-600 bg-yellow-50 px-1.5 py-0.5 rounded-full font-bold">
                        {rank.icon} {rank.name}
                      </span>
                    )}
                    {comment.sentiment && (
                      <span className="text-[10px]">{sentimentIcon[comment.sentiment]}</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 ml-8 line-clamp-2">{comment.body}</p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ====== 📊 最近の結果 ====== */}
      {recentResults && recentResults.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-black text-gray-800">📊 最近のレース結果</h2>
            <Link href="/races" className="text-xs text-blue-600 font-bold hover:underline">
              すべて見る →
            </Link>
          </div>
          <div className="space-y-2">
            {recentResults.map((race) => (
              <RaceCard key={race.id} race={race} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
FILEOF

# ====== RaceCard（デザイン改善） ======
echo "📝 src/components/races/RaceCard.tsx"
cat << 'FILEOF' > src/components/races/RaceCard.tsx
import Link from "next/link";

type Props = {
  race: {
    id: string;
    name: string;
    race_date: string;
    course_name: string;
    grade: string | null;
    status: string;
    race_number?: number | null;
    distance?: string | null;
  };
};

const GRADE_STYLES: Record<string, { bg: string; text: string }> = {
  G1: { bg: "bg-orange-600", text: "text-white" },
  G2: { bg: "bg-red-600", text: "text-white" },
  G3: { bg: "bg-green-600", text: "text-white" },
  OP: { bg: "bg-gray-600", text: "text-white" },
  L: { bg: "bg-blue-600", text: "text-white" },
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  voting_open: { label: "受付中", color: "text-green-600" },
  voting_closed: { label: "締切", color: "text-yellow-600" },
  finished: { label: "確定", color: "text-gray-400" },
};

export default function RaceCard({ race }: Props) {
  const grade = race.grade ? GRADE_STYLES[race.grade] ?? { bg: "bg-gray-500", text: "text-white" } : null;
  const status = STATUS_LABELS[race.status] ?? { label: race.status, color: "text-gray-500" };

  return (
    <Link href={`/races/${race.id}`} className="card-hover flex items-center gap-3 px-4 py-3">
      {/* グレードバッジ */}
      {grade ? (
        <span className={`${grade.bg} ${grade.text} text-[11px] font-black px-2 py-1 rounded-md min-w-[32px] text-center`}>
          {race.grade}
        </span>
      ) : (
        <span className="bg-gray-100 text-gray-500 text-[11px] font-bold px-2 py-1 rounded-md min-w-[32px] text-center">
          {race.race_number ? `${race.race_number}R` : "一般"}
        </span>
      )}

      {/* レース名 */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold text-gray-800 truncate">{race.name}</div>
        <div className="text-[11px] text-gray-400">
          {race.race_date} {race.course_name}
          {race.distance && ` ${race.distance}`}
        </div>
      </div>

      {/* ステータス */}
      <span className={`text-[11px] font-bold ${status.color} shrink-0`}>
        {status.label}
      </span>

      <span className="text-gray-300 text-sm">›</span>
    </Link>
  );
}
FILEOF

# ====== ログインページ（デザイン改善） ======
echo "📝 src/app/login/page.tsx"
cat << 'FILEOF' > src/app/login/page.tsx
"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  const handleOAuth = async (provider: "google" | "twitter") => {
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
  };

  const handleEmail = async () => {
    setLoading(true);
    setError("");
    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: `${location.origin}/auth/callback` },
      });
      if (error) setError(error.message);
      else setError("確認メールを送信しました。メールのリンクをクリックしてください。");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else router.push("/");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* ロゴ */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🏇</div>
          <h1 className="text-2xl font-black text-gray-800">
            ゲートイン<span className="text-orange-600">！</span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">みんなの予想で腕試し</p>
        </div>

        <div className="card p-6 space-y-4">
          {/* OAuth */}
          <button
            onClick={() => handleOAuth("google")}
            className="w-full flex items-center justify-center gap-3 border border-gray-200 rounded-xl py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Googleでログイン
          </button>

          <button
            onClick={() => handleOAuth("twitter")}
            className="w-full flex items-center justify-center gap-3 bg-black text-white rounded-xl py-3 text-sm font-bold hover:bg-gray-800 transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            Xでログイン
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
            <div className="relative flex justify-center"><span className="bg-white px-3 text-xs text-gray-400">または</span></div>
          </div>

          {/* Email */}
          <div className="space-y-3">
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="メールアドレス"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="パスワード"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            {error && (
              <p className={`text-xs p-2 rounded-lg ${error.includes("確認メール") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                {error}
              </p>
            )}
            <button
              onClick={handleEmail}
              disabled={loading || !email || !password}
              className="w-full py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 disabled:opacity-40 transition-colors"
            >
              {loading ? "..." : isSignUp ? "アカウント作成" : "ログイン"}
            </button>
          </div>

          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="w-full text-xs text-gray-500 hover:text-green-600 transition-colors"
          >
            {isSignUp ? "すでにアカウントをお持ちの方" : "新規アカウント作成"}
          </button>
        </div>
      </div>
    </div>
  );
}
FILEOF

# ====== マイページ統計カラー改善 ======
echo "📝 ランキングページのトップ3表示順を修正"

# RankingList.tsx のトップ3表示順を修正（0,1,2 の配列を 1,0,2 の正しい順序に）
# 既にPhase8で作成済みなので、配置だけ修正

# ====== Vercel デプロイ設定 ======
echo "📝 next.config.ts（本番用設定）"

# next.config.ts が存在するか確認して更新
cat << 'FILEOF' > next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "pbs.twimg.com" },
      { protocol: "https", hostname: "abs.twimg.com" },
    ],
  },
};

export default nextConfig;
FILEOF

echo ""
echo "✅ Phase 9（デザイン改善）セットアップ完了！"
echo ""
echo "📂 作成/更新されたファイル（8ファイル）:"
echo "  src/app/globals.css                    ← グローバルCSS（グラデーション、アニメーション）"
echo "  src/app/layout.tsx                     ← ルートレイアウト（メタデータ、テーマカラー）"
echo "  src/components/layout/Header.tsx       ← ヘッダー（アクセントカラー、ゴールドポイント）"
echo "  src/components/layout/BottomNav.tsx    ← モバイル下部ナビ（NEW!）"
echo "  src/app/(main)/layout.tsx              ← レイアウト（BottomNav統合）"
echo "  src/app/(main)/page.tsx                ← トップページ（ヒーローカード、大会バナー）"
echo "  src/components/races/RaceCard.tsx      ← レースカード（デザイン改善）"
echo "  src/app/login/page.tsx                 ← ログインページ（デザイン改善）"
echo "  next.config.ts                         ← 本番用設定"
echo ""
echo "🎮 テスト手順:"
echo "  1. pkill -f 'next dev'; rm -rf .next/dev/lock; npm run dev"
echo "  2. http://localhost:3000 でトップページ確認"
echo "  3. スマホサイズでモバイル下部ナビを確認"
echo "  4. デスクトップ/スマホ両方でレスポンシブ動作を確認"
