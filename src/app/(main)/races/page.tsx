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

  // 投票データの型定義
  type VotePick = { pick_type: string; is_hit: boolean | null };
  type VoteData = {
    status: string;
    is_perfect?: boolean;
    vote_picks?: VotePick[];
  };

  const voteMap = new Map<string, VoteData>();
  const votedRaceIds: string[] = [];

  if (user) {
    // vote_picks を含めて取得
    const { data: myVotes } = await supabase
      .from("votes")
      .select("race_id, status, earned_points, is_perfect, vote_picks(pick_type, is_hit)")
      .eq("user_id", user.id);
      
    for (const v of myVotes ?? []) {
      votedRaceIds.push(v.race_id);
      voteMap.set(v.race_id, {
        status: v.status,
        is_perfect: v.is_perfect,
        vote_picks: v.vote_picks ?? [],
      });
    }
  }

  const { data: dateDays } = await supabase
    .from("races").select("race_date")
    .order("race_date", { ascending: false }).limit(100);
  const uniqueDates = [...new Set(dateDays?.map((d) => d.race_date) ?? [])];

  // 今週のレースが投票可能かチェック
  const now = new Date();
  const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const jstDay = jstNow.getUTCDay();
  
  // 今週の土日を計算
  const daysSinceThisSat = jstDay === 0 ? 1 : jstDay === 6 ? 0 : (jstDay + 1);
  const thisSat = new Date(jstNow);
  thisSat.setUTCDate(thisSat.getUTCDate() - daysSinceThisSat + (jstDay < 6 && jstDay !== 0 ? 6 : 0));
  const thisSatStr = thisSat.toISOString().split("T")[0];
  const thisSunStr = new Date(thisSat.getTime() + 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  
  // 今週のレースで投票可能なものがあるかチェック
  const { data: thisWeekOpenRaces } = await supabase
    .from("races")
    .select("id")
    .in("race_date", [thisSatStr, thisSunStr])
    .eq("status", "voting_open")
    .limit(1);
  
  const hasThisWeekOpenRaces = (thisWeekOpenRaces?.length ?? 0) > 0;

  let selectedDate: string = params.date ?? "";
  if (!selectedDate) {
    // 今日の曜日に応じてデフォルト日付を決定
    const jstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
    const todayDay = jstNow.getUTCDay();
    
    if (todayDay === 6 && uniqueDates.includes(thisSatStr)) {
      // 土曜日 → 土曜日
      selectedDate = thisSatStr;
    } else if (todayDay === 0 && uniqueDates.includes(thisSunStr)) {
      // 日曜日 → 日曜日
      selectedDate = thisSunStr;
    } else if (uniqueDates.includes(thisSunStr)) {
      // 平日 → 日曜日
      selectedDate = thisSunStr;
    } else if (uniqueDates.includes(thisSatStr)) {
      selectedDate = thisSatStr;
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

  // now は上で定義済み
  const isDeadlinePassed = (race: any): boolean => {
    if (!race.post_time) return false;
    const deadline = new Date(race.post_time).getTime() + 30 * 1000;
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

  // votes オブジェクトを作成
  const votes: Record<string, VoteData> = Object.fromEntries(voteMap);

  return (
    <RaceListClient
      openRaces={openRaces}
      closedRaces={closedRaces}
      finishedRaces={finishedRaces}
      votedRaceIds={votedRaceIds}
      votes={votes}
      uniqueDates={uniqueDates}
      uniqueCourses={uniqueCourses}
      selectedDate={selectedDate}
      selectedCourse={params.course ?? ""}
      selectedGrade={params.grade ?? ""}
      searchQuery={params.q ?? ""}
    />
  );
}
