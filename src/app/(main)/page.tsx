import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { getRank } from "@/lib/constants/ranks";
import RaceCard from "@/components/races/RaceCard";
import LandingHero from "@/components/landing/LandingHero";
import NextRaceByVenue from "@/components/races/NextRaceByVenue";
import FollowingVotes from "@/components/social/FollowingVotes";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // ユーザーの投票済みレースを取得
  let votedRaceIds = new Set<string>();
  if (user) {
    const { data: myVotes } = await supabase
      .from("votes")
      .select("race_id")
      .eq("user_id", user.id);
    votedRaceIds = new Set((myVotes ?? []).map((v) => v.race_id));
  }

  // 投票受付中のレース（全件取得して競馬場ごとに分類）
  const { data: openRaces } = await supabase
    .from("races")
    .select("*")
    .eq("status", "voting_open")
    .order("post_time", { ascending: true })
    .limit(100);

  // 今週の重賞レース（grade付きを全て表示）
  const featuredRaces = openRaces?.filter((r) => r.grade) ?? [];

  // 競馬場ごとに最も発走が近いレースを1つずつ抽出
  const now = new Date();
  const venueNextRaces: { course_name: string; race: any }[] = [];
  const venueMap = new Map<string, any>();
  for (const race of openRaces ?? []) {
    if (!race.post_time || !race.course_name) continue;
    // まだ締切前のレースを優先（発走2分前）
    const deadline = new Date(race.post_time).getTime() - 2 * 60 * 1000;
    const existing = venueMap.get(race.course_name);
    if (!existing) {
      venueMap.set(race.course_name, race);
    } else {
      // まだ締切前のものがあればそちらを優先、なければ最も近いものを保持
      const existingDeadline = new Date(existing.post_time).getTime() - 2 * 60 * 1000;
      const existingOpen = now.getTime() < existingDeadline;
      const thisOpen = now.getTime() < deadline;
      if (thisOpen && !existingOpen) {
        venueMap.set(race.course_name, race);
      } else if (thisOpen && existingOpen && new Date(race.post_time) < new Date(existing.post_time)) {
        venueMap.set(race.course_name, race);
      }
    }
  }
  for (const [course_name, race] of venueMap) {
    venueNextRaces.push({ course_name, race });
  }
  // 発走時間順にソート
  venueNextRaces.sort((a, b) => new Date(a.race.post_time).getTime() - new Date(b.race.post_time).getTime());


  // 最近の結果
  const { data: recentResults } = await supabase
    .from("races")
    .select("*")
    .eq("status", "finished")
    .order("race_date", { ascending: false })
    .limit(3);

  


  // 未ログイン → ランディングページ
  if (!user) {
    return <LandingHero openRaces={openRaces ?? []} />;
  }

  return (
    <div className="space-y-5">
      {/* ====== 🔥 今週の重賞 ====== */}
      {featuredRaces.length > 0 && (
        <section>
          <h2 className="text-sm font-black text-gray-900 mb-3">🏆 今週の重賞</h2>
          <div className={`grid gap-3 ${featuredRaces.length === 1 ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}>
            {featuredRaces.map((race) => {
              const gradeColors: Record<string, string> = {
                G1: "from-yellow-500 to-yellow-600",
                G2: "from-red-500 to-red-600",
                G3: "from-green-500 to-green-600",
                OP: "from-gray-500 to-gray-600",
                L: "from-blue-500 to-blue-600",
              };
              const bg = gradeColors[race.grade ?? ""] ?? "from-green-500 to-green-600";
              return (
                <Link key={race.id} href={`/races/${race.id}`} className="block group">
                  <div className={`rounded-2xl p-4 text-white relative overflow-hidden bg-gradient-to-br ${bg} group-hover:shadow-lg transition-shadow`}>
                    <div className="flex items-start justify-between mb-2">
                      <span className="bg-white/25 text-white text-xs font-black px-2 py-0.5 rounded">
                        {race.grade}
                      </span>
                      <span className="text-white/70 text-xs font-medium">
                        {new Date(race.race_date + "T00:00:00+09:00").toLocaleDateString("ja-JP", { month: "short", day: "numeric", weekday: "short" })}
                      </span>
                    </div>
                    <h3 className="text-xl font-black mb-1">{race.name}</h3>
                    <p className="text-white/80 text-xs font-medium">
                      {race.course_name}
                      {race.distance && ` ${race.distance}`}
                      {race.head_count && ` ${race.head_count}頭`}
                    </p>
                    <div className="mt-3 text-right">
                      <span className="inline-block bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full group-hover:bg-white/30 transition-colors">
                        予想する →
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ====== 🏆 月間大会バナー ====== */}
      <Link href="/contest" className="block">
        <div className="rounded-2xl overflow-hidden border-2 border-purple-300 bg-gradient-to-br from-purple-600 to-purple-500 px-5 py-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🏆</span>
              <div>
                <div className="text-sm font-black">月間予想大会</div>
                <div className="text-xs text-purple-200 font-medium">近日開催予定！</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-purple-200">賞品</div>
              <div className="text-sm font-black">Amazonギフト券</div>
            </div>
          </div>
        </div>
      </Link>
      {/* ====== 🔥 投票受付中のレース（競馬場別） ====== */}
      {venueNextRaces.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-black text-gray-900">🔥 投票受付中</h2>
            <Link href="/races" className="text-xs text-blue-600 font-bold hover:underline">
              すべて見る →
            </Link>
          </div>
          <NextRaceByVenue venues={venueNextRaces} />
        </section>
      )}

      {/* ====== 👥 フォロー中の予想 ====== */}
      <section>
        <FollowingVotes />
      </section>

      {/* ====== 📊 最近の結果 ====== */}
      {recentResults && recentResults.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-black text-gray-900">📊 最近のレース結果</h2>
            <Link href="/races" className="text-xs text-blue-600 font-bold hover:underline">
              すべて見る →
            </Link>
          </div>
          <div className="space-y-2">
            {recentResults.map((race) => (
              <RaceCard key={race.id} race={race} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
