#!/bin/bash
# ============================================
# ゲートイン！ Phase 2 セットアップスクリプト
# gate-in フォルダ内で実行してください
# ============================================

echo "🏇 ゲートイン！ Phase 2 セットアップを開始します..."
echo ""

# ディレクトリ作成
echo "📁 フォルダを作成中..."
mkdir -p src/app/\(main\)
mkdir -p src/app/\(main\)/races
mkdir -p src/app/\(main\)/races/\[raceId\]
mkdir -p src/components/races
mkdir -p src/components/layout
mkdir -p src/lib/constants

# ====== src/lib/constants/ranks.ts ======
echo "📝 src/lib/constants/ranks.ts"
cat << 'FILEOF' > src/lib/constants/ranks.ts
export const RANKS = [
  { id: "beginner_1", name: "ビギナー Ⅰ", icon: "🔰", tier: "ビギナー", threshold: 0 },
  { id: "beginner_2", name: "ビギナー Ⅱ", icon: "🔰", tier: "ビギナー", threshold: 50 },
  { id: "beginner_3", name: "ビギナー Ⅲ", icon: "🔰", tier: "ビギナー", threshold: 100 },
  { id: "beginner_4", name: "ビギナー Ⅳ", icon: "🔰", tier: "ビギナー", threshold: 200 },
  { id: "beginner_5", name: "ビギナー Ⅴ", icon: "🔰", tier: "ビギナー", threshold: 350 },
  { id: "forecaster_1", name: "予想士 Ⅰ", icon: "⭐", tier: "予想士", threshold: 500 },
  { id: "forecaster_2", name: "予想士 Ⅱ", icon: "⭐", tier: "予想士", threshold: 800 },
  { id: "forecaster_3", name: "予想士 Ⅲ", icon: "⭐", tier: "予想士", threshold: 1200 },
  { id: "forecaster_4", name: "予想士 Ⅳ", icon: "⭐", tier: "予想士", threshold: 2000 },
  { id: "forecaster_5", name: "予想士 Ⅴ", icon: "⭐", tier: "予想士", threshold: 2500 },
  { id: "advanced_1", name: "上級予想士 Ⅰ", icon: "⭐⭐", tier: "上級予想士", threshold: 3000 },
  { id: "advanced_2", name: "上級予想士 Ⅱ", icon: "⭐⭐", tier: "上級予想士", threshold: 4500 },
  { id: "advanced_3", name: "上級予想士 Ⅲ", icon: "⭐⭐", tier: "上級予想士", threshold: 6500 },
  { id: "advanced_4", name: "上級予想士 Ⅳ", icon: "⭐⭐", tier: "上級予想士", threshold: 9000 },
  { id: "advanced_5", name: "上級予想士 Ⅴ", icon: "⭐⭐", tier: "上級予想士", threshold: 12000 },
  { id: "master_1", name: "予想マスター Ⅰ", icon: "👑", tier: "予想マスター", threshold: 15000 },
  { id: "master_2", name: "予想マスター Ⅱ", icon: "👑", tier: "予想マスター", threshold: 22000 },
  { id: "master_3", name: "予想マスター Ⅲ", icon: "👑", tier: "予想マスター", threshold: 35000 },
  { id: "master_4", name: "予想マスター Ⅳ", icon: "👑", tier: "予想マスター", threshold: 55000 },
  { id: "master_5", name: "予想マスター Ⅴ", icon: "👑", tier: "予想マスター", threshold: 80000 },
  { id: "legend", name: "レジェンド", icon: "🏆", tier: "レジェンド", threshold: 100000 },
] as const;

export function getRank(rankId: string) {
  return RANKS.find((r) => r.id === rankId) ?? RANKS[0];
}

export function getNextRank(rankId: string) {
  const idx = RANKS.findIndex((r) => r.id === rankId);
  if (idx < 0 || idx >= RANKS.length - 1) return null;
  return RANKS[idx + 1];
}

export const POINT_RULES = {
  win: { 1: 50, 2: 100, 3: 100, 4: 200, 5: 200, 6: 200, 7: 350, 8: 350, 9: 350, default: 500 },
  place: 30,
  danger: 10,
  perfect: 300,
  streak3: 50,
  g1: 100,
} as const;

export function getWinPoints(popularity: number): number {
  const rules = POINT_RULES.win as Record<number | string, number>;
  return rules[popularity] ?? rules.default;
}
FILEOF

# ====== src/components/layout/Header.tsx ======
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

  const rank = profile ? getRank(profile.rank_id) : null;

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-4 h-14">
        {/* ロゴ */}
        <Link href="/" className="text-xl font-bold text-green-600 shrink-0">
          🏇 ゲートイン！
        </Link>

        {/* ナビゲーション */}
        <nav className="hidden md:flex items-center gap-1 ml-8">
          <NavLink href="/">トップ</NavLink>
          <NavLink href="/races">レース</NavLink>
        </nav>

        {/* 右側 */}
        <div className="flex items-center gap-3">
          {profile ? (
            <>
              <div className="hidden sm:flex items-center gap-2 bg-green-50 px-3 py-1.5 rounded-full">
                <span className="text-xs">{rank?.icon}</span>
                <span className="text-sm font-bold text-green-700">
                  {profile.cumulative_points} P
                </span>
              </div>
              <span className="text-sm text-gray-600 hidden sm:block">
                {profile.display_name}
              </span>
              <LogoutButton />
            </>
          ) : (
            <Link
              href="/login"
              className="text-sm bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            >
              ログイン
            </Link>
          )}
        </div>
      </div>

      {/* モバイルナビ */}
      <nav className="md:hidden flex border-t border-gray-100">
        <MobileNavLink href="/">トップ</MobileNavLink>
        <MobileNavLink href="/races">レース</MobileNavLink>
      </nav>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
    >
      {children}
    </Link>
  );
}

function MobileNavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex-1 text-center py-2.5 text-sm font-medium text-gray-600 hover:text-green-600 hover:bg-green-50 transition-colors"
    >
      {children}
    </Link>
  );
}
FILEOF

# ====== src/app/(main)/layout.tsx ======
echo "📝 src/app/(main)/layout.tsx"
cat << 'FILEOF' > src/app/\(main\)/layout.tsx
import Header from "@/components/layout/Header";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-6xl mx-auto p-4">{children}</main>
    </div>
  );
}
FILEOF

# ====== src/app/(main)/page.tsx（トップページ書き換え）======
echo "📝 src/app/(main)/page.tsx"
cat << 'FILEOF' > src/app/\(main\)/page.tsx
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import RaceCard from "@/components/races/RaceCard";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // 投票受付中のレース
  const { data: openRaces } = await supabase
    .from("races")
    .select("*")
    .eq("status", "voting_open")
    .order("post_time", { ascending: true })
    .limit(6);

  // 最近の結果
  const { data: finishedRaces } = await supabase
    .from("races")
    .select("*")
    .eq("status", "finished")
    .order("race_date", { ascending: false })
    .limit(4);

  // ニュース
  const { data: news } = await supabase
    .from("news")
    .select("*")
    .eq("is_published", true)
    .order("published_at", { ascending: false })
    .limit(3);

  return (
    <div className="space-y-6">
      {/* ウェルカムバナー */}
      <div className="bg-gradient-to-r from-green-600 to-green-500 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-1">
          ようこそ、{profile?.display_name ?? "ゲスト"}さん！
        </h1>
        <p className="text-green-100 text-sm">
          今週の重賞レースに投票して、ゲートPをゲットしよう！
        </p>
      </div>

      {/* 投票受付中 */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-800">🗳 投票受付中</h2>
          <Link href="/races" className="text-sm text-green-600 hover:underline">
            すべて見る →
          </Link>
        </div>
        {openRaces && openRaces.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {openRaces.map((race) => (
              <RaceCard key={race.id} race={race} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl p-8 text-center text-gray-400">
            現在投票受付中のレースはありません
          </div>
        )}
      </section>

      {/* 最近の結果 */}
      {finishedRaces && finishedRaces.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-gray-800 mb-3">📊 最近の結果</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {finishedRaces.map((race) => (
              <RaceCard key={race.id} race={race} />
            ))}
          </div>
        </section>
      )}

      {/* ニュース */}
      {news && news.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-gray-800 mb-3">📰 ニュース</h2>
          <div className="space-y-2">
            {news.map((item) => (
              <div key={item.id} className="bg-white rounded-xl p-4 border border-gray-100">
                <div className="text-xs text-gray-400 mb-1">
                  {new Date(item.published_at).toLocaleDateString("ja-JP")}
                </div>
                <h3 className="font-bold text-sm text-gray-800">{item.title}</h3>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.body}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
FILEOF

# ====== src/components/races/RaceCard.tsx ======
echo "📝 src/components/races/RaceCard.tsx"
cat << 'FILEOF' > src/components/races/RaceCard.tsx
import Link from "next/link";

type Race = {
  id: string;
  name: string;
  grade: string | null;
  race_date: string;
  post_time: string | null;
  course_name: string;
  track_type: string;
  distance: number;
  race_number: number;
  head_count: number | null;
  status: string;
};

export default function RaceCard({ race }: { race: Race }) {
  const gradeColor = getGradeColor(race.grade);
  const isOpen = race.status === "voting_open";
  const postTime = race.post_time
    ? new Date(race.post_time).toLocaleTimeString("ja-JP", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <Link
      href={`/races/${race.id}`}
      className="block bg-white rounded-xl border border-gray-100 hover:border-green-200 hover:shadow-sm transition-all p-4"
    >
      {/* 上部：グレード + ステータス */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {race.grade && (
            <span className={`text-xs font-bold px-2 py-0.5 rounded ${gradeColor}`}>
              {race.grade}
            </span>
          )}
          <span className="text-xs text-gray-400">
            {race.course_name} {race.race_number}R
          </span>
        </div>
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            isOpen
              ? "bg-green-100 text-green-700"
              : race.status === "finished"
              ? "bg-gray-100 text-gray-500"
              : "bg-yellow-100 text-yellow-700"
          }`}
        >
          {isOpen ? "受付中" : race.status === "finished" ? "確定" : "準備中"}
        </span>
      </div>

      {/* レース名 */}
      <h3 className="font-bold text-gray-800 mb-2">{race.name}</h3>

      {/* 情報行 */}
      <div className="flex items-center gap-3 text-xs text-gray-500">
        <span>{race.track_type} {race.distance}m</span>
        <span>{race.head_count ?? "?"}頭</span>
        {postTime && <span className="ml-auto">{postTime} 発走</span>}
      </div>
    </Link>
  );
}

function getGradeColor(grade: string | null): string {
  switch (grade) {
    case "G1": return "bg-yellow-100 text-yellow-800";
    case "G2": return "bg-red-100 text-red-700";
    case "G3": return "bg-green-100 text-green-700";
    case "OP": return "bg-blue-100 text-blue-700";
    case "L":  return "bg-purple-100 text-purple-700";
    default:   return "bg-gray-100 text-gray-600";
  }
}
FILEOF

# ====== src/app/(main)/races/page.tsx ======
echo "📝 src/app/(main)/races/page.tsx"
cat << 'FILEOF' > src/app/\(main\)/races/page.tsx
import { createClient } from "@/lib/supabase/server";
import RaceCard from "@/components/races/RaceCard";
import DateFilter from "@/components/races/DateFilter";
import CourseFilter from "@/components/races/CourseFilter";

type Props = {
  searchParams: Promise<{ date?: string; course?: string }>;
};

export default async function RaceListPage({ searchParams }: Props) {
  const params = await searchParams;
  const supabase = await createClient();

  // 日付一覧を取得（直近2週間のレースがある日）
  const { data: dateDays } = await supabase
    .from("races")
    .select("race_date")
    .order("race_date", { ascending: false })
    .limit(100);

  const uniqueDates = [...new Set(dateDays?.map((d) => d.race_date) ?? [])];
  const selectedDate = params.date ?? uniqueDates[0] ?? "";

  // 選択日のレースを取得
  let query = supabase
    .from("races")
    .select("*")
    .eq("race_date", selectedDate)
    .order("race_number", { ascending: true });

  if (params.course) {
    query = query.eq("course_name", params.course);
  }

  const { data: races } = await query;

  // その日の競馬場一覧
  const coursesForDay = [
    ...new Set(
      dateDays
        ?.filter((d) => d.race_date === selectedDate)
        ? races?.map((r) => r.course_name)
        : []
    ),
  ];
  const { data: allRacesForDay } = await supabase
    .from("races")
    .select("course_name")
    .eq("race_date", selectedDate);
  const uniqueCourses = [...new Set(allRacesForDay?.map((r) => r.course_name) ?? [])];

  // グレード別に分類
  const gradeRaces = races?.filter((r) => r.grade) ?? [];
  const normalRaces = races?.filter((r) => !r.grade) ?? [];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-800">🏇 レース一覧</h1>

      {/* 日付フィルター */}
      <DateFilter dates={uniqueDates} selected={selectedDate} course={params.course} />

      {/* 競馬場フィルター */}
      <CourseFilter
        courses={uniqueCourses}
        selected={params.course ?? ""}
        date={selectedDate}
      />

      {/* 重賞・特別レース */}
      {gradeRaces.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-gray-600 mb-2">🏆 重賞・特別</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {gradeRaces.map((race) => (
              <RaceCard key={race.id} race={race} />
            ))}
          </div>
        </section>
      )}

      {/* 一般レース */}
      {normalRaces.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-gray-600 mb-2">📋 一般レース</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {normalRaces.map((race) => (
              <RaceCard key={race.id} race={race} />
            ))}
          </div>
        </section>
      )}

      {/* レースがない場合 */}
      {(!races || races.length === 0) && (
        <div className="bg-white rounded-xl p-12 text-center text-gray-400">
          <div className="text-4xl mb-3">🏇</div>
          <p>この日のレースはありません</p>
        </div>
      )}
    </div>
  );
}
FILEOF

# ====== src/components/races/DateFilter.tsx ======
echo "📝 src/components/races/DateFilter.tsx"
cat << 'FILEOF' > src/components/races/DateFilter.tsx
"use client";

import { useRouter } from "next/navigation";

type Props = {
  dates: string[];
  selected: string;
  course?: string;
};

export default function DateFilter({ dates, selected, course }: Props) {
  const router = useRouter();

  const handleSelect = (date: string) => {
    const params = new URLSearchParams();
    params.set("date", date);
    if (course) params.set("course", course);
    router.push(`/races?${params.toString()}`);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    const days = ["日", "月", "火", "水", "木", "金", "土"];
    return {
      month: d.getMonth() + 1,
      day: d.getDate(),
      dow: days[d.getDay()],
      isSat: d.getDay() === 6,
      isSun: d.getDay() === 0,
    };
  };

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
      {dates.slice(0, 10).map((date) => {
        const f = formatDate(date);
        const isActive = date === selected;
        return (
          <button
            key={date}
            onClick={() => handleSelect(date)}
            className={`shrink-0 flex flex-col items-center px-4 py-2 rounded-xl border transition-all ${
              isActive
                ? "bg-green-600 text-white border-green-600"
                : "bg-white text-gray-600 border-gray-200 hover:border-green-300"
            }`}
          >
            <span className="text-xs">
              {f.month}/{f.day}
            </span>
            <span
              className={`text-xs font-bold ${
                isActive
                  ? "text-white"
                  : f.isSun
                  ? "text-red-500"
                  : f.isSat
                  ? "text-blue-500"
                  : ""
              }`}
            >
              {f.dow}
            </span>
          </button>
        );
      })}
    </div>
  );
}
FILEOF

# ====== src/components/races/CourseFilter.tsx ======
echo "📝 src/components/races/CourseFilter.tsx"
cat << 'FILEOF' > src/components/races/CourseFilter.tsx
"use client";

import { useRouter } from "next/navigation";

type Props = {
  courses: string[];
  selected: string;
  date: string;
};

export default function CourseFilter({ courses, selected, date }: Props) {
  const router = useRouter();

  const handleSelect = (course: string) => {
    const params = new URLSearchParams();
    params.set("date", date);
    if (course) params.set("course", course);
    router.push(`/races?${params.toString()}`);
  };

  return (
    <div className="flex gap-2 flex-wrap">
      <button
        onClick={() => {
          const params = new URLSearchParams();
          params.set("date", date);
          router.push(`/races?${params.toString()}`);
        }}
        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
          !selected
            ? "bg-green-600 text-white"
            : "bg-white text-gray-600 border border-gray-200 hover:border-green-300"
        }`}
      >
        全て
      </button>
      {courses.map((course) => (
        <button
          key={course}
          onClick={() => handleSelect(course)}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
            selected === course
              ? "bg-green-600 text-white"
              : "bg-white text-gray-600 border border-gray-200 hover:border-green-300"
          }`}
        >
          {course}
        </button>
      ))}
    </div>
  );
}
FILEOF

# ====== src/app/(main)/races/[raceId]/page.tsx ======
echo "📝 src/app/(main)/races/[raceId]/page.tsx"
cat << 'FILEOF' > src/app/\(main\)/races/\[raceId\]/page.tsx
import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import HorseList from "@/components/races/HorseList";
import VoteForm from "@/components/races/VoteForm";
import VoteSummary from "@/components/races/VoteSummary";
import RaceResultTable from "@/components/races/RaceResultTable";

type Props = {
  params: Promise<{ raceId: string }>;
};

export default async function RaceDetailPage({ params }: Props) {
  const { raceId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // レース情報
  const { data: race, error } = await supabase
    .from("races")
    .select("*")
    .eq("id", raceId)
    .single();

  if (!race || error) notFound();

  // 出馬表
  const { data: entries } = await supabase
    .from("race_entries")
    .select("*, horses(id, name, sex, sire, trainer, stable_area, career_record)")
    .eq("race_id", raceId)
    .eq("is_scratched", false)
    .order("post_number", { ascending: true });

  // 自分の投票
  const { data: myVote } = await supabase
    .from("votes")
    .select("*, vote_picks(*, race_entries(post_number, horses(name)))")
    .eq("race_id", raceId)
    .eq("user_id", user.id)
    .maybeSingle();

  // 投票集計
  const { count: totalVotes } = await supabase
    .from("votes")
    .select("*", { count: "exact", head: true })
    .eq("race_id", raceId);

  // レース結果（finished の場合）
  let results = null;
  let payouts = null;
  if (race.status === "finished") {
    const { data: r } = await supabase
      .from("race_results")
      .select("*, race_entries(post_number, jockey, odds, popularity, horses(name))")
      .eq("race_id", raceId)
      .order("finish_position", { ascending: true });
    results = r;

    const { data: p } = await supabase
      .from("payouts")
      .select("*")
      .eq("race_id", raceId);
    payouts = p;
  }

  const gradeColor = getGradeColor(race.grade);
  const postTime = race.post_time
    ? new Date(race.post_time).toLocaleTimeString("ja-JP", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const isVotable = race.status === "voting_open" && !myVote;
  const hasVoted = !!myVote;
  const isFinished = race.status === "finished";

  return (
    <div className="space-y-4">
      {/* パンくずリスト */}
      <div className="text-sm text-gray-400">
        <Link href="/races" className="hover:text-green-600">
          レース一覧
        </Link>
        <span className="mx-2">›</span>
        <span className="text-gray-600">{race.name}</span>
      </div>

      {/* レースヘッダー */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center gap-3 mb-3">
          {race.grade && (
            <span className={`text-sm font-bold px-3 py-1 rounded ${gradeColor}`}>
              {race.grade}
            </span>
          )}
          <span
            className={`text-xs px-2.5 py-1 rounded-full font-medium ${
              isVotable
                ? "bg-green-100 text-green-700"
                : isFinished
                ? "bg-gray-100 text-gray-600"
                : hasVoted
                ? "bg-blue-100 text-blue-700"
                : "bg-yellow-100 text-yellow-700"
            }`}
          >
            {isVotable
              ? "🗳 投票受付中"
              : isFinished
              ? "📊 結果確定"
              : hasVoted
              ? "✅ 投票済み"
              : "準備中"}
          </span>
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">{race.name}</h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
          <span>📍 {race.course_name} {race.race_number}R</span>
          <span>🏟 {race.track_type} {race.distance}m</span>
          <span>🐴 {race.head_count ?? entries?.length ?? "?"}頭</span>
          {postTime && <span>🕐 {postTime} 発走</span>}
          {race.track_condition && <span>馬場: {race.track_condition}</span>}
          <span>投票: {totalVotes ?? 0}人</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* メインエリア */}
        <div className="lg:col-span-2 space-y-4">
          {/* レース結果（finished の場合） */}
          {isFinished && results && (
            <RaceResultTable results={results} payouts={payouts} myVote={myVote} />
          )}

          {/* 投票フォーム（投票可能な場合） */}
          {isVotable && entries && (
            <VoteForm raceId={race.id} entries={entries} />
          )}

          {/* 出馬表（投票済み or 結果確定） */}
          {!isVotable && entries && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="font-bold text-gray-800 mb-3">📋 出馬表</h2>
              <HorseList entries={entries} myVote={myVote} results={results} />
            </div>
          )}
        </div>

        {/* サイドバー */}
        <div className="space-y-4">
          {/* 投票済みの場合：自分の予想 */}
          {hasVoted && myVote && (
            <VoteSummary vote={myVote} isFinished={isFinished} />
          )}

          {/* ポイントルール */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-bold text-gray-800 mb-3">🎯 獲得ポイント目安</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-1.5 border-b border-gray-50">
                <span className="text-gray-600">1着的中（1番人気）</span>
                <span className="font-bold text-green-600">+50P</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-50">
                <span className="text-gray-600">1着的中（4〜6番人気）</span>
                <span className="font-bold text-green-600">+200P</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-50">
                <span className="text-gray-600">1着的中（10番人気〜）</span>
                <span className="font-bold text-green-600">+500P</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-50">
                <span className="text-gray-600">複勝的中（1頭あたり）</span>
                <span className="font-bold text-blue-600">+30P</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-50">
                <span className="text-gray-600">危険馬的中</span>
                <span className="font-bold text-orange-600">+10P</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-gray-600">完全的中ボーナス</span>
                <span className="font-bold text-yellow-600">+300P</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getGradeColor(grade: string | null): string {
  switch (grade) {
    case "G1": return "bg-yellow-100 text-yellow-800";
    case "G2": return "bg-red-100 text-red-700";
    case "G3": return "bg-green-100 text-green-700";
    case "OP": return "bg-blue-100 text-blue-700";
    default:   return "bg-gray-100 text-gray-600";
  }
}
FILEOF

# ====== src/components/races/HorseList.tsx ======
echo "📝 src/components/races/HorseList.tsx"
cat << 'FILEOF' > src/components/races/HorseList.tsx
type Entry = {
  id: string;
  post_number: number;
  gate_number: number | null;
  jockey: string;
  weight: number | null;
  odds: number | null;
  popularity: number | null;
  horses: {
    id: string;
    name: string;
    sex: string;
    sire: string | null;
    trainer: string | null;
    stable_area: string | null;
  } | null;
};

type Props = {
  entries: Entry[];
  myVote?: any;
  results?: any[] | null;
};

export default function HorseList({ entries, myVote, results }: Props) {
  const winPickId = myVote?.vote_picks?.find((p: any) => p.pick_type === "win")?.race_entry_id;
  const placePickIds = myVote?.vote_picks?.filter((p: any) => p.pick_type === "place").map((p: any) => p.race_entry_id) ?? [];
  const dangerPickId = myVote?.vote_picks?.find((p: any) => p.pick_type === "danger")?.race_entry_id;

  return (
    <div className="space-y-1.5">
      {/* ヘッダー */}
      <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs text-gray-400 font-medium">
        <div className="col-span-1">枠</div>
        <div className="col-span-1">番</div>
        <div className="col-span-3">馬名</div>
        <div className="col-span-2">騎手</div>
        <div className="col-span-1 text-right">斤量</div>
        <div className="col-span-2 text-right">オッズ</div>
        <div className="col-span-2 text-right">予想</div>
      </div>

      {entries.map((entry) => {
        const isWin = entry.id === winPickId;
        const isPlace = placePickIds.includes(entry.id);
        const isDanger = entry.id === dangerPickId;
        const result = results?.find((r: any) => r.race_entry_id === entry.id);

        return (
          <div
            key={entry.id}
            className={`grid grid-cols-12 gap-2 items-center px-3 py-2.5 rounded-lg text-sm ${
              result?.finish_position === 1
                ? "bg-yellow-50 border border-yellow-200"
                : result?.finish_position && result.finish_position <= 3
                ? "bg-orange-50 border border-orange-100"
                : isWin
                ? "bg-red-50 border border-red-100"
                : isPlace
                ? "bg-blue-50 border border-blue-100"
                : isDanger
                ? "bg-gray-100 border border-gray-200"
                : "bg-gray-50"
            }`}
          >
            {/* 枠番 */}
            <div className="col-span-1">
              <GateNumber gate={entry.gate_number} />
            </div>

            {/* 馬番 */}
            <div className="col-span-1">
              <span className="font-bold text-gray-800">{entry.post_number}</span>
            </div>

            {/* 馬名 */}
            <div className="col-span-3">
              <div className="font-bold text-gray-800 truncate">
                {entry.horses?.name ?? "不明"}
              </div>
              <div className="text-xs text-gray-400 truncate">
                {entry.horses?.sex} {entry.horses?.sire}
              </div>
            </div>

            {/* 騎手 */}
            <div className="col-span-2 text-gray-600 truncate">
              {entry.jockey}
            </div>

            {/* 斤量 */}
            <div className="col-span-1 text-right text-gray-500">
              {entry.weight}
            </div>

            {/* オッズ */}
            <div className="col-span-2 text-right">
              {entry.odds && (
                <span className="font-bold text-gray-800">{entry.odds}</span>
              )}
              {entry.popularity && (
                <span className="text-xs text-gray-400 ml-1">
                  ({entry.popularity}人気)
                </span>
              )}
            </div>

            {/* 予想マーク */}
            <div className="col-span-2 text-right">
              {result && (
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                  result.finish_position === 1 ? "bg-yellow-200 text-yellow-800" :
                  result.finish_position <= 3 ? "bg-orange-200 text-orange-800" :
                  "bg-gray-200 text-gray-600"
                }`}>
                  {result.finish_position}着
                </span>
              )}
              {isWin && <span className="text-xs font-bold text-red-600 ml-1">◎</span>}
              {isPlace && <span className="text-xs font-bold text-blue-600 ml-1">○</span>}
              {isDanger && <span className="text-xs font-bold text-gray-500 ml-1">△</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function GateNumber({ gate }: { gate: number | null }) {
  if (!gate) return <span className="text-gray-300">-</span>;
  const colors: Record<number, string> = {
    1: "bg-white text-gray-800 border border-gray-300",
    2: "bg-black text-white",
    3: "bg-red-500 text-white",
    4: "bg-blue-500 text-white",
    5: "bg-yellow-400 text-gray-800",
    6: "bg-green-500 text-white",
    7: "bg-orange-500 text-white",
    8: "bg-pink-400 text-white",
  };
  return (
    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${colors[gate] ?? "bg-gray-200"}`}>
      {gate}
    </span>
  );
}
FILEOF

# ====== src/components/races/VoteForm.tsx ======
echo "📝 src/components/races/VoteForm.tsx"
cat << 'FILEOF' > src/components/races/VoteForm.tsx
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type Entry = {
  id: string;
  post_number: number;
  gate_number: number | null;
  jockey: string;
  odds: number | null;
  popularity: number | null;
  horses: {
    id: string;
    name: string;
    sex: string;
    sire: string | null;
  } | null;
};

type Props = {
  raceId: string;
  entries: Entry[];
};

export default function VoteForm({ raceId, entries }: Props) {
  const [winPick, setWinPick] = useState<string | null>(null);
  const [placePicks, setPlacePicks] = useState<string[]>([]);
  const [dangerPick, setDangerPick] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"win" | "place" | "danger">("win");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClient();

  const togglePlace = (id: string) => {
    if (placePicks.includes(id)) {
      setPlacePicks(placePicks.filter((p) => p !== id));
    } else if (placePicks.length < 2) {
      setPlacePicks([...placePicks, id]);
    }
  };

  const handleSubmit = async () => {
    if (!winPick) {
      setError("1着予想を選択してください");
      return;
    }
    setLoading(true);
    setError("");

    // 投票ヘッダー作成
    const { data: vote, error: voteErr } = await supabase
      .from("votes")
      .insert({ user_id: (await supabase.auth.getUser()).data.user!.id, race_id: raceId })
      .select()
      .single();

    if (voteErr || !vote) {
      setError("投票に失敗しました: " + (voteErr?.message ?? ""));
      setLoading(false);
      return;
    }

    // 投票詳細作成
    const picks = [
      { vote_id: vote.id, pick_type: "win", race_entry_id: winPick },
      ...placePicks.map((id) => ({
        vote_id: vote.id,
        pick_type: "place",
        race_entry_id: id,
      })),
      ...(dangerPick
        ? [{ vote_id: vote.id, pick_type: "danger", race_entry_id: dangerPick }]
        : []),
    ];

    const { error: pickErr } = await supabase.from("vote_picks").insert(picks);

    if (pickErr) {
      setError("投票詳細の保存に失敗しました: " + pickErr.message);
      setLoading(false);
      return;
    }

    router.refresh();
  };

  const tabs = [
    { key: "win" as const, label: "◎ 1着予想", required: true, desc: "1頭選択" },
    { key: "place" as const, label: "○ 複勝予想", required: false, desc: "0〜2頭" },
    { key: "danger" as const, label: "△ 危険馬", required: false, desc: "0〜1頭" },
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {/* タブ */}
      <div className="flex border-b border-gray-100">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
              activeTab === tab.key
                ? "text-green-600 bg-green-50"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
            <span className="block text-xs font-normal text-gray-400">{tab.desc}</span>
            {activeTab === tab.key && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-600" />
            )}
          </button>
        ))}
      </div>

      {/* 馬リスト */}
      <div className="p-4 space-y-1.5 max-h-96 overflow-y-auto">
        {entries.map((entry) => {
          const isSelected =
            activeTab === "win"
              ? winPick === entry.id
              : activeTab === "place"
              ? placePicks.includes(entry.id)
              : dangerPick === entry.id;

          const isDisabled =
            activeTab === "place" && placePicks.length >= 2 && !isSelected;

          return (
            <button
              key={entry.id}
              onClick={() => {
                if (activeTab === "win") setWinPick(isSelected ? null : entry.id);
                else if (activeTab === "place") togglePlace(entry.id);
                else setDangerPick(isSelected ? null : entry.id);
              }}
              disabled={isDisabled}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${
                isSelected
                  ? activeTab === "win"
                    ? "bg-red-50 border-2 border-red-300"
                    : activeTab === "place"
                    ? "bg-blue-50 border-2 border-blue-300"
                    : "bg-gray-100 border-2 border-gray-400"
                  : "bg-gray-50 border-2 border-transparent hover:border-gray-200"
              } ${isDisabled ? "opacity-40" : ""}`}
            >
              {/* 馬番 */}
              <span className="w-8 h-8 rounded-full bg-gray-800 text-white flex items-center justify-center text-sm font-bold shrink-0">
                {entry.post_number}
              </span>

              {/* 馬名・騎手 */}
              <div className="flex-1 min-w-0">
                <div className="font-bold text-gray-800 truncate">
                  {entry.horses?.name}
                </div>
                <div className="text-xs text-gray-400">
                  {entry.jockey}
                  {entry.horses?.sire && ` / ${entry.horses.sire}`}
                </div>
              </div>

              {/* オッズ */}
              <div className="text-right shrink-0">
                {entry.odds && (
                  <span className="font-bold text-gray-700">{entry.odds}</span>
                )}
                {entry.popularity && (
                  <div className="text-xs text-gray-400">{entry.popularity}人気</div>
                )}
              </div>

              {/* 選択マーク */}
              <div className="w-6 shrink-0 text-center">
                {isSelected && (
                  <span className={`text-lg ${
                    activeTab === "win" ? "text-red-500" :
                    activeTab === "place" ? "text-blue-500" : "text-gray-500"
                  }`}>
                    {activeTab === "win" ? "◎" : activeTab === "place" ? "○" : "△"}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* 投票サマリー + 送信ボタン */}
      <div className="border-t border-gray-100 p-4 bg-gray-50">
        <div className="flex flex-wrap gap-2 mb-3 min-h-[28px]">
          {winPick && (
            <span className="bg-red-100 text-red-700 text-xs px-2.5 py-1 rounded-full font-medium">
              ◎ {entries.find((e) => e.id === winPick)?.horses?.name}
            </span>
          )}
          {placePicks.map((id) => (
            <span key={id} className="bg-blue-100 text-blue-700 text-xs px-2.5 py-1 rounded-full font-medium">
              ○ {entries.find((e) => e.id === id)?.horses?.name}
            </span>
          ))}
          {dangerPick && (
            <span className="bg-gray-200 text-gray-700 text-xs px-2.5 py-1 rounded-full font-medium">
              △ {entries.find((e) => e.id === dangerPick)?.horses?.name}
            </span>
          )}
          {!winPick && !placePicks.length && !dangerPick && (
            <span className="text-xs text-gray-400">馬を選択してください</span>
          )}
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-2 rounded-lg mb-3">{error}</div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!winPick || loading}
          className="w-full py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors disabled:opacity-40 disabled:hover:bg-green-600"
        >
          {loading ? "投票中..." : "🗳 この予想で投票する"}
        </button>
      </div>
    </div>
  );
}
FILEOF

# ====== src/components/races/VoteSummary.tsx ======
echo "📝 src/components/races/VoteSummary.tsx"
cat << 'FILEOF' > src/components/races/VoteSummary.tsx
type Props = {
  vote: {
    status: string;
    earned_points: number;
    is_perfect: boolean;
    vote_picks: {
      pick_type: string;
      is_hit: boolean | null;
      points_earned: number;
      race_entries: {
        post_number: number;
        horses: { name: string } | null;
      } | null;
    }[];
  };
  isFinished: boolean;
};

export default function VoteSummary({ vote, isFinished }: Props) {
  const winPick = vote.vote_picks.find((p) => p.pick_type === "win");
  const placePicks = vote.vote_picks.filter((p) => p.pick_type === "place");
  const dangerPick = vote.vote_picks.find((p) => p.pick_type === "danger");

  const isHit = vote.status === "settled_hit";

  return (
    <div className={`rounded-2xl border p-5 ${
      isFinished && isHit
        ? "bg-green-50 border-green-200"
        : isFinished
        ? "bg-gray-50 border-gray-200"
        : "bg-white border-gray-100"
    }`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-gray-800">🗳 あなたの予想</h3>
        {isFinished && (
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
            isHit ? "bg-green-200 text-green-800" : "bg-gray-200 text-gray-600"
          }`}>
            {isHit ? "🎉 的中！" : "ハズレ"}
          </span>
        )}
      </div>

      <div className="space-y-2.5">
        {/* 1着予想 */}
        {winPick && (
          <PickRow
            label="◎ 1着"
            labelColor="text-red-600"
            name={winPick.race_entries?.horses?.name ?? ""}
            number={winPick.race_entries?.post_number}
            isHit={winPick.is_hit}
            points={winPick.points_earned}
            isFinished={isFinished}
          />
        )}

        {/* 複勝予想 */}
        {placePicks.map((pick, i) => (
          <PickRow
            key={i}
            label="○ 複勝"
            labelColor="text-blue-600"
            name={pick.race_entries?.horses?.name ?? ""}
            number={pick.race_entries?.post_number}
            isHit={pick.is_hit}
            points={pick.points_earned}
            isFinished={isFinished}
          />
        ))}

        {/* 危険馬 */}
        {dangerPick && (
          <PickRow
            label="△ 危険"
            labelColor="text-gray-500"
            name={dangerPick.race_entries?.horses?.name ?? ""}
            number={dangerPick.race_entries?.post_number}
            isHit={dangerPick.is_hit}
            points={dangerPick.points_earned}
            isFinished={isFinished}
          />
        )}
      </div>

      {/* 合計ポイント */}
      {isFinished && (
        <div className="mt-4 pt-3 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <span className="font-bold text-gray-700">獲得ポイント</span>
            <span className={`text-xl font-bold ${
              vote.earned_points > 0 ? "text-green-600" : "text-gray-400"
            }`}>
              +{vote.earned_points} P
            </span>
          </div>
          {vote.is_perfect && (
            <div className="mt-2 bg-yellow-100 text-yellow-800 text-xs font-bold px-3 py-2 rounded-lg text-center">
              💎 完全的中ボーナス +300P
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PickRow({
  label, labelColor, name, number, isHit, points, isFinished,
}: {
  label: string;
  labelColor: string;
  name: string;
  number?: number;
  isHit: boolean | null;
  points: number;
  isFinished: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className={`text-xs font-bold w-14 ${labelColor}`}>{label}</span>
      <span className="text-sm font-medium text-gray-800 flex-1">
        {number && <span className="text-gray-400 mr-1">{number}</span>}
        {name}
      </span>
      {isFinished && isHit !== null && (
        <span className={`text-xs font-bold px-2 py-0.5 rounded ${
          isHit ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
        }`}>
          {isHit ? `✓ +${points}P` : "✗"}
        </span>
      )}
    </div>
  );
}
FILEOF

# ====== src/components/races/RaceResultTable.tsx ======
echo "📝 src/components/races/RaceResultTable.tsx"
cat << 'FILEOF' > src/components/races/RaceResultTable.tsx
type Result = {
  finish_position: number;
  finish_time: string | null;
  margin: string | null;
  last_3f: number | null;
  race_entries: {
    post_number: number;
    jockey: string;
    odds: number | null;
    popularity: number | null;
    horses: { name: string } | null;
  } | null;
};

type Payout = {
  bet_type: string;
  combination: string;
  payout_amount: number;
  popularity: number | null;
};

type Props = {
  results: Result[];
  payouts: Payout[] | null;
  myVote: any;
};

export default function RaceResultTable({ results, payouts, myVote }: Props) {
  return (
    <div className="space-y-4">
      {/* 着順結果 */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h2 className="font-bold text-gray-800 mb-3">🏆 レース結果</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 border-b border-gray-100">
                <th className="py-2 text-left w-12">着順</th>
                <th className="py-2 text-left w-10">馬番</th>
                <th className="py-2 text-left">馬名</th>
                <th className="py-2 text-left">騎手</th>
                <th className="py-2 text-right">タイム</th>
                <th className="py-2 text-right">着差</th>
                <th className="py-2 text-right">人気</th>
              </tr>
            </thead>
            <tbody>
              {results.slice(0, 5).map((result) => (
                <tr
                  key={result.finish_position}
                  className={`border-b border-gray-50 ${
                    result.finish_position === 1 ? "bg-yellow-50" :
                    result.finish_position <= 3 ? "bg-orange-50/30" : ""
                  }`}
                >
                  <td className="py-2.5">
                    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                      result.finish_position === 1
                        ? "bg-yellow-400 text-white"
                        : result.finish_position === 2
                        ? "bg-gray-300 text-white"
                        : result.finish_position === 3
                        ? "bg-orange-400 text-white"
                        : "bg-gray-100 text-gray-600"
                    }`}>
                      {result.finish_position}
                    </span>
                  </td>
                  <td className="py-2.5 font-bold">{result.race_entries?.post_number}</td>
                  <td className="py-2.5 font-bold">{result.race_entries?.horses?.name}</td>
                  <td className="py-2.5 text-gray-600">{result.race_entries?.jockey}</td>
                  <td className="py-2.5 text-right text-gray-600">{result.finish_time ?? "-"}</td>
                  <td className="py-2.5 text-right text-gray-500">{result.margin || "-"}</td>
                  <td className="py-2.5 text-right text-gray-500">
                    {result.race_entries?.popularity ? `${result.race_entries.popularity}番` : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 払戻金 */}
      {payouts && payouts.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-bold text-gray-800 mb-3">💰 払戻金</h2>
          <div className="space-y-1.5">
            {payouts.map((payout, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0 text-sm">
                <span className="text-gray-600">{payout.bet_type}</span>
                <div className="text-right">
                  <span className="font-bold text-gray-800">
                    ¥{payout.payout_amount.toLocaleString()}
                  </span>
                  {payout.popularity && (
                    <span className="text-xs text-gray-400 ml-2">{payout.popularity}番人気</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
FILEOF

# ====== src/app/page.tsx を Route Group 用にリダイレクト ======
echo "📝 src/app/page.tsx（ルートリダイレクト）"
cat << 'FILEOF' > src/app/page.tsx
import { redirect } from "next/navigation";

export default function RootPage() {
  redirect("/");
}
FILEOF

# 注意: Next.js の Route Group では (main) 内の page.tsx が / に対応する
# ただし src/app/page.tsx も存在すると競合するため、
# src/app/page.tsx を削除して (main)/page.tsx に移行

# 実際には Route Group を使うと (main)/page.tsx が / のルートになる
# src/app/page.tsx との競合を回避
echo ""
echo "⚠️  Route Group の設定を調整中..."

# src/app/page.tsx は (main)/page.tsx と競合するので削除
rm -f src/app/page.tsx

echo ""
echo "✅ 全ファイルの配置が完了しました！"
echo ""
echo "📂 作成されたファイル:"
echo "  src/lib/constants/ranks.ts           ← ランク・ポイント定数"
echo "  src/components/layout/Header.tsx      ← 共通ヘッダー"
echo "  src/components/races/RaceCard.tsx     ← レースカード"
echo "  src/components/races/DateFilter.tsx   ← 日付フィルター"
echo "  src/components/races/CourseFilter.tsx  ← 競馬場フィルター"
echo "  src/components/races/HorseList.tsx    ← 出馬表リスト"
echo "  src/components/races/VoteForm.tsx     ← 投票フォーム"
echo "  src/components/races/VoteSummary.tsx  ← 投票結果サマリー"
echo "  src/components/races/RaceResultTable.tsx ← レース結果テーブル"
echo "  src/app/(main)/layout.tsx            ← メインレイアウト"
echo "  src/app/(main)/page.tsx              ← トップページ"
echo "  src/app/(main)/races/page.tsx        ← レース一覧"
echo "  src/app/(main)/races/[raceId]/page.tsx ← レース詳細"
echo ""
echo "🚀 次のステップ:"
echo "  npm run dev"
echo "  → http://localhost:3000 → トップ画面（レースカード一覧）"
echo "  → http://localhost:3000/races → レース一覧（日付・競馬場フィルター付き）"
echo "  → レースカードをクリック → レース詳細（出馬表 + 投票フォーム）"
