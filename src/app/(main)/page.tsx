import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { getRank } from "@/lib/constants/ranks";
import RaceCard from "@/components/races/RaceCard";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 投票受付中のレース
  const { data: openRaces } = await supabase
    .from("races")
    .select("*")
    .eq("status", "voting_open")
    .order("race_date", { ascending: true })
    .limit(6);

  // 注目レース（G1/G2を優先）
  const featuredRace = openRaces?.find((r) => r.grade === "G1" || r.grade === "G2") ?? openRaces?.[0];
  const otherRaces = openRaces?.filter((r) => r.id !== featuredRace?.id) ?? [];

  // 投票数を取得
  let featuredVoteCount = 0;
  if (featuredRace) {
    const { count } = await supabase
      .from("votes")
      .select("*", { count: "exact", head: true })
      .eq("race_id", featuredRace.id);
    featuredVoteCount = count ?? 0;
  }

  // コメント数
  let featuredCommentCount = 0;
  if (featuredRace) {
    const { count } = await supabase
      .from("comments")
      .select("*", { count: "exact", head: true })
      .eq("race_id", featuredRace.id)
      .eq("is_deleted", false);
    featuredCommentCount = count ?? 0;
  }

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
    .select("id, body, sentiment, profiles(display_name, rank_id)")
    .is("parent_id", null)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .limit(3);

  const monthLabel = `${now.getMonth() + 1}月`;
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const daysLeft = Math.max(0, Math.ceil((endOfMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  return (
    <div className="space-y-5">
      {/* ====== 🔥 注目レースヒーロー ====== */}
      {featuredRace && (
        <Link href={`/races/${featuredRace.id}`} className="block">
          <div
            className="rounded-2xl p-5 text-white text-center relative overflow-hidden"
            style={{ background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)" }}
          >
            <div className="relative">
              <p className="text-green-200 text-xs font-bold mb-1">📅 今週の注目レース</p>
              <h2 className="text-2xl font-black mb-1">
                {featuredRace.name}
                {featuredRace.grade && (
                  <span className="text-lg ml-2 text-white/80">({featuredRace.grade})</span>
                )}
              </h2>
              <p className="text-green-100 text-sm font-medium">
                {featuredRace.race_date} {featuredRace.course_name}
                {featuredRace.distance && ` ${featuredRace.distance}`}
              </p>
              <div className="flex gap-2 justify-center mt-3">
                <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full">
                  🗳 {featuredVoteCount}人が投票済み
                </span>
                <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full">
                  💬 {featuredCommentCount}件
                </span>
              </div>
              <div className="mt-4">
                <span className="inline-block bg-white text-green-700 font-black text-sm px-6 py-2.5 rounded-full shadow-lg">
                  予想を投票する →
                </span>
              </div>
            </div>
          </div>
        </Link>
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
              <RaceCard key={race.id} race={race} />
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
                <div key={comment.id} className="px-4 py-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-[10px]">👤</div>
                    <span className="text-xs font-bold text-gray-900">
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
                  </div>
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
