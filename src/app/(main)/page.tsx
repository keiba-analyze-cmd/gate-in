import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/admin";
import Link from "next/link";
import { getRank } from "@/lib/constants/ranks";
import RaceCard from "@/components/races/RaceCard";
import LandingPage from "@/components/landing/LandingPage";
import NextRaceByVenue from "@/components/races/NextRaceByVenue";
import G1FeatureCard from "@/components/races/G1FeatureCard";
import FollowingVotes from "@/components/social/FollowingVotes";
import PopularVotesSection from "@/components/social/PopularVotesSection";
import WeeklyMVPBanner from "@/components/social/WeeklyMVPBanner";
import { getArticles, getQuizQuestions } from "@/lib/microcms";
import ContestBanner from "@/components/contest/ContestBanner";

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
  
  // G1レースを分離（特別表示用）
  const g1Races = featuredRaces.filter((r) => r.grade === "G1");
  const otherGradeRaces = featuredRaces
    .filter((r) => r.grade === "G2" || r.grade === "G3")
    .sort((a, b) => {
      const order: Record<string, number> = { G2: 1, G3: 2 };
      return (order[a.grade] || 99) - (order[b.grade] || 99);
    });

  // 競馬場ごとに最も発走が近いレースを1つずつ抽出
  const now = new Date();
  const venueNextRaces: { course_name: string; race: any }[] = [];
  const venueMap = new Map<string, any>();
  for (const race of openRaces ?? []) {
    if (!race.post_time || !race.course_name) continue;
    const deadline = new Date(race.post_time).getTime() + 30 * 1000;
    const existing = venueMap.get(race.course_name);
    if (!existing) {
      venueMap.set(race.course_name, race);
    } else {
      const existingDeadline = new Date(existing.post_time).getTime() + 30 * 1000;
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
  venueNextRaces.sort((a, b) => new Date(a.race.post_time).getTime() - new Date(b.race.post_time).getTime());

  // G1レースの投票数を取得
  const g1VoteCounts: Record<string, number> = {};
  const admin = createAdminClient();
  for (const race of g1Races) {
    const { count } = await admin
      .from("votes")
      .select("*", { count: "exact", head: true })
      .eq("race_id", race.id);
    g1VoteCounts[race.id] = count ?? 0;
  }

  // 最近の結果
  const { data: recentResults } = await supabase
    .from("races")
    .select("*")
    .eq("status", "finished")
    .order("race_date", { ascending: false })
    .limit(3);

  // 未ログイン → ランディングページ
  if (!user) {
    // 実績数字を取得
    const { count: racesCount } = await supabase.from("races").select("*", { count: "exact", head: true });
    const { count: horsesCount } = await supabase.from("horses").select("*", { count: "exact", head: true });
    const { count: votesCount } = await supabase.from("votes").select("*", { count: "exact", head: true });
    
    const stats = {
      races: racesCount ?? 0,
      horses: horsesCount ?? 0,
      votes: votesCount ?? 0,
    };
    
    // HERO画像設定を取得
    const { data: heroSetting } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "hero_image")
      .single();
    
    const heroImage = heroSetting?.value ?? null;

    // LP用: 記事・クイズデータを取得
    const [articlesData, quizData] = await Promise.all([
      getArticles({ limit: 6 }).catch(() => ({ contents: [], totalCount: 0, offset: 0, limit: 6 })),
      getQuizQuestions({ limit: 20 }).catch(() => ({ contents: [], totalCount: 0, offset: 0, limit: 20 })),
    ]);

    const lpArticles = articlesData.contents.map((a) => ({
      id: a.id,
      title: a.title,
      emoji: a.emoji || "📖",
      categoryName: a.category?.name || "",
      readTime: a.readTime || 5,
    }));

    const lpQuizzes = quizData.contents
      .filter((q) => q.choice1 && q.choice2 && q.choice3 && q.choice4)
      .slice(0, 5)
      .map((q) => ({
        id: q.id,
        question: q.question,
        choices: [q.choice1, q.choice2, q.choice3 || '', q.choice4 || ''].map(c => String(c)),
        correctIndex: q.correctIndex - 1,
        explanation: (q.explanation || "").replace(/<[^>]*>/g, ""),
      }));
    
    return (
      <LandingPage
        openRaces={openRaces ?? []}
        stats={stats}
        heroImage={heroImage}
        articles={lpArticles}
        quizzes={lpQuizzes}
      />
    );
  }


  // 週間大会データ取得
  const { data: activeContest } = await supabase
    .from("contests")
    .select("*")
    .eq("type", "weekly")
    .eq("status", "active")
    .order("week_start", { ascending: false })
    .limit(1)
    .maybeSingle();

  let contestRaces: any[] = [];
  let myContestEntry: any = null;
  let totalParticipants = 0;

  if (activeContest) {
    const { data: races } = await supabase
      .from("contest_races")
      .select("*, races(id, name, course_name, race_number, post_time, status, grade)")
      .eq("contest_id", activeContest.id)
      .order("race_order", { ascending: true });
    contestRaces = races ?? [];

    const { count } = await supabase
      .from("contest_entries")
      .select("*", { count: "exact", head: true })
      .eq("contest_id", activeContest.id)
      .eq("is_eligible", true);
    totalParticipants = count ?? 0;

    const { data: myEntry } = await supabase
      .from("contest_entries")
      .select("*")
      .eq("contest_id", activeContest.id)
      .eq("user_id", user.id)
      .maybeSingle();
    myContestEntry = myEntry;
  }
  return (
    <div className="space-y-5">
      {/* ====== 👑 G1レース（特別表示） ====== */}
      {g1Races.length > 0 && (
        <section>
          <h2 className="text-sm font-black text-gray-900 dark:text-white mb-3">👑 今週のG1</h2>
          <div className="space-y-4">
            {g1Races.map((race) => (
              <G1FeatureCard 
                key={race.id} 
                race={race} 
                voteCount={g1VoteCounts[race.id] ?? 0} 
              />
            ))}
          </div>
        </section>
      )}

      {/* ====== 🏆 その他の重賞 ====== */}
      {otherGradeRaces.length > 0 && (
        <section>
          <h2 className="text-sm font-black text-gray-900 dark:text-white mb-3">🏆 今週の重賞</h2>
          <div className={`grid gap-3 ${otherGradeRaces.length === 1 ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}>
            {otherGradeRaces.map((race) => {
              const gradeColors: Record<string, string> = {
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


      {/* ====== 🏆 週間予想大会バナー ====== */}
      <ContestBanner
        contest={activeContest}
        contestRaces={contestRaces}
        totalParticipants={totalParticipants}
        myVoteCount={myContestEntry?.vote_count ?? 0}
        isEligible={myContestEntry?.is_eligible ?? false}
      />
      {/* ====== 🥇 週間MVP ====== */}
      <WeeklyMVPBanner />

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

      {/* ====== 📚 競馬道場への誘導 ====== */}
      <Link href="/dojo" className="block">
        <div className="rounded-2xl overflow-hidden border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📚</span>
              <div>
                <div className="text-sm font-black text-gray-900">競馬道場</div>
                <div className="text-xs text-gray-600 font-medium">クイズ＆記事で競馬力UP！</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">NEW</span>
              <span className="text-amber-600 font-bold">→</span>
            </div>
          </div>
        </div>
      </Link>

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
