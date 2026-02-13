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

  // 今月の大会
  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const { data: contest } = await supabase
    .from("contests")
    .select("*")
    .eq("year_month", yearMonth)
    .eq("status", "active")
    .maybeSingle();

  // 自分の大会エントリー
  let myContestEntry: any = null;
  let contestEntryCount = 0;
  if (contest && user) {
    const { data } = await supabase
      .from("contest_entries")
      .select("*")
      .eq("contest_id", contest.id)
      .eq("user_id", user.id)
      .maybeSingle();
    myContestEntry = data;

    if (myContestEntry) {
      const { count } = await supabase
        .from("contest_entries")
        .select("*", { count: "exact", head: true })
        .eq("contest_id", contest.id)
        .gt("total_points", myContestEntry.total_points);
      myContestEntry.ranking = (count ?? 0) + 1;
    }

    const { count: ec } = await supabase
      .from("contest_entries")
      .select("*", { count: "exact", head: true })
      .eq("contest_id", contest.id);
    contestEntryCount = ec ?? 0;
  }

  // 大会上位3名
  let top3: any[] = [];
  if (contest) {
    const { data } = await supabase
      .from("contest_entries")
      .select("total_points, profiles(display_name)")
      .eq("contest_id", contest.id)
      .order("total_points", { ascending: false })
      .limit(3);
    top3 = data ?? [];
  }

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

  const monthLabel = `${now.getMonth() + 1}月`;
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const daysLeft = Math.max(0, Math.ceil((endOfMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

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
      {contest && (
        <Link href="/contest" className="block">
          <div className="rounded-2xl overflow-hidden border-2 border-yellow-400">
            <div
              className="px-4 py-3 text-white"
              style={{ background: "linear-gradient(135deg, #eab308 0%, #ca8a04 100%)" }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🏆</span>
                  <div>
                    <div className="text-sm font-black">{monthLabel} 予想大会</div>
                    <div className="text-[10px] text-white/80 font-medium">
                      {contest.start_date}〜{contest.end_date} | 残り{daysLeft}日
                    </div>
                  </div>
                </div>
                {myContestEntry && (
                  <div className="text-right">
                    <div className="text-[10px] text-white/80">あなたの順位</div>
                    <div className="text-xl font-black">
                      {myContestEntry.ranking}
                      <span className="text-xs">位</span>
                      <span className="text-[10px] text-white/70 ml-1">/ {contestEntryCount}人</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="bg-yellow-50 px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-[11px] font-bold text-gray-700">今月の累計ポイント</div>
                  <div className="text-xl font-black text-gray-900">
                    {myContestEntry?.total_points?.toLocaleString() ?? 0}
                    <span className="text-xs text-gray-500 ml-0.5">P</span>
                  </div>
                </div>
                {myContestEntry && top3[2] && myContestEntry.ranking > 3 && (
                  <div className="text-right">
                    <div className="text-[10px] text-gray-600">3位まであと</div>
                    <div className="text-base font-black text-orange-600">
                      {(top3[2]?.total_points ?? 0) - myContestEntry.total_points + 1}P
                    </div>
                  </div>
                )}
              </div>
              {top3.length > 0 && (
                <div className="flex gap-1.5 mb-2">
                  {["🥇", "🥈", "🥉"].map((medal, i) => {
                    const entry = top3[i];
                    if (!entry) return null;
                    return (
                      <div key={i} className="flex-1 bg-white rounded-lg p-1.5 text-center">
                        <div className="text-sm">{medal}</div>
                        <div className="text-[10px] font-bold text-gray-800 truncate">
                          {(entry.profiles as any)?.display_name ?? "---"}
                        </div>
                        <div className="text-[10px] font-black text-green-600">
                          {entry.total_points.toLocaleString()}P
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="flex flex-wrap gap-1 justify-center">
                <span className="text-[10px] font-bold text-yellow-700 bg-yellow-200/60 px-2 py-0.5 rounded-full">
                  🎁 1位: Amazon ¥10,000
                </span>
                <span className="text-[10px] font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                  2位: ¥5,000
                </span>
                <span className="text-[10px] font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                  3位: ¥3,000
                </span>
              </div>
            </div>
          </div>
        </Link>
      )}

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
