"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
  uniqueDates: string[];
  uniqueCourses: string[];
  selectedDate: string;
  selectedCourse: string;
  selectedGrade: string;
  searchQuery: string;
};

export default function RaceListClient({
  openRaces, closedRaces, finishedRaces, votedRaceIds, voteResults,
  uniqueDates, uniqueCourses, selectedDate, selectedCourse, selectedGrade, searchQuery
}: Props) {
  const { isDark } = useTheme();
  const router = useRouter();

  const textPrimary = isDark ? "text-slate-100" : "text-gray-900";
  const textSecondary = isDark ? "text-slate-400" : "text-gray-500";
  const inputClass = isDark 
    ? "bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500" 
    : "bg-white border-gray-200 text-gray-900 placeholder-gray-400";
  const chipActive = isDark ? "bg-amber-500 text-slate-900" : "bg-green-600 text-white";
  const chipInactive = isDark ? "bg-slate-800 text-slate-300 hover:bg-slate-700" : "bg-gray-100 text-gray-700 hover:bg-gray-200";

  const grades = ["G1", "G2", "G3", "OP", "L"];

  const buildUrl = (params: { date?: string; course?: string; grade?: string; q?: string }) => {
    const url = new URLSearchParams();
    if (params.date) url.set("date", params.date);
    if (params.course) url.set("course", params.course);
    if (params.grade) url.set("grade", params.grade);
    if (params.q) url.set("q", params.q);
    return `/races?${url.toString()}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00+09:00");
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekday = ["日", "月", "火", "水", "木", "金", "土"][date.getDay()];
    return { display: `${month}/${day}`, weekday };
  };

  const getVoteResult = (raceId: string) => voteResults[raceId] ?? "none";
  const isVoted = (raceId: string) => votedRaceIds.includes(raceId);

  const renderRaceCards = (list: Race[], section: "open" | "closed" | "finished") => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {list.map((race) => (
        <RaceCard
          key={race.id}
          race={race}
          voted={isVoted(race.id)}
          voteResult={section === "finished" ? getVoteResult(race.id) : "none"}
          isDeadlinePassed={section !== "open"}
        />
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className={`text-xl font-black ${textPrimary}`}>🏇 レース一覧</h1>
        <Link 
          href="/races/calendar" 
          className={`text-sm font-bold px-3 py-1.5 rounded-lg border transition-colors ${
            isDark ? "border-amber-500 text-amber-400 hover:bg-amber-500/10" : "border-green-500 text-green-600 hover:bg-green-50"
          }`}
        >
          📅 カレンダー
        </Link>
      </div>

      {/* 検索 */}
      <div className={`relative rounded-xl border ${inputClass}`}>
        <span className="absolute left-3 top-1/2 -translate-y-1/2">🔍</span>
        <input
          type="text"
          placeholder="レース名で検索..."
          defaultValue={searchQuery}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const value = (e.target as HTMLInputElement).value;
              router.push(buildUrl({ date: selectedDate, course: selectedCourse, grade: selectedGrade, q: value || undefined }));
            }
          }}
          className={`w-full pl-10 pr-4 py-2.5 rounded-xl border-0 bg-transparent focus:outline-none focus:ring-2 ${isDark ? "focus:ring-amber-500" : "focus:ring-green-500"}`}
        />
      </div>

      {/* 日付フィルター */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {uniqueDates.slice(0, 7).map((date) => {
          const { display, weekday } = formatDate(date);
          const isSelected = date === selectedDate;
          return (
            <Link
              key={date}
              href={buildUrl({ date, course: selectedCourse, grade: selectedGrade, q: searchQuery || undefined })}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold text-center transition-colors shrink-0 ${isSelected ? chipActive : chipInactive}`}
            >
              <div>{display}</div>
              <div className="text-[10px]">{weekday}</div>
            </Link>
          );
        })}
      </div>

      {/* 競馬場フィルター */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <Link
          href={buildUrl({ date: selectedDate, grade: selectedGrade, q: searchQuery || undefined })}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shrink-0 ${!selectedCourse ? chipActive : chipInactive}`}
        >
          全て
        </Link>
        {uniqueCourses.map((course) => (
          <Link
            key={course}
            href={buildUrl({ date: selectedDate, course, grade: selectedGrade, q: searchQuery || undefined })}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shrink-0 ${selectedCourse === course ? chipActive : chipInactive}`}
          >
            {course}
          </Link>
        ))}
      </div>

      {/* グレードフィルター */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <Link
          href={buildUrl({ date: selectedDate, course: selectedCourse, q: searchQuery || undefined })}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shrink-0 ${!selectedGrade ? chipActive : chipInactive}`}
        >
          全て
        </Link>
        {grades.map((grade) => (
          <Link
            key={grade}
            href={buildUrl({ date: selectedDate, course: selectedCourse, grade, q: searchQuery || undefined })}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shrink-0 ${selectedGrade === grade ? chipActive : chipInactive}`}
          >
            {grade === "L" ? "Listed" : grade}
          </Link>
        ))}
      </div>

      {searchQuery && (
        <div className={`text-sm ${textSecondary}`}>「{searchQuery}」の検索結果: {openRaces.length + closedRaces.length + finishedRaces.length}件</div>
      )}

      {/* 🗳 受付中 */}
      {openRaces.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-2">
            <h2 className={`text-sm font-black ${isDark ? "text-green-400" : "text-green-700"}`}>🗳 受付中</h2>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isDark ? "text-green-400 bg-green-500/20" : "text-green-600 bg-green-50"}`}>{openRaces.length}件</span>
          </div>
          {renderRaceCards(openRaces, "open")}
        </section>
      )}

      {/* ⏰ 投票締切 */}
      {closedRaces.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-2">
            <h2 className={`text-sm font-black ${isDark ? "text-orange-400" : "text-orange-600"}`}>⏰ 投票締切</h2>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isDark ? "text-orange-400 bg-orange-500/20" : "text-orange-600 bg-orange-50"}`}>{closedRaces.length}件</span>
          </div>
          {renderRaceCards(closedRaces, "closed")}
        </section>
      )}

      {/* 📊 結果確定 */}
      {finishedRaces.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-2">
            <h2 className={`text-sm font-black ${textSecondary}`}>📊 結果確定</h2>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isDark ? "text-slate-400 bg-slate-700" : "text-gray-500 bg-gray-100"}`}>{finishedRaces.length}件</span>
          </div>
          {renderRaceCards(finishedRaces, "finished")}
        </section>
      )}

      {openRaces.length === 0 && closedRaces.length === 0 && finishedRaces.length === 0 && (
        <div className={`rounded-xl p-12 text-center ${isDark ? "bg-slate-900 text-slate-400" : "bg-white text-gray-400"}`}>
          <div className="text-4xl mb-3">🏇</div>
          <p>{searchQuery ? `「${searchQuery}」に一致するレースがありません` : "この日のレースはありません"}</p>
        </div>
      )}
    </div>
  );
}
