export const revalidate = 60;

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

  const { data: { user } } = await supabase.auth.getUser();

  // 投票＋結果情報を取得
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

  // 日付一覧
  const { data: dateDays } = await supabase
    .from("races").select("race_date")
    .order("race_date", { ascending: false }).limit(100);
  const uniqueDates = [...new Set(dateDays?.map((d) => d.race_date) ?? [])];
  const selectedDate = params.date ?? uniqueDates[0] ?? "";

  // レース取得
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

  // 競馬場一覧
  const { data: allRacesForDay } = await supabase
    .from("races").select("course_name").eq("race_date", selectedDate);
  const uniqueCourses = [...new Set(allRacesForDay?.map((r) => r.course_name) ?? [])];

  // 現在時刻で締切判定
  const now = new Date();
  const isDeadlinePassed = (race: any): boolean => {
    if (!race.post_time) return false;
    const deadline = new Date(race.post_time).getTime() - 2 * 60 * 1000;
    return now.getTime() > deadline;
  };

  // セクション分け
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

  const getVoteResult = (raceId: string) => voteMap.get(raceId)?.result ?? "none";
  const isVoted = (raceId: string) => voteMap.has(raceId);

  const renderRaceCards = (list: typeof filteredRaces, section: "open" | "closed" | "finished") => (
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
        <h1 className="text-xl font-bold text-gray-800">🏇 レース一覧</h1>
        <a href="/races/calendar" className="text-sm text-green-600 hover:text-green-700 font-bold bg-green-50 px-3 py-1.5 rounded-lg border border-green-200">📅 カレンダー</a>
      </div>

      <RaceSearchBar initialQuery={params.q ?? ""} date={selectedDate} course={params.course ?? ""} grade={params.grade ?? ""} />
      <DateFilter dates={uniqueDates} selected={selectedDate} course={params.course} />
      <CourseFilter courses={uniqueCourses} selected={params.course ?? ""} date={selectedDate} />
      <GradeFilter selected={params.grade ?? ""} date={selectedDate} course={params.course ?? ""} />

      {params.q && (
        <div className="text-sm text-gray-500">「{params.q}」の検索結果: {filteredRaces.length}件</div>
      )}

      {/* 🗳 受付中 */}
      {openRaces.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-sm font-bold text-green-700">🗳 受付中</h2>
            <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full font-medium">{openRaces.length}件</span>
          </div>
          {renderRaceCards(openRaces, "open")}
        </section>
      )}

      {/* ⏰ 投票締切 */}
      {closedRaces.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-sm font-bold text-orange-600">⏰ 投票締切</h2>
            <span className="text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full font-medium">{closedRaces.length}件</span>
          </div>
          {renderRaceCards(closedRaces, "closed")}
        </section>
      )}

      {/* 📊 結果確定 */}
      {finishedRaces.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-sm font-bold text-gray-600">📊 結果確定</h2>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full font-medium">{finishedRaces.length}件</span>
          </div>
          {renderRaceCards(finishedRaces, "finished")}
        </section>
      )}

      {filteredRaces.length === 0 && (
        <div className="bg-white rounded-xl p-12 text-center text-gray-400">
          <div className="text-4xl mb-3">🏇</div>
          <p>{params.q ? `「${params.q}」に一致するレースがありません` : "この日のレースはありません"}</p>
        </div>
      )}
    </div>
  );
}
