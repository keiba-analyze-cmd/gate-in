"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import RaceCard from "@/components/races/RaceCard";
import { useTheme } from "@/contexts/ThemeContext";

type Race = {
  id: string;
  name: string;
  race_date: string;
  course_name: string;
  grade: string | null;
  status: string;
  race_number?: number | null;
  distance?: number | null;
  start_time?: string | null;
  track_type?: string | null;
  head_count?: number | null;
  post_time?: string | null;
};

type Props = {
  openRaces: Race[];
  closedRaces: Race[];
  finishedRaces: Race[];
  votedRaceIds: string[];
  voteResults: Record<string, "pending" | "hit" | "miss">;
  availableDates: string[];
  availableCourses: string[];
};

export default function RacesClient({ openRaces, closedRaces, finishedRaces, votedRaceIds, voteResults, availableDates, availableCourses }: Props) {
  const { isDark } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null);

  const grades = ["G1", "G2", "G3", "OP", "Listed"];

  const filterRaces = (races: Race[]) => {
    return races.filter((race) => {
      if (searchQuery && !race.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (selectedDate && race.race_date !== selectedDate) return false;
      if (selectedCourse && race.course_name !== selectedCourse) return false;
      if (selectedGrade) {
        if (selectedGrade === "Listed") {
          if (race.grade !== "L") return false;
        } else {
          if (race.grade !== selectedGrade) return false;
        }
      }
      return true;
    });
  };

  const filteredOpen = useMemo(() => filterRaces(openRaces), [openRaces, searchQuery, selectedDate, selectedCourse, selectedGrade]);
  const filteredClosed = useMemo(() => filterRaces(closedRaces), [closedRaces, searchQuery, selectedDate, selectedCourse, selectedGrade]);
  const filteredFinished = useMemo(() => filterRaces(finishedRaces), [finishedRaces, searchQuery, selectedDate, selectedCourse, selectedGrade]);

  const cardClass = isDark ? "bg-slate-900 border-slate-700" : "bg-white border-gray-200";
  const textPrimary = isDark ? "text-slate-100" : "text-gray-900";
  const textSecondary = isDark ? "text-slate-400" : "text-gray-500";
  const inputClass = isDark ? "bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500" : "bg-white border-gray-200 text-gray-900 placeholder-gray-400";
  const chipActive = isDark ? "bg-amber-500 text-slate-900" : "bg-green-600 text-white";
  const chipInactive = isDark ? "bg-slate-800 text-slate-300 hover:bg-slate-700" : "bg-gray-100 text-gray-700 hover:bg-gray-200";

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00+09:00");
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekday = ["日", "月", "火", "水", "木", "金", "土"][date.getDay()];
    return `${month}/${day}\n${weekday}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className={`text-xl font-black ${textPrimary}`}>🏇 レース一覧</h1>
        <Link href="/races/calendar" className={`text-sm font-bold px-3 py-1.5 rounded-lg border transition-colors ${isDark ? "border-amber-500 text-amber-400 hover:bg-amber-500/10" : "border-green-500 text-green-600 hover:bg-green-50"}`}>
          📅 カレンダー
        </Link>
      </div>

      {/* 検索 */}
      <div className={`relative rounded-xl border ${inputClass}`}>
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
        <input
          type="text"
          placeholder="レース名で検索..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={`w-full pl-10 pr-4 py-2.5 rounded-xl border-0 bg-transparent focus:outline-none focus:ring-2 ${isDark ? "focus:ring-amber-500" : "focus:ring-green-500"}`}
        />
      </div>

      {/* 日付フィルター */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {availableDates.map((date) => (
          <button
            key={date}
            onClick={() => setSelectedDate(selectedDate === date ? null : date)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-pre-line text-center transition-colors shrink-0 ${selectedDate === date ? chipActive : chipInactive}`}
          >
            {formatDate(date)}
          </button>
        ))}
      </div>

      {/* 競馬場フィルター */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <button
          onClick={() => setSelectedCourse(null)}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shrink-0 ${!selectedCourse ? chipActive : chipInactive}`}
        >
          全て
        </button>
        {availableCourses.map((course) => (
          <button
            key={course}
            onClick={() => setSelectedCourse(selectedCourse === course ? null : course)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shrink-0 ${selectedCourse === course ? chipActive : chipInactive}`}
          >
            {course}
          </button>
        ))}
      </div>

      {/* グレードフィルター */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <button
          onClick={() => setSelectedGrade(null)}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shrink-0 ${!selectedGrade ? chipActive : chipInactive}`}
        >
          全て
        </button>
        {grades.map((grade) => (
          <button
            key={grade}
            onClick={() => setSelectedGrade(selectedGrade === grade ? null : grade)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shrink-0 ${selectedGrade === grade ? chipActive : chipInactive}`}
          >
            {grade}
          </button>
        ))}
      </div>

      {/* 受付中 */}
      {filteredOpen.length > 0 && (
        <section>
          <h2 className={`text-sm font-black mb-2 ${isDark ? "text-green-400" : "text-green-600"}`}>🔥 受付中 <span className={textSecondary}>{filteredOpen.length}件</span></h2>
          <div className="space-y-2">
            {filteredOpen.map((race) => (
              <RaceCard key={race.id} race={race} voted={votedRaceIds.includes(race.id)} />
            ))}
          </div>
        </section>
      )}

      {/* 締切 */}
      {filteredClosed.length > 0 && (
        <section>
          <h2 className={`text-sm font-black mb-2 ${isDark ? "text-orange-400" : "text-orange-600"}`}>⏰ 締切 <span className={textSecondary}>{filteredClosed.length}件</span></h2>
          <div className="space-y-2">
            {filteredClosed.map((race) => (
              <RaceCard key={race.id} race={race} voted={votedRaceIds.includes(race.id)} isDeadlinePassed />
            ))}
          </div>
        </section>
      )}

      {/* 結果確定 */}
      {filteredFinished.length > 0 && (
        <section>
          <h2 className={`text-sm font-black mb-2 ${textSecondary}`}>📊 結果確定 <span className={textSecondary}>{filteredFinished.length}件</span></h2>
          <div className="space-y-2">
            {filteredFinished.map((race) => (
              <RaceCard
                key={race.id}
                race={race}
                voted={votedRaceIds.includes(race.id)}
                voteResult={voteResults[race.id] ? (voteResults[race.id] === "pending" ? "pending" : voteResults[race.id]) : "none"}
              />
            ))}
          </div>
        </section>
      )}

      {filteredOpen.length === 0 && filteredClosed.length === 0 && filteredFinished.length === 0 && (
        <div className={`text-center py-12 ${textSecondary}`}>
          <span className="text-4xl mb-2 block">🏇</span>
          <p>該当するレースがありません</p>
        </div>
      )}
    </div>
  );
}
