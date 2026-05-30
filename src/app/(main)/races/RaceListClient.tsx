"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getWeekRaceDates,
  getSaturdayOfWeek,
  formatDateString,
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

// グレード＝意味色のアクセント（G1金・G2赤・G3青）
const GRADE_ACCENT: Record<string, string> = {
  G1: "var(--gate-gold-strong)",
  G2: "var(--danger)",
  G3: "var(--info)",
  OP: "var(--ink-3)",
  L: "var(--info)",
};
const gradeAccent = (grade: string | null) => GRADE_ACCENT[grade ?? ""] ?? "var(--brand)";

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
  for (const v of Object.keys(venueRaces)) {
    venueRaces[v].sort((a, b) => (a.race_number ?? 0) - (b.race_number ?? 0));
  }

  const venues = Object.keys(venueRaces);
  const currentVenueRaces = activeVenue ? venueRaces[activeVenue] || [] : allRaces;
  const currentCondition = venueConditions.find((vc) => vc.course_name === activeVenue);

  const timeStr = (postTime?: string | null) =>
    postTime
      ? new Date(postTime).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })
      : "";

  // ステータス表記（トークン色）
  const getStatusBadge = (race: Race): { text: string; className: string } => {
    if (race.status === "voting_open") {
      if (isVoted(race.id)) return { text: "予想済", className: "text-brand-strong font-bold" };
      return { text: "受付中", className: "text-white bg-brand px-2 py-0.5 rounded" };
    }
    if (race.status === "voting_closed" || race.status === "running") {
      return { text: "締切", className: "text-danger font-bold" };
    }
    if (race.status === "finished") {
      const vote = getVote(race.id);
      if (vote?.status === "settled_hit") return { text: "的中！", className: "text-brand-strong font-bold" };
      return { text: "確定", className: "text-ink-3" };
    }
    return { text: "", className: "" };
  };

  const trackLabel = (race: Race) =>
    race.track_type === "turf" ? "芝" : race.track_type === "dirt" ? "ダ" : "";

  // 重賞カード（共通カード＋左に意味色アクセント帯）
  const renderGradeCard = (race: Race, margin: string) => {
    const ac = gradeAccent(race.grade);
    const status = getStatusBadge(race);
    return (
      <Link key={race.id} href={`/races/${race.id}`} className="block">
        <div
          className={`relative overflow-hidden rounded-2xl bg-surface border border-line p-3.5 pl-4 hover:shadow-md transition-shadow ${margin}`}
        >
          <span className="absolute left-0 top-0 bottom-0 w-1.5" style={{ background: ac }} />
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className="text-[10px] text-white font-black px-2 py-0.5 rounded"
              style={{ background: ac }}
            >
              {race.grade}
            </span>
            <span className="text-[10px] font-bold text-ink-2 font-data">{race.race_number}R</span>
            <span className="text-[10px] text-ink-3 ml-auto font-data">
              {timeStr(race.post_time)}発走
            </span>
          </div>
          <div className="text-base font-black text-ink mb-1">{race.name}</div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-ink-2">
              {trackLabel(race)}
              {race.distance}m
              {race.head_count ? ` ${race.head_count}頭` : ""}
            </span>
            <span className={`text-xs font-medium ${status.className}`}>{status.text}</span>
          </div>
        </div>
      </Link>
    );
  };

  // 一般レースの行
  const renderRaceRow = (race: Race, isLast: boolean) => {
    const status = getStatusBadge(race);
    return (
      <Link
        key={race.id}
        href={`/races/${race.id}`}
        className={`flex items-center gap-2 px-3 py-2.5 hover:bg-surface-2 transition-colors ${
          !isLast ? "border-b border-line" : ""
        }`}
      >
        <span className="text-xs min-w-[28px] text-ink-3 font-data">{race.race_number}R</span>
        <span className="text-sm flex-1 text-ink truncate">{race.name}</span>
        <span className="text-[10px] min-w-[52px] text-ink-3">
          {trackLabel(race)}
          {race.distance}m
        </span>
        <span className="text-[10px] min-w-[36px] text-right text-ink-3 font-data">
          {timeStr(race.post_time)}
        </span>
        <span className={`text-[10px] min-w-[40px] text-right font-medium ${status.className}`}>
          {status.text}
        </span>
      </Link>
    );
  };

  return (
    <div className="space-y-0" style={{ fontFamily: "var(--font-rounded)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-1 mb-3">
        <h1 className="text-xl font-black text-ink">レース</h1>
        <span className="text-xs font-medium text-ink-2 font-data">
          {new Date(selectedDate + "T00:00:00+09:00").toLocaleDateString("ja-JP", {
            month: "short",
            day: "numeric",
            weekday: "short",
          })}
        </span>
      </div>

      {/* Week nav + day tabs */}
      <div className="flex items-center justify-center gap-3 mb-3">
        <button
          onClick={() => hasPrevWeek && handleWeekChange("prev")}
          disabled={!hasPrevWeek}
          className="text-lg text-ink-2 disabled:opacity-30"
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
                  className="px-3 py-1.5 rounded-full text-xs bg-surface-2 text-ink-3"
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
                    ? "bg-brand text-white font-bold"
                    : "bg-surface-2 text-ink-2 hover:opacity-80"
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
          className="text-lg text-ink-2 disabled:opacity-30"
        >
          ›
        </button>
      </div>

      {/* Venue tabs */}
      <div className="flex border-b border-line overflow-x-auto scrollbar-hide">
        <button
          onClick={() => setActiveVenue(null)}
          className={`px-4 py-2.5 text-xs font-medium relative transition-colors ${
            activeVenue === null ? "text-brand-strong" : "text-ink-3"
          }`}
        >
          <div>全て</div>
          <div className={`text-[9px] font-data ${activeVenue === null ? "" : "opacity-50"}`}>
            {allRaces.length}R
          </div>
          {activeVenue === null && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand" />
          )}
        </button>
        {venues.map((venue) => {
          const isActive = activeVenue === venue;
          const color = VENUE_COLORS[venue] || "#666";
          const openCount = venueRaces[venue].filter((r) => r.status === "voting_open").length;
          return (
            <button
              key={venue}
              onClick={() => setActiveVenue(venue)}
              className={`px-4 py-2.5 text-xs font-medium relative transition-colors whitespace-nowrap ${
                isActive ? "text-brand-strong" : "text-ink-3"
              }`}
            >
              <div>{venue}</div>
              <div className={`text-[9px] font-data ${isActive ? "" : "opacity-50"}`}>
                {venueRaces[venue].length}R
              </div>
              {isActive && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-0.5"
                  style={{ backgroundColor: color }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Track condition header (venue selected) */}
      {activeVenue && (
        <div className="flex items-center gap-2 px-4 py-2 bg-surface-2">
          <span className="text-sm">
            {currentCondition?.weather === "晴れ"
              ? "☀️"
              : currentCondition?.weather === "曇り"
              ? "☁️"
              : currentCondition?.weather === "雨"
              ? "🌧️"
              : "☀️"}
          </span>
          <span className="text-xs text-ink-2">
            芝: {currentCondition?.turf_condition || "良"} / ダ:{" "}
            {currentCondition?.dirt_condition || "良"}
          </span>
          {currentCondition?.updated_at && (
            <span className="text-[9px] ml-auto text-ink-3">
              {currentCondition.updated_at}更新
            </span>
          )}
          {!currentCondition && (
            <span className="text-[9px] ml-auto text-ink-3">馬場情報なし</span>
          )}
        </div>
      )}

      {/* Race list */}
      <div>
        {activeVenue ? (
          // Venue-specific
          <div className="px-4">
            {currentVenueRaces.filter((r) => r.grade).map((race) => renderGradeCard(race, "my-3"))}

            <div className="rounded-2xl border border-line bg-surface overflow-hidden">
              {currentVenueRaces
                .filter((r) => !r.grade)
                .map((race, i, arr) => renderRaceRow(race, i === arr.length - 1))}
            </div>
          </div>
        ) : (
          // All venues grouped
          <div className="px-4 mt-3 space-y-6">
            {venues.length === 0 && (
              <div className="rounded-2xl border border-line bg-surface p-12 text-center text-ink-3">
                <div className="text-4xl mb-3">🏇</div>
                <p>この日のレースはありません</p>
              </div>
            )}
            {venues.map((venue) => {
              const races = venueRaces[venue];
              const color = VENUE_COLORS[venue] || "#666";
              const venueCond = venueConditions.find((vc) => vc.course_name === venue);
              const openCount = races.filter((r) => r.status === "voting_open").length;
              const gradeRaces = races.filter((r) => r.grade);
              const otherRaces = races.filter((r) => !r.grade);

              return (
                <section key={venue}>
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-sm font-bold text-ink">{venue}</span>
                    <span className="text-[10px] text-ink-3">
                      {venueCond
                        ? `芝:${venueCond.turf_condition || "良"} / ダ:${venueCond.dirt_condition || "良"}`
                        : ""}
                    </span>
                    {openCount > 0 && (
                      <span className="text-[10px] ml-auto px-2 py-0.5 rounded-full bg-brand-soft text-brand-strong font-bold">
                        {openCount}R受付中
                      </span>
                    )}
                  </div>

                  {gradeRaces.map((race) => renderGradeCard(race, "mb-2"))}

                  {otherRaces.length > 0 && (
                    <div className="rounded-2xl border border-line bg-surface overflow-hidden mb-2">
                      {otherRaces.map((race, i, arr) => renderRaceRow(race, i === arr.length - 1))}
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
