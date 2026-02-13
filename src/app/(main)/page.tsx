import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { getRank } from "@/lib/constants/ranks";
import RaceCard from "@/components/races/RaceCard";
import LandingHero from "@/components/landing/LandingHero";

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

  // 投票受付中のレース
  const { data: openRaces } = await supabase
    .from("races")
    .select("*")
    .eq("status", "voting_open")
    .order("race_date", { ascending: true })
    .limit(6);

  // 今週の重賞レース（grade付きを全て表示）
  const featuredRaces = openRaces?.filter((r) => r.grade) ?? [];
  const otherRaces = openRaces?.filter((r) => !r.grade) ?? [];


  // 最近の結果
  const { data: recentResults } = await supabase
    .from("races")
    .select("*")
    .eq("status", "finished")
    .order("race_date", { ascending: false })
    .limit(3);

  // 盛り上がりコメント
  const { data: hotComments } = await supabase
    .from("comments")
    .select("id, user_id, body, sentiment, profiles(display_name, rank_id)")
    .is("parent_id", null)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
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
      {/* ====== 🔥 投票受付中のレース ====== */}
      {otherRaces.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-black text-gray-900">🔥 投票受付中のレース</h2>
            <Link href="/races" className="text-xs text-blue-600 font-bold hover:underline">
              すべて見る →
            </Link>
          </div>
          <div className="space-y-2">
            {otherRaces.map((race) => (
              <RaceCard key={race.id} race={race} voted={votedRaceIds.has(race.id)} />
            ))}
          </div>
        </section>
      )}

      {/* ====== 💬 盛り上がりコメント ====== */}
      {hotComments && hotComments.length > 0 && (
        <section>
          <h2 className="text-sm font-black text-gray-900 mb-3">💬 盛り上がりコメント</h2>
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden divide-y divide-gray-100">
            {hotComments.map((comment) => {
              const rank = comment.profiles ? getRank((comment.profiles as any).rank_id) : null;
              const sentimentIcon: Record<string, string> = {
                very_positive: "🔥", positive: "👍", negative: "🤔", very_negative: "⚠️",
              };
              return (
                <div key={comment.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                  <Link href={`/users/${comment.user_id}`} className="flex items-center gap-2 mb-1.5 group">
                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-[10px]">👤</div>
                    <span className="text-xs font-bold text-gray-900 group-hover:text-green-600">
                      {(comment.profiles as any)?.display_name ?? "匿名"}
                    </span>
                    {rank && (
                      <span className="text-[10px] text-yellow-700 bg-yellow-50 px-1.5 py-0.5 rounded-full font-bold">
                        {rank.icon} {rank.name}
                      </span>
                    )}
                    {comment.sentiment && (
                      <span className="text-[10px]">{sentimentIcon[comment.sentiment]}</span>
                    )}
                  </Link>
                  <p className="text-xs text-gray-700 ml-8 line-clamp-2">{comment.body}</p>
                </div>
              );
            })}
          </div>
        </section>
      )}

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
