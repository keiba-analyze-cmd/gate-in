#!/usr/bin/env python3
"""
Task #41: レース検索・フィルター強化
- グレードフィルター追加 (GradeFilter コンポーネント)
- レース名キーワード検索追加
- races/page.tsx を更新
"""

import os, re

# ============================================================
# 1. GradeFilter コンポーネント
# ============================================================
GRADE_FILTER = '''\
"use client";

import { useRouter, useSearchParams } from "next/navigation";

type Props = {
  selected: string;
  date: string;
  course: string;
};

const GRADES = [
  { value: "", label: "全て" },
  { value: "G1", label: "G1" },
  { value: "G2", label: "G2" },
  { value: "G3", label: "G3" },
  { value: "OP", label: "OP" },
  { value: "listed", label: "Listed" },
];

export default function GradeFilter({ selected, date, course }: Props) {
  const router = useRouter();

  const handleChange = (grade: string) => {
    const params = new URLSearchParams();
    if (date) params.set("date", date);
    if (course) params.set("course", course);
    if (grade) params.set("grade", grade);
    router.push(`/races?${params.toString()}`);
  };

  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
      {GRADES.map((g) => (
        <button
          key={g.value}
          onClick={() => handleChange(g.value)}
          className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
            selected === g.value
              ? g.value === "G1" ? "bg-yellow-100 text-yellow-800 border border-yellow-300"
              : g.value === "G2" ? "bg-red-100 text-red-700 border border-red-300"
              : g.value === "G3" ? "bg-green-100 text-green-700 border border-green-300"
              : "bg-green-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          {g.label}
        </button>
      ))}
    </div>
  );
}
'''

os.makedirs("src/components/races", exist_ok=True)
with open("src/components/races/GradeFilter.tsx", "w") as f:
    f.write(GRADE_FILTER)
print("✅ src/components/races/GradeFilter.tsx")

# ============================================================
# 2. RaceSearchBar コンポーネント
# ============================================================
SEARCH_BAR = '''\
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  initialQuery: string;
  date: string;
  course: string;
  grade: string;
};

export default function RaceSearchBar({ initialQuery, date, course, grade }: Props) {
  const [query, setQuery] = useState(initialQuery);
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (date) params.set("date", date);
    if (course) params.set("course", course);
    if (grade) params.set("grade", grade);
    if (query.trim()) params.set("q", query.trim());
    router.push(`/races?${params.toString()}`);
  };

  const handleClear = () => {
    setQuery("");
    const params = new URLSearchParams();
    if (date) params.set("date", date);
    if (course) params.set("course", course);
    if (grade) params.set("grade", grade);
    router.push(`/races?${params.toString()}`);
  };

  return (
    <div className="flex gap-2">
      <div className="flex-1 relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSearch(e); }}
          placeholder="レース名で検索..."
          className="w-full pl-9 pr-8 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400"
        />
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
'''

with open("src/components/races/RaceSearchBar.tsx", "w") as f:
    f.write(SEARCH_BAR)
print("✅ src/components/races/RaceSearchBar.tsx")

# ============================================================
# 3. races/page.tsx を更新（検索・グレードフィルター追加）
# ============================================================
RACES_PAGE = '''\
export const revalidate = 60; // 60秒キャッシュ

import { createClient } from "@/lib/supabase/server";
import RaceCard from "@/components/races/RaceCard";
import DateFilter from "@/components/races/DateFilter";
import CourseFilter from "@/components/races/CourseFilter";
import GradeFilter from "@/components/races/GradeFilter";
import RaceSearchBar from "@/components/races/RaceSearchBar";

type Props = {
  searchParams: Promise<{ date?: string; course?: string; grade?: string; q?: string }>;
};

export default async function RaceListPage({ searchParams }: Props) {
  const params = await searchParams;
  const supabase = await createClient();

  // ユーザーの投票済みレースを取得
  const { data: { user } } = await supabase.auth.getUser();
  let votedRaceIds = new Set<string>();
  if (user) {
    const { data: myVotes } = await supabase
      .from("votes")
      .select("race_id")
      .eq("user_id", user.id);
    votedRaceIds = new Set((myVotes ?? []).map((v) => v.race_id));
  }

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
  if (params.grade) {
    query = query.eq("grade", params.grade);
  }

  const { data: races } = await query;

  // キーワード検索（レース名でフィルター）
  let filteredRaces = races ?? [];
  if (params.q) {
    const q = params.q.toLowerCase();
    filteredRaces = filteredRaces.filter((r) =>
      r.name.toLowerCase().includes(q) ||
      (r.course_name ?? "").toLowerCase().includes(q)
    );
  }

  // その日の競馬場一覧
  const { data: allRacesForDay } = await supabase
    .from("races")
    .select("course_name")
    .eq("race_date", selectedDate);
  const uniqueCourses = [...new Set(allRacesForDay?.map((r) => r.course_name) ?? [])];

  // グレード別に分類
  const gradeRaces = filteredRaces.filter((r) => r.grade);
  const normalRaces = filteredRaces.filter((r) => !r.grade);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-800">🏇 レース一覧</h1>

      {/* 検索バー */}
      <RaceSearchBar
        initialQuery={params.q ?? ""}
        date={selectedDate}
        course={params.course ?? ""}
        grade={params.grade ?? ""}
      />

      {/* 日付フィルター */}
      <DateFilter dates={uniqueDates} selected={selectedDate} course={params.course} />

      {/* 競馬場フィルター */}
      <CourseFilter
        courses={uniqueCourses}
        selected={params.course ?? ""}
        date={selectedDate}
      />

      {/* グレードフィルター */}
      <GradeFilter
        selected={params.grade ?? ""}
        date={selectedDate}
        course={params.course ?? ""}
      />

      {/* 検索結果表示 */}
      {params.q && (
        <div className="text-sm text-gray-500">
          「{params.q}」の検索結果: {filteredRaces.length}件
        </div>
      )}

      {/* 重賞・特別レース */}
      {gradeRaces.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-gray-600 mb-2">🏆 重賞・特別</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {gradeRaces.map((race) => (
              <RaceCard key={race.id} race={race} voted={votedRaceIds.has(race.id)} />
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
              <RaceCard key={race.id} race={race} voted={votedRaceIds.has(race.id)} />
            ))}
          </div>
        </section>
      )}

      {/* レースがない場合 */}
      {filteredRaces.length === 0 && (
        <div className="bg-white rounded-xl p-12 text-center text-gray-400">
          <div className="text-4xl mb-3">🏇</div>
          <p>{params.q ? `「${params.q}」に一致するレースがありません` : "この日のレースはありません"}</p>
        </div>
      )}
    </div>
  );
}
'''

races_page = "src/app/(main)/races/page.tsx"
with open(races_page, "w") as f:
    f.write(RACES_PAGE)
print(f"✅ {races_page} 更新")

print("\n🏁 Task #41 完了")
