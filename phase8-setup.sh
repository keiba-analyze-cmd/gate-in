#!/bin/bash
# ============================================
# ゲートイン！ Phase 8 セットアップスクリプト
# 月間大会・ランキング
# gate-in フォルダ内で実行してください
# ============================================

echo "🏇 ゲートイン！ Phase 8（月間大会・ランキング）セットアップを開始します..."
echo ""

# ディレクトリ作成
echo "📁 フォルダを作成中..."
mkdir -p src/app/api/contests
mkdir -p src/app/api/rankings
mkdir -p src/app/\(main\)/rankings
mkdir -p src/app/\(main\)/contest
mkdir -p src/components/rankings

# ====== ランキングAPI ======
echo "📝 src/app/api/rankings/route.ts"
cat << 'FILEOF' > src/app/api/rankings/route.ts
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "monthly"; // monthly, cumulative, hit_rate, streak
  const limit = parseInt(searchParams.get("limit") ?? "50");

  let query;

  switch (type) {
    case "cumulative":
      query = supabase
        .from("profiles")
        .select("id, display_name, avatar_url, rank_id, cumulative_points, total_votes, win_hits")
        .gt("total_votes", 0)
        .order("cumulative_points", { ascending: false })
        .limit(limit);
      break;

    case "hit_rate":
      query = supabase
        .from("profiles")
        .select("id, display_name, avatar_url, rank_id, cumulative_points, total_votes, win_hits")
        .gte("total_votes", 5) // 最低5投票
        .order("win_hits", { ascending: false })
        .limit(limit);
      break;

    case "streak":
      query = supabase
        .from("profiles")
        .select("id, display_name, avatar_url, rank_id, cumulative_points, best_streak, current_streak")
        .gt("best_streak", 0)
        .order("best_streak", { ascending: false })
        .limit(limit);
      break;

    default: // monthly
      query = supabase
        .from("profiles")
        .select("id, display_name, avatar_url, rank_id, monthly_points, total_votes, win_hits")
        .gt("monthly_points", 0)
        .order("monthly_points", { ascending: false })
        .limit(limit);
      break;
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 的中率を計算して返す
  const rankings = (data ?? []).map((profile, index) => ({
    rank: index + 1,
    ...profile,
    hit_rate: profile.total_votes > 0
      ? Math.round((profile.win_hits / profile.total_votes) * 1000) / 10
      : 0,
  }));

  return NextResponse.json({ type, rankings });
}
FILEOF

# ====== 大会API ======
echo "📝 src/app/api/contests/route.ts"
cat << 'FILEOF' > src/app/api/contests/route.ts
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { searchParams } = new URL(request.url);
  const yearMonth = searchParams.get("month");

  // 指定月 or 今月の大会を取得
  let contestQuery = supabase
    .from("contests")
    .select("*");

  if (yearMonth) {
    contestQuery = contestQuery.eq("year_month", yearMonth);
  } else {
    contestQuery = contestQuery.eq("status", "active");
  }

  const { data: contests } = await contestQuery.order("year_month", { ascending: false }).limit(1);
  const contest = contests?.[0];

  if (!contest) {
    return NextResponse.json({ contest: null, entries: [], my_entry: null });
  }

  // ランキング（上位50名）
  const { data: entries } = await supabase
    .from("contest_entries")
    .select("*, profiles(display_name, avatar_url, rank_id)")
    .eq("contest_id", contest.id)
    .order("total_points", { ascending: false })
    .limit(50);

  // 自分のエントリー
  let myEntry = null;
  if (user) {
    const { data } = await supabase
      .from("contest_entries")
      .select("*")
      .eq("contest_id", contest.id)
      .eq("user_id", user.id)
      .maybeSingle();
    myEntry = data;

    // 自分の順位を計算
    if (myEntry) {
      const { count } = await supabase
        .from("contest_entries")
        .select("*", { count: "exact", head: true })
        .eq("contest_id", contest.id)
        .gt("total_points", myEntry.total_points);
      myEntry.ranking = (count ?? 0) + 1;
    }
  }

  return NextResponse.json({
    contest,
    entries: (entries ?? []).map((e, i) => ({ ...e, ranking: i + 1 })),
    my_entry: myEntry,
  });
}
FILEOF

# ====== ランキングページ ======
echo "📝 src/app/(main)/rankings/page.tsx"
cat << 'FILEOF' > src/app/\(main\)/rankings/page.tsx
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import RankingTabs from "@/components/rankings/RankingTabs";

export default async function RankingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h1 className="text-xl font-bold text-gray-800">🏆 ランキング</h1>
      <RankingTabs currentUserId={user.id} />
    </div>
  );
}
FILEOF

# ====== RankingTabs.tsx ======
echo "📝 src/components/rankings/RankingTabs.tsx"
cat << 'FILEOF' > src/components/rankings/RankingTabs.tsx
"use client";

import { useEffect, useState } from "react";
import RankingList from "./RankingList";

type Props = {
  currentUserId: string;
};

const TABS = [
  { key: "monthly", label: "📅 月間", desc: "今月のポイントランキング" },
  { key: "cumulative", label: "👑 累計", desc: "累計ポイントランキング" },
  { key: "hit_rate", label: "🎯 的中率", desc: "1着的中数ランキング（5投票以上）" },
  { key: "streak", label: "🔥 連続", desc: "最長連続的中ランキング" },
];

export default function RankingTabs({ currentUserId }: Props) {
  const [activeTab, setActiveTab] = useState("monthly");
  const [rankings, setRankings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/rankings?type=${activeTab}`)
      .then((res) => res.json())
      .then((data) => {
        setRankings(data.rankings ?? []);
        setLoading(false);
      });
  }, [activeTab]);

  const currentTab = TABS.find((t) => t.key === activeTab);

  return (
    <div>
      {/* タブ */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === tab.key
                ? "bg-green-600 text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:border-green-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 説明 */}
      {currentTab && (
        <p className="text-xs text-gray-400 mb-3">{currentTab.desc}</p>
      )}

      {/* ランキングリスト */}
      {loading ? (
        <div className="bg-white rounded-xl p-8 text-center text-gray-400 text-sm">
          読み込み中...
        </div>
      ) : rankings.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center text-gray-400 text-sm">
          まだランキングデータがありません
        </div>
      ) : (
        <RankingList
          rankings={rankings}
          type={activeTab}
          currentUserId={currentUserId}
        />
      )}
    </div>
  );
}
FILEOF

# ====== RankingList.tsx ======
echo "📝 src/components/rankings/RankingList.tsx"
cat << 'FILEOF' > src/components/rankings/RankingList.tsx
import Link from "next/link";
import { getRank } from "@/lib/constants/ranks";

type RankingEntry = {
  rank: number;
  id: string;
  display_name: string;
  avatar_url: string | null;
  rank_id: string;
  cumulative_points?: number;
  monthly_points?: number;
  total_votes?: number;
  win_hits?: number;
  hit_rate?: number;
  best_streak?: number;
  current_streak?: number;
};

type Props = {
  rankings: RankingEntry[];
  type: string;
  currentUserId: string;
};

const MEDAL = ["🥇", "🥈", "🥉"];

export default function RankingList({ rankings, type, currentUserId }: Props) {
  // 上位3名を特別表示
  const top3 = rankings.slice(0, 3);
  const rest = rankings.slice(3);

  return (
    <div className="space-y-3">
      {/* 🏆 トップ3 */}
      {top3.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {[1, 0, 2].map((idx) => {
            const entry = top3[idx];
            if (!entry) return <div key={idx} />;
            const userRank = getRank(entry.rank_id);
            const isMe = entry.id === currentUserId;
            return (
              <Link
                key={entry.id}
                href={`/users/${entry.id}`}
                className={`bg-white rounded-2xl border p-4 text-center transition-all hover:shadow-md ${
                  idx === 0 ? "border-yellow-300 bg-yellow-50/50 -mt-2 pb-6" :
                  idx === 1 ? "border-gray-200" :
                  "border-orange-200 bg-orange-50/30"
                } ${isMe ? "ring-2 ring-green-400" : ""}`}
              >
                <div className="text-2xl mb-1">{MEDAL[entry.rank - 1]}</div>
                {entry.avatar_url ? (
                  <img src={entry.avatar_url} alt="" className={`mx-auto rounded-full mb-2 ${idx === 0 ? "w-16 h-16" : "w-12 h-12"}`} />
                ) : (
                  <div className={`mx-auto rounded-full bg-green-100 flex items-center justify-center mb-2 ${idx === 0 ? "w-16 h-16 text-2xl" : "w-12 h-12 text-lg"}`}>🏇</div>
                )}
                <div className="text-sm font-bold text-gray-800 truncate">{entry.display_name}</div>
                <div className="text-xs text-gray-400">{userRank.icon} {userRank.name}</div>
                <div className="text-lg font-bold text-green-600 mt-1">
                  {getValueDisplay(entry, type)}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* 4位以降 */}
      {rest.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {rest.map((entry) => {
            const userRank = getRank(entry.rank_id);
            const isMe = entry.id === currentUserId;
            return (
              <Link
                key={entry.id}
                href={`/users/${entry.id}`}
                className={`flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors ${
                  isMe ? "bg-green-50/50" : ""
                }`}
              >
                <span className={`w-8 text-center text-sm font-bold ${
                  entry.rank <= 10 ? "text-green-600" : "text-gray-400"
                }`}>
                  {entry.rank}
                </span>
                {entry.avatar_url ? (
                  <img src={entry.avatar_url} alt="" className="w-9 h-9 rounded-full" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-sm">🏇</div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-gray-800 truncate">
                    {entry.display_name}
                    {isMe && <span className="text-xs text-green-600 ml-1">（あなた）</span>}
                  </div>
                  <div className="text-xs text-gray-400">{userRank.icon} {userRank.name}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-bold text-green-600">
                    {getValueDisplay(entry, type)}
                  </div>
                  {type !== "streak" && entry.hit_rate !== undefined && (
                    <div className="text-xs text-gray-400">的中率 {entry.hit_rate}%</div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function getValueDisplay(entry: any, type: string): string {
  switch (type) {
    case "monthly":
      return `${entry.monthly_points?.toLocaleString() ?? 0} P`;
    case "cumulative":
      return `${entry.cumulative_points?.toLocaleString() ?? 0} P`;
    case "hit_rate":
      return `${entry.win_hits ?? 0}回的中`;
    case "streak":
      return `${entry.best_streak ?? 0}連続`;
    default:
      return "";
  }
}
FILEOF

# ====== 月間大会ページ ======
echo "📝 src/app/(main)/contest/page.tsx"
cat << 'FILEOF' > src/app/\(main\)/contest/page.tsx
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ContestBoard from "@/components/rankings/ContestBoard";

export default async function ContestPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h1 className="text-xl font-bold text-gray-800">🎪 月間大会</h1>
      <ContestBoard currentUserId={user.id} />
    </div>
  );
}
FILEOF

# ====== ContestBoard.tsx ======
echo "📝 src/components/rankings/ContestBoard.tsx"
cat << 'FILEOF' > src/components/rankings/ContestBoard.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getRank } from "@/lib/constants/ranks";

type Contest = {
  id: string;
  name: string;
  year_month: string;
  status: string;
  min_votes: number;
  prize_description: string | null;
};

type Entry = {
  ranking: number;
  user_id: string;
  total_points: number;
  vote_count: number;
  is_eligible: boolean;
  profiles: {
    display_name: string;
    avatar_url: string | null;
    rank_id: string;
  } | null;
};

type MyEntry = {
  total_points: number;
  vote_count: number;
  is_eligible: boolean;
  ranking: number;
};

type Props = {
  currentUserId: string;
};

const MEDAL = ["🥇", "🥈", "🥉"];

export default function ContestBoard({ currentUserId }: Props) {
  const [contest, setContest] = useState<Contest | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [myEntry, setMyEntry] = useState<MyEntry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/contests")
      .then((res) => res.json())
      .then((data) => {
        setContest(data.contest);
        setEntries(data.entries ?? []);
        setMyEntry(data.my_entry);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="bg-white rounded-xl p-8 text-center text-gray-400 text-sm">読み込み中...</div>;
  }

  if (!contest) {
    return (
      <div className="bg-white rounded-xl p-8 text-center">
        <div className="text-4xl mb-3">🎪</div>
        <p className="text-gray-500">現在開催中の大会はありません</p>
        <p className="text-xs text-gray-400 mt-1">大会は毎月自動的に開始されます</p>
      </div>
    );
  }

  const monthLabel = (() => {
    const [y, m] = contest.year_month.split("-");
    return `${y}年${parseInt(m)}月`;
  })();

  return (
    <div className="space-y-4">
      {/* 大会ヘッダー */}
      <div className="bg-gradient-to-br from-purple-600 to-purple-500 rounded-2xl p-6 text-white">
        <div className="text-xs text-purple-200 mb-1">🎪 月間大会</div>
        <h2 className="text-xl font-bold mb-1">{contest.name || `${monthLabel} 予想バトル`}</h2>
        <p className="text-sm text-purple-100 mb-4">
          {contest.prize_description || `月間ポイントランキング上位者にAmazonギフト券！\n1位: ¥10,000 / 2位: ¥5,000 / 3位: ¥3,000`}
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <div className="text-xs text-purple-200">参加条件</div>
            <div className="font-bold">{contest.min_votes}投票以上</div>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <div className="text-xs text-purple-200">参加者数</div>
            <div className="font-bold">{entries.length}人</div>
          </div>
        </div>
      </div>

      {/* 自分の順位 */}
      {myEntry && (
        <div className={`rounded-2xl border-2 p-4 ${
          myEntry.is_eligible
            ? "border-green-300 bg-green-50"
            : "border-yellow-300 bg-yellow-50"
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-bold text-gray-800">
                あなたの順位: {myEntry.ranking <= 3 ? MEDAL[myEntry.ranking - 1] : ""} {myEntry.ranking}位
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                {myEntry.total_points} P / {myEntry.vote_count}投票
              </div>
            </div>
            {myEntry.is_eligible ? (
              <span className="text-xs bg-green-200 text-green-800 px-3 py-1 rounded-full font-bold">
                ✅ 参加資格あり
              </span>
            ) : (
              <span className="text-xs bg-yellow-200 text-yellow-800 px-3 py-1 rounded-full font-bold">
                あと{contest.min_votes - myEntry.vote_count}投票で参加資格
              </span>
            )}
          </div>
        </div>
      )}

      {!myEntry && (
        <div className="bg-gray-50 rounded-2xl border border-gray-200 p-4 text-center">
          <p className="text-sm text-gray-500">レースに投票すると自動的に大会に参加できます</p>
          <Link href="/races" className="text-sm text-green-600 hover:underline mt-1 inline-block">
            レース一覧へ →
          </Link>
        </div>
      )}

      {/* ランキング */}
      {entries.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 pt-4 pb-2">
            <h3 className="font-bold text-gray-800">📊 大会ランキング</h3>
          </div>
          {entries.map((entry) => {
            const userRank = entry.profiles ? getRank(entry.profiles.rank_id) : null;
            const isMe = entry.user_id === currentUserId;
            return (
              <Link
                key={entry.user_id}
                href={`/users/${entry.user_id}`}
                className={`flex items-center gap-3 px-5 py-3 border-t border-gray-50 hover:bg-gray-50 transition-colors ${
                  isMe ? "bg-green-50/50" : ""
                }`}
              >
                <span className="w-8 text-center">
                  {entry.ranking <= 3 ? (
                    <span className="text-lg">{MEDAL[entry.ranking - 1]}</span>
                  ) : (
                    <span className={`text-sm font-bold ${entry.ranking <= 10 ? "text-green-600" : "text-gray-400"}`}>
                      {entry.ranking}
                    </span>
                  )}
                </span>
                {entry.profiles?.avatar_url ? (
                  <img src={entry.profiles.avatar_url} alt="" className="w-9 h-9 rounded-full" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-sm">🏇</div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-gray-800 truncate">
                    {entry.profiles?.display_name ?? "匿名"}
                    {isMe && <span className="text-xs text-green-600 ml-1">（あなた）</span>}
                  </div>
                  <div className="text-xs text-gray-400">
                    {userRank && `${userRank.icon} `}{entry.vote_count}投票
                    {!entry.is_eligible && " ⚠️未資格"}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-bold text-purple-600">{entry.total_points.toLocaleString()} P</div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
FILEOF

# ====== ヘッダー更新（ランキング追加） ======
echo "📝 ヘッダーを更新（ランキング追加）"
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

  // 未読通知数
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
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-4 h-14">
        <Link href="/" className="text-xl font-bold text-green-600 shrink-0">
          🏇 ゲートイン！
        </Link>

        <nav className="hidden md:flex items-center gap-1 ml-8">
          <NavLink href="/">トップ</NavLink>
          <NavLink href="/races">レース</NavLink>
          <NavLink href="/rankings">ランキング</NavLink>
          <NavLink href="/contest">大会</NavLink>
          <NavLink href="/timeline">TL</NavLink>
        </nav>

        <div className="flex items-center gap-2">
          {profile && user ? (
            <>
              {/* 通知 */}
              <Link
                href="/notifications"
                className="relative p-2 text-gray-500 hover:text-green-600 transition-colors"
              >
                🔔
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>

              {/* ポイント */}
              <Link
                href="/mypage"
                className="hidden sm:flex items-center gap-2 bg-green-50 px-3 py-1.5 rounded-full hover:bg-green-100 transition-colors"
              >
                <span className="text-xs">{rank?.icon}</span>
                <span className="text-sm font-bold text-green-700">
                  {profile.cumulative_points} P
                </span>
              </Link>

              {/* ユーザー名 */}
              <Link
                href="/mypage"
                className="text-sm text-gray-600 hidden sm:block hover:text-green-600"
              >
                {profile.display_name}
              </Link>

              <LogoutButton />
            </>
          ) : (
            <Link href="/login" className="text-sm bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
              ログイン
            </Link>
          )}
        </div>
      </div>

      {/* モバイルナビ */}
      {user && (
        <nav className="md:hidden flex border-t border-gray-100">
          <MobileNavLink href="/">トップ</MobileNavLink>
          <MobileNavLink href="/races">レース</MobileNavLink>
          <MobileNavLink href="/rankings">🏆</MobileNavLink>
          <MobileNavLink href="/timeline">TL</MobileNavLink>
          <MobileNavLink href="/mypage">マイ</MobileNavLink>
        </nav>
      )}
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors">
      {children}
    </Link>
  );
}

function MobileNavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="flex-1 text-center py-2.5 text-sm font-medium text-gray-600 hover:text-green-600 hover:bg-green-50 transition-colors">
      {children}
    </Link>
  );
}
FILEOF

# ====== 今月の大会データを作成するSQL（手動で実行） ======
echo ""
echo "================================================="
echo "📌 Supabase SQL Editor で以下を実行してください："
echo "================================================="
echo ""
cat << 'SQLEOF'
-- 今月の大会を作成
INSERT INTO contests (name, year_month, status, min_votes, prize_description)
VALUES (
  '2月予想バトル',
  to_char(now(), 'YYYY-MM'),
  'active',
  3,
  '1位: Amazonギフト¥10,000 / 2位: ¥5,000 / 3位: ¥3,000'
)
ON CONFLICT DO NOTHING;

-- contest_entries の SELECT ポリシー追加
DROP POLICY IF EXISTS "contest_entries_select" ON contest_entries;
CREATE POLICY "contest_entries_select" ON contest_entries
  FOR SELECT USING (true);

-- contests の SELECT ポリシー追加
DROP POLICY IF EXISTS "contests_select" ON contests;
CREATE POLICY "contests_select" ON contests
  FOR SELECT USING (true);
SQLEOF

echo ""
echo "✅ Phase 8 セットアップ完了！"
echo ""
echo "📂 作成されたファイル（8ファイル）:"
echo "  src/app/api/rankings/route.ts              ← ランキングAPI"
echo "  src/app/api/contests/route.ts              ← 大会API"
echo "  src/app/(main)/rankings/page.tsx           ← ランキングページ"
echo "  src/app/(main)/contest/page.tsx            ← 月間大会ページ"
echo "  src/components/rankings/RankingTabs.tsx     ← ランキングタブ"
echo "  src/components/rankings/RankingList.tsx     ← ランキングリスト"
echo "  src/components/rankings/ContestBoard.tsx    ← 大会ボード"
echo "  src/components/layout/Header.tsx           ← ヘッダー更新"
echo ""
echo "🎮 テスト手順:"
echo "  1. 上記のSQLをSupabaseで実行（大会データ作成）"
echo "  2. pkill -f 'next dev'; rm -rf .next/dev/lock; npm run dev"
echo ""
echo "  【ランキング】"
echo "  3. ヘッダー「ランキング」→ 月間/累計/的中率/連続タブ"
echo "  4. 自分の順位がハイライト表示される"
echo ""
echo "  【月間大会】"
echo "  5. ヘッダー「大会」→ 月間大会ページ"
echo "  6. 賞品情報・参加条件・自分の順位・全体ランキング"
