"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import RaceCard from "@/components/races/RaceCard";
import { useTheme } from "@/contexts/ThemeContext";
import { getWeekRaceDates, getSaturdayOfWeek, formatDateString, formatWeekRange, addDays } from "@/lib/dateUtils";

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

type VotePick = { pick_type: string; is_hit: boolean | null };
type VoteData = {
  status: string;
  is_perfect?: boolean;
  vote_picks?: VotePick[];
};

type Props = {
  openRaces: Race[];
  closedRaces: Race[];
  finishedRaces: Race[];
  votedRaceIds: string[];
  votes: Record<string, VoteData>;
  uniqueDates: string[];
  uniqueCourses: string[];
  selectedDate: string;
  selectedCourse: string;
  selectedGrade: string;
  searchQuery: string;
};

export default function RaceListClient({
  openRaces, closedRaces, finishedRaces, votedRaceIds, votes,
  uniqueDates, uniqueCourses, selectedDate, selectedCourse, selectedGrade, searchQuery
}: Props) {
  const { isDark } = useTheme();
  const router = useRouter();

  const currentDate = new Date(selectedDate + "T00:00:00+09:00");
  const currentWeekStart = getSaturdayOfWeek(currentDate);
  const weekDates = getWeekRaceDates(currentWeekStart);
  
  const prevWeekSat = addDays(currentWeekStart, -7);
  const nextWeekSat = addDays(currentWeekStart, 7);
  const prevWeekSatStr = formatDateString(prevWeekSat);
  const prevWeekSunStr = formatDateString(addDays(prevWeekSat, 1));
  const nextWeekSatStr = formatDateString(nextWeekSat);
  const nextWeekSunStr = formatDateString(addDays(nextWeekSat, 1));
  
  const hasPrevWeek = uniqueDates.includes(prevWeekSatStr) || uniqueDates.includes(prevWeekSunStr);
  const hasNextWeek = uniqueDates.includes(nextWeekSatStr) || uniqueDates.includes(nextWeekSunStr);

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

  const formatDayTab = (date: Date) => {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dayNames = ["日曜", "月曜", "火曜", "水曜", "木曜", "金曜", "土曜"];
    return `${dayNames[date.getDay()]} ${month}/${day}`;
  };

  const handleWeekChange = (direction: "prev" | "next") => {
    const targetWeekSat = direction === "prev" ? prevWeekSat : nextWeekSat;
    const satStr = formatDateString(targetWeekSat);
    const sunStr = formatDateString(addDays(targetWeekSat, 1));
    const targetDate = uniqueDates.includes(satStr) ? satStr : sunStr;
    router.push(buildUrl({ date: targetDate }));
  };

  const isVoted = (raceId: string) => votedRaceIds.includes(raceId);
  const getVote = (raceId: string) => votes[raceId] ?? null;

  const renderRaceCards = (list: Race[], section: "open" | "closed" | "finished") => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {list.map((race) => (
        <RaceCard
          key={race.id}
          race={race}
          voted={isVoted(race.id)}
          vote={section === "finished" ? getVote(race.id) : null}
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

      {/* 週スライダー */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => hasPrevWeek && handleWeekChange("prev")}
          disabled={!hasPrevWeek}
          className={`w-10 h-10 flex items-center justify-center rounded-full text-xl font-bold transition-all ${
            hasPrevWeek
              ? isDark ? "bg-slate-700 hover:bg-slate-600 text-slate-300" : "bg-gray-100 hover:bg-gray-200 text-gray-600"
              : isDark ? "bg-slate-800 text-slate-600 cursor-not-allowed" : "bg-gray-50 text-gray-300 cursor-not-allowed"
          }`}
        >
          ‹
        </button>
        <span className={`font-bold text-base min-w-[160px] text-center ${textPrimary}`}>
          {formatWeekRange(currentWeekStart)}
        </span>
        <button
          onClick={() => hasNextWeek && handleWeekChange("next")}
          disabled={!hasNextWeek}
          className={`w-10 h-10 flex items-center justify-center rounded-full text-xl font-bold transition-all ${
            hasNextWeek
              ? isDark ? "bg-slate-700 hover:bg-slate-600 text-slate-300" : "bg-gray-100 hover:bg-gray-200 text-gray-600"
              : isDark ? "bg-slate-800 text-slate-600 cursor-not-allowed" : "bg-gray-50 text-gray-300 cursor-not-allowed"
          }`}
        >
          ›
        </button>
      </div>

      {/* 日付タブ（土曜→日曜の順） */}
      <div className="flex gap-2 justify-center">
        {weekDates.map((date) => {
          const dateStr = formatDateString(date);
          const hasData = uniqueDates.includes(dateStr);
          const isSelected = dateStr === selectedDate;
          
          if (!hasData) {
            return (
              <span key={dateStr} className={`px-5 py-2 rounded-full text-sm font-medium ${isDark ? "bg-slate-800 text-slate-600" : "bg-gray-100 text-gray-400"}`}>
                {formatDayTab(date)}
              </span>
            );
          }
          
          return (
            <Link
              key={dateStr}
              href={buildUrl({ date: dateStr, course: selectedCourse, grade: selectedGrade, q: searchQuery || undefined })}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${isSelected ? chipActive + " font-bold" : chipInactive}`}
            >
              {formatDayTab(date)}
            </Link>
          );
        })}
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

      {/* 競馬場フィルター */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <span className={`text-xs shrink-0 self-center ${textSecondary}`}>競馬場:</span>
        <Link href={buildUrl({ date: selectedDate, grade: selectedGrade, q: searchQuery || undefined })} className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors shrink-0 ${!selectedCourse ? chipActive : chipInactive}`}>
          全て
        </Link>
        {uniqueCourses.map((course) => (
          <Link key={course} href={buildUrl({ date: selectedDate, course, grade: selectedGrade, q: searchQuery || undefined })} className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors shrink-0 ${selectedCourse === course ? chipActive : chipInactive}`}>
            {course}
          </Link>
        ))}
      </div>

      {/* グレードフィルター */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <span className={`text-xs shrink-0 self-center ${textSecondary}`}>グレード:</span>
        <Link href={buildUrl({ date: selectedDate, course: selectedCourse, q: searchQuery || undefined })} className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors shrink-0 ${!selectedGrade ? chipActive : chipInactive}`}>
          全て
        </Link>
        {grades.map((grade) => (
          <Link key={grade} href={buildUrl({ date: selectedDate, course: selectedCourse, grade, q: searchQuery || undefined })} className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors shrink-0 ${selectedGrade === grade ? chipActive : chipInactive}`}>
            {grade === "L" ? "Listed" : grade}
          </Link>
        ))}
      </div>

      {searchQuery && (
        <div className={`text-sm ${textSecondary}`}>「{searchQuery}」の検索結果: {openRaces.length + closedRaces.length + finishedRaces.length}件</div>
      )}

      {openRaces.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-2">
            <h2 className={`text-sm font-black ${isDark ? "text-green-400" : "text-green-700"}`}>🗳 受付中</h2>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isDark ? "text-green-400 bg-green-500/20" : "text-green-600 bg-green-50"}`}>{openRaces.length}件</span>
          </div>
          {renderRaceCards(openRaces, "open")}
        </section>
      )}

      {closedRaces.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-2">
            <h2 className={`text-sm font-black ${isDark ? "text-orange-400" : "text-orange-600"}`}>⏰ 投票締切</h2>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isDark ? "text-orange-400 bg-orange-500/20" : "text-orange-600 bg-orange-50"}`}>{closedRaces.length}件</span>
          </div>
          {renderRaceCards(closedRaces, "closed")}
        </section>
      )}

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
