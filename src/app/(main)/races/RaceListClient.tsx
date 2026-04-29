"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "@/contexts/ThemeContext";
import {
  getWeekRaceDates,
  getSaturdayOfWeek,
  formatDateString,
  formatWeekRange,
  addDays,
} from "@/lib/dateUtils";

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

type VenueCondition = {
  course_name: string;
  turf_condition?: string;
  dirt_condition?: string;
  weather?: string;
  updated_at?: string;
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
  venueConditions?: VenueCondition[];
};

const VENUE_COLORS: Record<string, string> = {
  東京: "#2563eb",
  中山: "#16a34a",
  京都: "#16a34a",
  阪神: "#d97706",
  新潟: "#9333ea",
  福島: "#ec4899",
  小倉: "#f97316",
  札幌: "#0891b2",
  函館: "#0d9488",
  中京: "#dc2626",
};

const GRADE_BG: Record<string, string> = {
  G1: "bg-amber-500",
  G2: "bg-red-500",
  G3: "bg-green-600",
  OP: "bg-gray-500",
  L: "bg-blue-500",
};

export default function RaceListClient({
  openRaces,
  closedRaces,
  finishedRaces,
  votedRaceIds,
  votes,
  uniqueDates,
  uniqueCourses,
  selectedDate,
  selectedCourse,
  selectedGrade,
  searchQuery,
  venueConditions = [],
}: Props) {
  const { isDark } = useTheme();
  const router = useRouter();
  const [activeVenue, setActiveVenue] = useState<string | null>(
    selectedCourse || null
  );

  const allRaces = [...openRaces, ...closedRaces, ...finishedRaces];

  // Week navigation
  const currentDate = new Date(selectedDate + "T00:00:00+09:00");
  const currentWeekStart = getSaturdayOfWeek(currentDate);
  const weekDates = getWeekRaceDates(currentWeekStart);
  const prevWeekSat = addDays(currentWeekStart, -7);
  const nextWeekSat = addDays(currentWeekStart, 7);
  const prevWeekSatStr = formatDateString(prevWeekSat);
  const prevWeekSunStr = formatDateString(addDays(prevWeekSat, 1));
  const nextWeekSatStr = formatDateString(nextWeekSat);
  const nextWeekSunStr = formatDateString(addDays(nextWeekSat, 1));
  const hasPrevWeek =
    uniqueDates.includes(prevWeekSatStr) ||
    uniqueDates.includes(prevWeekSunStr);
  const hasNextWeek =
    uniqueDates.includes(nextWeekSatStr) ||
    uniqueDates.includes(nextWeekSunStr);

  // Styles
  const textPrimary = isDark ? "text-slate-100" : "text-gray-900";
  const textSecondary = isDark ? "text-slate-400" : "text-gray-500";
  const textMuted = isDark ? "text-slate-500" : "text-gray-400";

  const buildUrl = (params: {
    date?: string;
    course?: string;
    grade?: string;
    q?: string;
  }) => {
    const url = new URLSearchParams();
    if (params.date) url.set("date", params.date);
    if (params.course) url.set("course", params.course);
    if (params.grade) url.set("grade", params.grade);
    if (params.q) url.set("q", params.q);
    return `/races?${url.toString()}`;
  };

  const formatDayTab = (date: Date) => {
    const dayNames = ["日", "月", "火", "水", "木", "金", "土"];
    const m = date.getMonth() + 1;
    const d = date.getDate();
    return `${dayNames[date.getDay()]} ${m}/${d}`;
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

  // Group races by venue
  const venueRaces: Record<string, Race[]> = {};
  for (const race of allRaces) {
    const v = race.course_name || "不明";
    if (!venueRaces[v]) venueRaces[v] = [];
    venueRaces[v].push(race);
  }
  // Sort by race number within each venue
  for (const v of Object.keys(venueRaces)) {
    venueRaces[v].sort(
      (a, b) => (a.race_number ?? 0) - (b.race_number ?? 0)
    );
  }

  const venues = Object.keys(venueRaces);
  const currentVenueRaces = activeVenue
    ? venueRaces[activeVenue] || []
    : allRaces;

  const currentCondition = venueConditions.find(
    (vc) => vc.course_name === activeVenue
  );

  const getStatusBadge = (race: Race) => {
    if (race.status === "voting_open") {
      if (isVoted(race.id)) {
        return {
          text: "予想済",
          className: isDark
            ? "text-green-400"
            : "text-green-600",
        };
      }
      return {
        text: "受付中",
        className: `text-xs text-white ${
          isDark ? "bg-amber-500" : "bg-green-600"
        } px-2 py-0.5 rounded`,
      };
    }
    if (race.status === "voting_closed" || race.status === "running") {
      return {
        text: "締切",
        className: isDark ? "text-orange-400" : "text-orange-600",
      };
    }
    if (race.status === "finished") {
      const vote = getVote(race.id);
      if (vote?.status === "settled_hit") {
        return {
          text: "的中！",
          className: isDark
            ? "text-green-400 font-bold"
            : "text-green-600 font-bold",
        };
      }
      return {
        text: "確定",
        className: isDark ? "text-slate-500" : "text-gray-400",
      };
    }
    return { text: "", className: "" };
  };

  return (
    <div className="space-y-0">
      {/* Header */}
      <div className="flex items-center justify-between px-1 mb-3">
        <h1 className={`text-xl font-black ${textPrimary}`}>レース</h1>
        <div className="flex items-center gap-3">
          <span
            className={`text-xs font-medium ${textPrimary}`}
          >
            {new Date(selectedDate + "T00:00:00+09:00").toLocaleDateString(
              "ja-JP",
              { month: "short", day: "numeric", weekday: "short" }
            )}
          </span>
        </div>
      </div>

      {/* Week nav + day tabs */}
      <div className="flex items-center justify-center gap-3 mb-3">
        <button
          onClick={() => hasPrevWeek && handleWeekChange("prev")}
          disabled={!hasPrevWeek}
          className={`text-lg ${
            hasPrevWeek ? textSecondary : textMuted
          } disabled:opacity-30`}
        >
          ‹
        </button>
        <div className="flex gap-2">
          {weekDates.map((date) => {
            const dateStr = formatDateString(date);
            const hasData = uniqueDates.includes(dateStr);
            const isSelected = dateStr === selectedDate;
            if (!hasData) {
              return (
                <span
                  key={dateStr}
                  className={`px-3 py-1.5 rounded-full text-xs ${
                    isDark
                      ? "bg-slate-800 text-slate-600"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {formatDayTab(date)}
                </span>
              );
            }
            return (
              <Link
                key={dateStr}
                href={buildUrl({ date: dateStr })}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  isSelected
                    ? isDark
                      ? "bg-amber-500 text-slate-900 font-bold"
                      : "bg-green-600 text-white font-bold"
                    : isDark
                    ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {formatDayTab(date)}
              </Link>
            );
          })}
        </div>
        <button
          onClick={() => hasNextWeek && handleWeekChange("next")}
          disabled={!hasNextWeek}
          className={`text-lg ${
            hasNextWeek ? textSecondary : textMuted
          } disabled:opacity-30`}
        >
          ›
        </button>
      </div>

      {/* Venue tabs */}
      <div
        className={`flex border-b ${
          isDark ? "border-slate-700" : "border-gray-200"
        }`}
      >
        <button
          onClick={() => setActiveVenue(null)}
          className={`px-4 py-2.5 text-xs font-medium relative transition-colors ${
            activeVenue === null
              ? isDark
                ? "text-amber-400"
                : "text-green-600"
              : isDark
              ? "text-slate-500"
              : "text-gray-400"
          }`}
        >
          <div>全て</div>
          <div
            className={`text-[9px] ${
              activeVenue === null ? "" : "opacity-50"
            }`}
          >
            {allRaces.length}R
          </div>
          {activeVenue === null && (
            <div
              className={`absolute bottom-0 left-0 right-0 h-0.5 ${
                isDark ? "bg-amber-400" : "bg-green-600"
              }`}
            />
          )}
        </button>
        {venues.map((venue) => {
          const isActive = activeVenue === venue;
          const color = VENUE_COLORS[venue] || "#666";
          const openCount = venueRaces[venue].filter(
            (r) => r.status === "voting_open"
          ).length;
          return (
            <button
              key={venue}
              onClick={() => setActiveVenue(venue)}
              className={`px-4 py-2.5 text-xs font-medium relative transition-colors ${
                isActive
                  ? isDark
                    ? "text-amber-400"
                    : "text-green-600"
                  : isDark
                  ? "text-slate-500"
                  : "text-gray-400"
              }`}
            >
              <div>{venue}</div>
              <div
                className={`text-[9px] ${isActive ? "" : "opacity-50"}`}
              >
                {venueRaces[venue].length}R
              </div>
              {isActive && (
                <div
                  className={`absolute bottom-0 left-0 right-0 h-0.5`}
                  style={{ backgroundColor: color }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Track condition header (venue selected) */}
      {activeVenue && (
        <div
          className={`flex items-center gap-2 px-4 py-2 ${
            isDark ? "bg-slate-800/50" : "bg-green-50"
          }`}
        >
          <span className="text-sm">
            {currentCondition?.weather === "晴れ"
              ? "☀️"
              : currentCondition?.weather === "曇り"
              ? "☁️"
              : currentCondition?.weather === "雨"
              ? "🌧️"
              : "☀️"}
          </span>
          <span
            className={`text-xs ${
              isDark ? "text-green-400" : "text-green-800"
            }`}
          >
            芝: {currentCondition?.turf_condition || "良"} / ダ:{" "}
            {currentCondition?.dirt_condition || "良"}
          </span>
          {currentCondition?.updated_at && (
            <span className={`text-[9px] ml-auto ${textMuted}`}>
              {currentCondition.updated_at}更新
            </span>
          )}
          {!currentCondition && (
            <span className={`text-[9px] ml-auto ${textMuted}`}>
              馬場情報なし
            </span>
          )}
        </div>
      )}

      {/* Race list */}
      <div>
        {activeVenue ? (
          // Venue-specific: show as timeline
          <div className="px-4">
            {/* Featured race (G1/G2/G3) */}
            {currentVenueRaces
              .filter((r) => r.grade)
              .map((race) => {
                const gradeBg = GRADE_BG[race.grade ?? ""] || "bg-gray-500";
                const status = getStatusBadge(race);
                return (
                  <Link
                    key={race.id}
                    href={`/races/${race.id}`}
                    className="block"
                  >
                    <div
                      className={`my-3 border-2 rounded-xl p-3.5 ${
                        isDark
                          ? "border-amber-500/40 bg-amber-500/5"
                          : "border-amber-400 bg-amber-50"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <span
                          className={`text-[9px] text-white font-bold px-2 py-0.5 rounded ${gradeBg}`}
                        >
                          {race.grade}
                        </span>
                        <span
                          className={`text-[10px] ${
                            isDark ? "text-amber-400" : "text-amber-700"
                          } font-medium`}
                        >
                          {race.race_number}R
                        </span>
                        <span className={`text-[10px] ${textMuted} ml-auto`}>
                          {race.post_time
                            ? new Date(race.post_time).toLocaleTimeString(
                                "ja-JP",
                                { hour: "2-digit", minute: "2-digit" }
                              )
                            : ""}
                          発走
                        </span>
                      </div>
                      <div
                        className={`text-base font-bold mb-1 ${textPrimary}`}
                      >
                        {race.name}
                      </div>
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs ${
                            isDark ? "text-amber-300/70" : "text-amber-800/70"
                          }`}
                        >
                          {race.track_type === "turf" ? "芝" : race.track_type === "dirt" ? "ダ" : ""}
                          {race.distance}m
                          {race.head_count ? ` ${race.head_count}頭` : ""}
                        </span>
                        <span className={`text-xs font-medium ${status.className}`}>
                          {status.text}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}

            {/* Other races */}
            <div
              className={`rounded-xl border overflow-hidden ${
                isDark ? "border-slate-700" : "border-gray-200"
              }`}
            >
              {currentVenueRaces
                .filter((r) => !r.grade)
                .map((race, i, arr) => {
                  const status = getStatusBadge(race);
                  const isLast = i === arr.length - 1;
                  return (
                    <Link
                      key={race.id}
                      href={`/races/${race.id}`}
                      className={`flex items-center gap-2 px-3 py-2.5 ${
                        !isLast
                          ? isDark
                            ? "border-b border-slate-800"
                            : "border-b border-gray-50"
                          : ""
                      } ${
                        isDark ? "hover:bg-slate-800/50" : "hover:bg-gray-50"
                      } transition-colors`}
                    >
                      <span
                        className={`text-xs min-w-[28px] ${
                          isDark ? "text-slate-500" : "text-gray-400"
                        }`}
                      >
                        {race.race_number}R
                      </span>
                      <span
                        className={`text-sm flex-1 ${textPrimary} truncate`}
                      >
                        {race.name}
                      </span>
                      <span
                        className={`text-[10px] min-w-[52px] ${textMuted}`}
                      >
                        {race.track_type === "turf" ? "芝" : race.track_type === "dirt" ? "ダ" : ""}
                        {race.distance}m
                      </span>
                      <span
                        className={`text-[10px] min-w-[36px] text-right ${textMuted}`}
                      >
                        {race.post_time
                          ? new Date(race.post_time).toLocaleTimeString(
                              "ja-JP",
                              { hour: "2-digit", minute: "2-digit" }
                            )
                          : ""}
                      </span>
                      <span
                        className={`text-[10px] min-w-[36px] text-right font-medium ${status.className}`}
                      >
                        {status.text}
                      </span>
                    </Link>
                  );
                })}
            </div>
          </div>
        ) : (
          // All venues: grouped by venue in timeline format
          <div className="px-4 mt-3 space-y-6">
            {venues.length === 0 && (
              <div
                className={`rounded-xl p-12 text-center ${
                  isDark
                    ? "bg-slate-900 text-slate-400"
                    : "bg-white text-gray-400"
                }`}
              >
                <div className="text-4xl mb-3">🏇</div>
                <p>この日のレースはありません</p>
              </div>
            )}
            {venues.map((venue) => {
              const races = venueRaces[venue];
              const color = VENUE_COLORS[venue] || "#666";
              const venueCond = venueConditions.find(
                (vc) => vc.course_name === venue
              );
              const openCount = races.filter(
                (r) => r.status === "voting_open"
              ).length;
              const gradeRaces = races.filter((r) => r.grade);
              const otherRaces = races.filter((r) => !r.grade);

              return (
                <section key={venue}>
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <span
                      className={`text-sm font-bold ${textPrimary}`}
                    >
                      {venue}
                    </span>
                    <span className={`text-[10px] ${textMuted}`}>
                      {venueCond
                        ? `芝:${venueCond.turf_condition || "良"} / ダ:${venueCond.dirt_condition || "良"}`
                        : ""}
                    </span>
                    {openCount > 0 && (
                      <span
                        className={`text-[10px] ml-auto px-2 py-0.5 rounded-full ${
                          isDark
                            ? "bg-green-500/20 text-green-400"
                            : "bg-green-50 text-green-600"
                        }`}
                      >
                        {openCount}R受付中
                      </span>
                    )}
                  </div>

                  {/* Grade races */}
                  {gradeRaces.map((race) => {
                    const gradeBg =
                      GRADE_BG[race.grade ?? ""] || "bg-gray-500";
                    const status = getStatusBadge(race);
                    return (
                      <Link
                        key={race.id}
                        href={`/races/${race.id}`}
                        className="block"
                      >
                        <div
                          className={`mb-2 border-2 rounded-xl p-3 ${
                            isDark
                              ? "border-amber-500/40 bg-amber-500/5"
                              : "border-amber-400 bg-amber-50"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className={`text-[9px] text-white font-bold px-2 py-0.5 rounded ${gradeBg}`}
                            >
                              {race.grade}
                            </span>
                            <span
                              className={`text-[10px] font-medium ${
                                isDark
                                  ? "text-amber-400"
                                  : "text-amber-700"
                              }`}
                            >
                              {race.race_number}R
                            </span>
                            <span
                              className={`text-[10px] ml-auto ${textMuted}`}
                            >
                              {race.post_time
                                ? new Date(
                                    race.post_time
                                  ).toLocaleTimeString("ja-JP", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : ""}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <div
                                className={`text-sm font-bold ${textPrimary}`}
                              >
                                {race.name}
                              </div>
                              <span
                                className={`text-[10px] ${
                                  isDark
                                    ? "text-amber-300/70"
                                    : "text-amber-800/70"
                                }`}
                              >
                                {race.track_type === "turf"
                                  ? "芝"
                                  : race.track_type === "dirt"
                                  ? "ダ"
                                  : ""}
                                {race.distance}m
                                {race.head_count
                                  ? ` ${race.head_count}頭`
                                  : ""}
                              </span>
                            </div>
                            <span
                              className={`text-xs font-medium ${status.className}`}
                            >
                              {status.text}
                            </span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}

                  {/* Other races */}
                  {otherRaces.length > 0 && (
                    <div
                      className={`rounded-xl border overflow-hidden mb-2 ${
                        isDark ? "border-slate-700" : "border-gray-200"
                      }`}
                    >
                      {otherRaces.map((race, i, arr) => {
                        const status = getStatusBadge(race);
                        const isLast = i === arr.length - 1;
                        return (
                          <Link
                            key={race.id}
                            href={`/races/${race.id}`}
                            className={`flex items-center gap-2 px-3 py-2.5 ${
                              !isLast
                                ? isDark
                                  ? "border-b border-slate-800"
                                  : "border-b border-gray-50"
                                : ""
                            } ${
                              isDark
                                ? "hover:bg-slate-800/50"
                                : "hover:bg-gray-50"
                            } transition-colors`}
                          >
                            <span
                              className={`text-xs min-w-[28px] ${
                                isDark
                                  ? "text-slate-500"
                                  : "text-gray-400"
                              }`}
                            >
                              {race.race_number}R
                            </span>
                            <span
                              className={`text-sm flex-1 ${textPrimary} truncate`}
                            >
                              {race.name}
                            </span>
                            <span
                              className={`text-[10px] min-w-[52px] ${textMuted}`}
                            >
                              {race.track_type === "turf"
                                ? "芝"
                                : race.track_type === "dirt"
                                ? "ダ"
                                : ""}
                              {race.distance}m
                            </span>
                            <span
                              className={`text-[10px] min-w-[36px] text-right ${textMuted}`}
                            >
                              {race.post_time
                                ? new Date(
                                    race.post_time
                                  ).toLocaleTimeString("ja-JP", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : ""}
                            </span>
                            <span
                              className={`text-[10px] min-w-[36px] text-right font-medium ${status.className}`}
                            >
                              {status.text}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
