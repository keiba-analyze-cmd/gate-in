import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/admin";
import Link from "next/link";
import LandingPage from "@/components/landing/LandingPage";
import NextRaceByVenue from "@/components/races/NextRaceByVenue";
import G1FeatureCard from "@/components/races/G1FeatureCard";
import FollowingVotes from "@/components/social/FollowingVotes";
import AIPredictorStories from "@/components/social/AIPredictorStories";
import RecentResults from "@/components/social/RecentResults";
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
      .eq("user_id", user!.id);
    votedRaceIds = new Set((myVotes ?? []).map((v) => v.race_id));
  }

  // 投票受付中のレース
  const { data: openRaces } = await supabase
    .from("races")
    .select("*")
    .eq("status", "voting_open")
    .order("post_time", { ascending: true })
    .limit(100);

  // 重賞レース
  const featuredRaces = openRaces?.filter((r) => r.grade) ?? [];
  const g1Races = featuredRaces.filter((r) => r.grade === "G1");
  const otherGradeRaces = featuredRaces
    .filter((r) => r.grade === "G2" || r.grade === "G3")
    .sort((a, b) => {
      const order: Record<string, number> = { G2: 1, G3: 2 };
      return (order[a.grade] || 99) - (order[b.grade] || 99);
    });

  // 競馬場ごとの次レース
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

  // G1投票数
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
    .limit(5);

  // 最近の結果に対するユーザーの投票結果
  const recentRaceIds = (recentResults || []).map(r => r.id);
  let userResults: Record<string, { race_id: string; status: string; earned_points: number }> = {};
  if (user && recentRaceIds.length > 0) {
    const { data: myRecentVotes } = await supabase
      .from("votes")
      .select("race_id, status, earned_points")
      .eq("user_id", user!.id)
      .in("race_id", recentRaceIds);
    for (const v of myRecentVotes ?? []) {
      userResults[v.race_id] = v;
    }
  }

  // ══════════════════════════════════
  // 未ログイン → ランディングページ
  // ══════════════════════════════════
  if (!user) {
    const { count: racesCount } = await supabase.from("races").select("*", { count: "exact", head: true });
    const { count: horsesCount } = await supabase.from("horses").select("*", { count: "exact", head: true });
    const { count: votesCount } = await supabase.from("votes").select("*", { count: "exact", head: true });
    
    const stats = {
      races: racesCount ?? 0,
      horses: horsesCount ?? 0,
      votes: votesCount ?? 0,
    };
    
    const { data: heroSetting } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "hero_image")
      .single();
    
    const heroImage = heroSetting?.value ?? null;

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

  // ══════════════════════════════════
  // ログイン後: ストーリーズデータ取得
  // ══════════════════════════════════

  // AI予想家マスタ
  const { data: predictors } = await supabase
    .from("ai_predictors")
    .select("id, name, type_label, color_main, avatar_url")
    .eq("is_active", true)
    .order("sort_order");

  // 最新ストーリーコンテンツ（過去3日分のAI予想）
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const { data: storyPredictions } = await supabase
    .from("ai_predictions")
    .select(`
      id,
      predictor_id,
      race_id,
      umaban,
      horse_name,
      comment,
      created_at,
      races(id, name, grade, course_name, race_number, race_date)
    `)
    .gte("created_at", threeDaysAgo.toISOString())
    .order("created_at", { ascending: false });

  const stories = (storyPredictions || []).map(s => ({
    id: s.id,
    race_id: s.race_id,
    predictor_id: s.predictor_id,
    type: "prediction" as const,
    title: (s.races as any)?.name || "",
    race_name: (s.races as any)?.name || "",
    race_grade: (s.races as any)?.grade || null,
    race_course: (s.races as any)?.course_name || "",
    race_number: (s.races as any)?.race_number || null,
    race_date: (s.races as any)?.race_date || "",
    pick_number: s.umaban,
    pick_name: s.horse_name || "",
    comment: s.comment || "",
    created_at: s.created_at,
  }));

  // 既読ストーリーID
  let readStoryIds: string[] = [];
  const { data: reads } = await supabase
    .from("user_story_reads")
    .select("story_id")
    .eq("user_id", user!.id);
  readStoryIds = (reads || []).map(r => r.story_id);

  // 週間大会データ
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
      .eq("user_id", user!.id)
      .maybeSingle();
    myContestEntry = myEntry;
  }

  // ══════════════════════════════════
  // ログイン後: レンダリング
  // ══════════════════════════════════
  return (
    <div className="space-y-5">
      {/* ① AI予想家ストーリーズ */}
      {(predictors?.length ?? 0) > 0 && (
        <section>
          <AIPredictorStories
            predictors={(predictors || []).map(p => ({...p, theme_color: p.color_main, image_url: p.avatar_url}))}
            stories={stories}
            readStoryIds={readStoryIds}
            userId={user.id}
          />
        </section>
      )}

      {/* ② G1ヒーローカード */}
      {g1Races.length > 0 && (
        <section>
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

      {/* ③ G2/G3ミニカード */}
      {otherGradeRaces.length > 0 && (
        <section>
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


      {/* ④ 大会バナー */}
      <ContestBanner
        contest={activeContest}
        contestRaces={contestRaces}
        totalParticipants={totalParticipants}
        myVoteCount={myContestEntry?.vote_count ?? 0}
        isEligible={myContestEntry?.is_eligible ?? false}
      />

      {/* ⑤ フォロー中の予想 */}
      <section>
        <FollowingVotes />
      </section>

      {/* ⑥ 投票受付中（横スクロール） */}
      {venueNextRaces.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-black text-gray-900 dark:text-white">🔥 投票受付中</h2>
            <Link href="/races" className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline">
              すべて見る →
            </Link>
          </div>
          <NextRaceByVenue venues={venueNextRaces} />
        </section>
      )}

      {/* ⑦ 最近の結果 */}
      {recentResults && recentResults.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-black text-gray-900 dark:text-white">📊 最近の結果</h2>
            <Link href="/races" className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline">
              すべて見る →
            </Link>
          </div>
          <RecentResults races={recentResults} userResults={userResults} />
        </section>
      )}
    </div>
  );
}
