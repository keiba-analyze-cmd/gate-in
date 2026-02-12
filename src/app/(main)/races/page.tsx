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
