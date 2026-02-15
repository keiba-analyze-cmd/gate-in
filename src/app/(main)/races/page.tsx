export const revalidate = 60;

import { createClient } from "@/lib/supabase/server";
import RaceListClient from "./RaceListClient";
import { getDefaultRaceDate, formatDateString } from "@/lib/dateUtils";

type Props = {
  searchParams: Promise<{ date?: string; course?: string; grade?: string; q?: string }>;
};

export default async function RaceListPage({ searchParams }: Props) {
  const params = await searchParams;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  type VoteInfo = { voted: boolean; result: "none" | "pending" | "hit" | "miss" };
  const voteMap = new Map<string, VoteInfo>();
  if (user) {
    const { data: myVotes } = await supabase
      .from("votes")
      .select("race_id, status, earned_points")
      .eq("user_id", user.id);
    for (const v of myVotes ?? []) {
      voteMap.set(v.race_id, {
        voted: true,
        result: v.status === "pending" ? "pending"
          : v.status === "settled_hit" ? "hit"
          : v.status !== "pending" ? "miss"
          : "none",
      });
    }
  }

  const { data: dateDays } = await supabase
    .from("races").select("race_date")
    .order("race_date", { ascending: false }).limit(100);
  const uniqueDates = [...new Set(dateDays?.map((d) => d.race_date) ?? [])];

  let selectedDate: string = params.date ?? "";
  if (!selectedDate) {
    const defaultDate = getDefaultRaceDate();
    const defaultDateStr = formatDateString(defaultDate);
    if (uniqueDates.includes(defaultDateStr)) {
      selectedDate = defaultDateStr;
    } else {
      selectedDate = uniqueDates[0] ?? "";
    }
  }

  let query = supabase.from("races").select("*")
    .eq("race_date", selectedDate)
    .order("post_time", { ascending: true });
  if (params.course) query = query.eq("course_name", params.course);
  if (params.grade) query = query.eq("grade", params.grade);

  const { data: races } = await query;

  let filteredRaces = races ?? [];
  if (params.q) {
    const q = params.q.toLowerCase();
    filteredRaces = filteredRaces.filter((r) =>
      r.name.toLowerCase().includes(q) || (r.course_name ?? "").toLowerCase().includes(q)
    );
  }

  const { data: allRacesForDay } = await supabase
    .from("races").select("course_name").eq("race_date", selectedDate);
  const uniqueCourses = [...new Set(allRacesForDay?.map((r) => r.course_name) ?? [])];

  const now = new Date();
  const isDeadlinePassed = (race: any): boolean => {
    if (!race.post_time) return false;
    const deadline = new Date(race.post_time).getTime() - 2 * 60 * 1000;
    return now.getTime() > deadline;
  };

  const gradeOpen: typeof filteredRaces = [];
  const gradeClosed: typeof filteredRaces = [];
  const gradeFinished: typeof filteredRaces = [];
  const normalOpen: typeof filteredRaces = [];
  const normalClosed: typeof filteredRaces = [];
  const normalFinished: typeof filteredRaces = [];

  for (const race of filteredRaces) {
    const finished = race.status === "finished";
    const closed = !finished && (race.status === "voting_closed" || isDeadlinePassed(race));
    const isGrade = !!race.grade;

    if (finished) {
      (isGrade ? gradeFinished : normalFinished).push(race);
    } else if (closed) {
      (isGrade ? gradeClosed : normalClosed).push(race);
    } else {
      (isGrade ? gradeOpen : normalOpen).push(race);
    }
  }

  const openRaces = [...gradeOpen, ...normalOpen];
  const closedRaces = [...gradeClosed, ...normalClosed];
  const finishedRaces = [...gradeFinished, ...normalFinished];

  const voteResults: Record<string, "pending" | "hit" | "miss"> = {};
  const votedRaceIds: string[] = [];
  for (const [raceId, info] of voteMap) {
    votedRaceIds.push(raceId);
    if (info.result !== "none") {
      voteResults[raceId] = info.result;
    }
  }

  return (
    <RaceListClient
      openRaces={openRaces}
      closedRaces={closedRaces}
      finishedRaces={finishedRaces}
      votedRaceIds={votedRaceIds}
      voteResults={voteResults}
      uniqueDates={uniqueDates}
      uniqueCourses={uniqueCourses}
      selectedDate={selectedDate}
      selectedCourse={params.course ?? ""}
      selectedGrade={params.grade ?? ""}
      searchQuery={params.q ?? ""}
    />
  );
}
