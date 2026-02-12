#!/bin/bash
# ============================================
# ゲートイン！ Phase 9 修正スクリプト
# ① グラデーション修正 ② 統計2段化 ③ 文字色コントラスト改善
# gate-in フォルダ内で実行してください
# ============================================

echo "🔧 デザイン修正を適用中..."
echo ""

# ====== ① トップページ（グラデーション修正 + テキストコントラスト改善） ======
echo "📝 src/app/(main)/page.tsx（ヒーロー色修正 + コントラスト）"
cat << 'FILEOF' > src/app/\(main\)/page.tsx
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
FILEOF

# ====== ② ユーザープロフィール（統計2段化 + 1着率追加 + コントラスト改善） ======
echo "📝 src/app/(main)/users/[userId]/page.tsx（統計2段 + コントラスト）"
cat << 'FILEOF' > src/app/\(main\)/users/\[userId\]/page.tsx
import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { getRank, getNextRank } from "@/lib/constants/ranks";
import FollowButton from "@/components/social/FollowButton";
import Link from "next/link";

type Props = {
  params: Promise<{ userId: string }>;
};

export default async function UserProfilePage({ params }: Props) {
  const { userId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (!profile || error) notFound();

  const rank = getRank(profile.rank_id);
  const nextRank = getNextRank(profile.rank_id);
  const isOwnProfile = user.id === userId;

  let isFollowing = false;
  if (!isOwnProfile) {
    const { data } = await supabase
      .from("follows")
      .select("id")
      .eq("follower_id", user.id)
      .eq("following_id", userId)
      .maybeSingle();
    isFollowing = !!data;
  }

  const { count: followingCount } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("follower_id", userId);

  const { count: followerCount } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("following_id", userId);

  const { data: recentVotes } = await supabase
    .from("votes")
    .select("id, race_id, status, earned_points, is_perfect, settled_at, races(name, grade)")
    .eq("user_id", userId)
    .neq("status", "pending")
    .order("settled_at", { ascending: false })
    .limit(10);

  const { data: userBadges } = await supabase
    .from("user_badges")
    .select("badge_id, earned_at, badges(name, icon, description)")
    .eq("user_id", userId)
    .order("earned_at", { ascending: false });

  // 各種レート計算
  const winRate = profile.total_votes > 0
    ? Math.round((profile.win_hits / profile.total_votes) * 1000) / 10
    : 0;

  const placeRate = profile.total_votes > 0
    ? Math.round((profile.place_hits / profile.total_votes) * 1000) / 10
    : 0;

  const progressToNext = nextRank
    ? Math.round(((profile.cumulative_points - rank.threshold) / (nextRank.threshold - rank.threshold)) * 100)
    : 100;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* プロフィールカード */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-start gap-4 mb-4">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-20 h-20 rounded-full" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center text-3xl">🏇</div>
          )}
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-black text-gray-900">{profile.display_name}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm font-medium text-gray-700">{rank.icon} {rank.name}</span>
                  <span className="text-sm font-black text-green-600">{profile.cumulative_points} P</span>
                </div>
              </div>
              {!isOwnProfile && (
                <FollowButton targetUserId={userId} initialFollowing={isFollowing} />
              )}
            </div>
            {profile.bio && (
              <p className="text-sm text-gray-600 mt-2">{profile.bio}</p>
            )}
          </div>
        </div>

        {/* ランク進捗 */}
        {nextRank && (
          <div className="mb-4">
            <div className="flex justify-between text-xs mb-1">
              <span className="font-bold text-gray-600">{rank.name}</span>
              <span className="font-medium text-gray-500">{nextRank.name}まであと{nextRank.threshold - profile.cumulative_points}P</span>
            </div>
            <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${Math.min(progressToNext, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* ====== 統計: 2段レイアウト ====== */}

        {/* 1段目: フォロー + フォロワー */}
        <div className="grid grid-cols-2 gap-2 mb-2">
          <div className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
            <div className="text-xl font-black text-gray-900">{followingCount ?? 0}</div>
            <div className="text-xs font-medium text-gray-600">フォロー</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
            <div className="text-xl font-black text-gray-900">{followerCount ?? 0}</div>
            <div className="text-xs font-medium text-gray-600">フォロワー</div>
          </div>
        </div>

        {/* 2段目: 投票数 + 1着率 + 複勝率 + 連続的中 */}
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
            <div className="text-lg font-black text-gray-900">{profile.total_votes}</div>
            <div className="text-[10px] font-medium text-gray-600">投票数</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
            <div className="text-lg font-black text-red-600">{winRate}%</div>
            <div className="text-[10px] font-medium text-gray-600">1着率</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
            <div className="text-lg font-black text-blue-600">{placeRate}%</div>
            <div className="text-[10px] font-medium text-gray-600">複勝率</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
            <div className="text-lg font-black text-orange-600">🔥{profile.best_streak}</div>
            <div className="text-[10px] font-medium text-gray-600">最長連続</div>
          </div>
        </div>
      </div>

      {/* バッジ */}
      {userBadges && userBadges.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h2 className="font-black text-gray-900 mb-3">🏅 獲得バッジ</h2>
          <div className="flex flex-wrap gap-2">
            {userBadges.map((ub) => (
              <div key={ub.badge_id} className="flex items-center gap-1.5 bg-gray-50 rounded-full px-3 py-1.5 border border-gray-100" title={(ub.badges as any)?.description}>
                <span>{(ub.badges as any)?.icon}</span>
                <span className="text-xs font-bold text-gray-700">{(ub.badges as any)?.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 最近の結果 */}
      {recentVotes && recentVotes.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h2 className="font-black text-gray-900 mb-3">📊 最近の投票結果</h2>
          <div className="space-y-2">
            {recentVotes.map((vote) => (
              <Link
                key={vote.id}
                href={`/races/${vote.race_id}`}
                className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 hover:bg-gray-100 transition-colors border border-gray-100"
              >
                {(vote.races as any)?.grade && (
                  <span className="text-xs font-black px-1.5 py-0.5 rounded bg-green-100 text-green-700">
                    {(vote.races as any).grade}
                  </span>
                )}
                <span className="text-sm font-bold text-gray-800 flex-1">{(vote.races as any)?.name}</span>
                <span className={`text-xs font-black ${
                  vote.status === "settled_hit" ? "text-green-600" : "text-gray-500"
                }`}>
                  {vote.status === "settled_hit" ? `🎯 +${vote.earned_points}P` : "ハズレ"}
                </span>
                {vote.is_perfect && <span className="text-xs">💎</span>}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
FILEOF

# ====== ③ マイページ（統計2段化 + 1着率/複勝率追加 + コントラスト改善） ======
echo "📝 src/app/(main)/mypage/page.tsx（統計改善 + コントラスト）"
cat << 'FILEOF' > src/app/\(main\)/mypage/page.tsx
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getRank, getNextRank } from "@/lib/constants/ranks";
import Link from "next/link";

export default async function MyPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  const rank = getRank(profile.rank_id);
  const nextRank = getNextRank(profile.rank_id);

  const winRate = profile.total_votes > 0
    ? Math.round((profile.win_hits / profile.total_votes) * 1000) / 10
    : 0;

  const placeRate = profile.total_votes > 0
    ? Math.round((profile.place_hits / profile.total_votes) * 1000) / 10
    : 0;

  const progressToNext = nextRank
    ? Math.min(Math.round(((profile.cumulative_points - rank.threshold) / (nextRank.threshold - rank.threshold)) * 100), 100)
    : 100;

  const { count: followingCount } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("follower_id", user.id);

  const { count: followerCount } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("following_id", user.id);

  const { count: badgeCount } = await supabase
    .from("user_badges")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  const { data: recentTx } = await supabase
    .from("points_transactions")
    .select("id, amount, description, created_at, races(name, grade)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

  const { data: monthlyTx } = await supabase
    .from("points_transactions")
    .select("amount")
    .eq("user_id", user.id)
    .gte("created_at", monthStart);

  const monthlyTotal = monthlyTx?.reduce((sum, t) => sum + t.amount, 0) ?? 0;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* プロフィールカード */}
      <div
        className="rounded-2xl p-6 text-white"
        style={{ background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)" }}
      >
        <div className="flex items-start gap-4 mb-4">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-16 h-16 rounded-full border-2 border-white/30" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-2xl">🏇</div>
          )}
          <div className="flex-1">
            <h1 className="text-xl font-black">{profile.display_name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm font-medium text-green-100">{rank.icon} {rank.name}</span>
            </div>
            {profile.bio && (
              <p className="text-sm text-green-100 mt-1">{profile.bio}</p>
            )}
          </div>
          <Link
            href="/mypage/edit"
            className="bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
          >
            編集
          </Link>
        </div>

        {/* ランク進捗 */}
        <div className="bg-white/10 rounded-xl p-3 mb-4">
          <div className="flex justify-between text-xs text-green-100 font-medium mb-1.5">
            <span>{rank.icon} {rank.name}</span>
            {nextRank ? (
              <span>次: {nextRank.icon} {nextRank.name}（あと{nextRank.threshold - profile.cumulative_points}P）</span>
            ) : (
              <span>🏆 最高ランク達成！</span>
            )}
          </div>
          <div className="h-3 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-500"
              style={{ width: `${progressToNext}%` }}
            />
          </div>
        </div>

        {/* ポイント表示 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <div className="text-2xl font-black">{profile.cumulative_points.toLocaleString()}</div>
            <div className="text-xs text-green-100 font-medium">累計ポイント</div>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <div className="text-2xl font-black">{monthlyTotal.toLocaleString()}</div>
            <div className="text-xs text-green-100 font-medium">今月のポイント</div>
          </div>
        </div>
      </div>

      {/* ====== 統計: 2段レイアウト ====== */}

      {/* 1段目: フォロー + フォロワー */}
      <div className="grid grid-cols-2 gap-2">
        <StatCard label="フォロー" value={followingCount ?? 0} />
        <StatCard label="フォロワー" value={followerCount ?? 0} />
      </div>

      {/* 2段目: 投票数 + 1着率 + 複勝率 + 連続的中 */}
      <div className="grid grid-cols-4 gap-2">
        <StatCard label="投票数" value={profile.total_votes} />
        <StatCard label="1着率" value={`${winRate}%`} color="text-red-600" />
        <StatCard label="複勝率" value={`${placeRate}%`} color="text-blue-600" />
        <StatCard label="連続的中" value={`🔥${profile.current_streak}`} color="text-orange-600" />
      </div>

      {/* 詳細統計 */}
      <div className="grid grid-cols-3 gap-2">
        <StatCard label="1着的中" value={`${profile.win_hits}回`} color="text-red-600" />
        <StatCard label="複勝的中" value={`${profile.place_hits}回`} color="text-blue-600" />
        <StatCard label="最長記録" value={`${profile.best_streak}連続`} color="text-orange-600" />
      </div>

      {/* メニュー */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <MenuItem href="/mypage/points" icon="💰" label="ポイント履歴" desc="獲得ポイントの詳細" />
        <MenuItem href="/mypage/badges" icon="🏅" label="バッジコレクション" desc={`${badgeCount ?? 0}個獲得`} />
        <MenuItem href="/notifications" icon="🔔" label="通知" desc="お知らせ一覧" />
        <MenuItem href="/timeline" icon="📰" label="タイムライン" desc="フォロー中のアクティビティ" />
        <MenuItem href={`/users/${user.id}`} icon="👤" label="公開プロフィール" desc="他の人から見えるページ" />
      </div>

      {/* 最近のポイント履歴 */}
      {recentTx && recentTx.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-black text-gray-900">💰 最近のポイント</h2>
            <Link href="/mypage/points" className="text-xs text-green-600 font-bold hover:underline">すべて見る →</Link>
          </div>
          <div className="space-y-2">
            {recentTx.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div>
                  <span className="text-sm text-gray-800 font-medium">{tx.description}</span>
                  {(tx.races as any)?.name && (
                    <span className="text-xs text-gray-500 ml-2">{(tx.races as any).name}</span>
                  )}
                </div>
                <span className={`text-sm font-black ${tx.amount > 0 ? "text-green-600" : "text-red-600"}`}>
                  {tx.amount > 0 ? "+" : ""}{tx.amount}P
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
      <div className={`text-lg font-black ${color ?? "text-gray-900"}`}>{value}</div>
      <div className="text-[10px] font-medium text-gray-600">{label}</div>
    </div>
  );
}

function MenuItem({ href, icon, label, desc }: { href: string; icon: string; label: string; desc: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0">
      <span className="text-xl">{icon}</span>
      <div className="flex-1">
        <div className="text-sm font-bold text-gray-900">{label}</div>
        <div className="text-xs text-gray-500">{desc}</div>
      </div>
      <span className="text-gray-400 font-bold">›</span>
    </Link>
  );
}
FILEOF

# ====== ④ RaceCard コントラスト改善 ======
echo "📝 src/components/races/RaceCard.tsx（コントラスト改善）"
cat << 'FILEOF' > src/components/races/RaceCard.tsx
import Link from "next/link";

type Props = {
  race: {
    id: string;
    name: string;
    race_date: string;
    course_name: string;
    grade: string | null;
    status: string;
    race_number?: number | null;
    distance?: string | null;
  };
};

const GRADE_STYLES: Record<string, { bg: string; text: string }> = {
  G1: { bg: "bg-orange-600", text: "text-white" },
  G2: { bg: "bg-red-600", text: "text-white" },
  G3: { bg: "bg-green-600", text: "text-white" },
  OP: { bg: "bg-gray-600", text: "text-white" },
  L: { bg: "bg-blue-600", text: "text-white" },
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  voting_open: { label: "受付中", color: "text-green-600 font-black" },
  voting_closed: { label: "締切", color: "text-yellow-600 font-bold" },
  finished: { label: "確定", color: "text-gray-500 font-bold" },
};

export default function RaceCard({ race }: Props) {
  const grade = race.grade ? GRADE_STYLES[race.grade] ?? { bg: "bg-gray-500", text: "text-white" } : null;
  const status = STATUS_LABELS[race.status] ?? { label: race.status, color: "text-gray-600" };

  return (
    <Link href={`/races/${race.id}`} className="bg-white rounded-2xl border border-gray-200 flex items-center gap-3 px-4 py-3 hover:shadow-md hover:border-gray-300 transition-all cursor-pointer">
      {grade ? (
        <span className={`${grade.bg} ${grade.text} text-[11px] font-black px-2 py-1 rounded-md min-w-[32px] text-center`}>
          {race.grade}
        </span>
      ) : (
        <span className="bg-gray-200 text-gray-700 text-[11px] font-bold px-2 py-1 rounded-md min-w-[32px] text-center">
          {race.race_number ? `${race.race_number}R` : "一般"}
        </span>
      )}

      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold text-gray-900 truncate">{race.name}</div>
        <div className="text-[11px] text-gray-500 font-medium">
          {race.race_date} {race.course_name}
          {race.distance && ` ${race.distance}`}
        </div>
      </div>

      <span className={`text-[11px] ${status.color} shrink-0`}>
        {status.label}
      </span>

      <span className="text-gray-400 text-sm font-bold">›</span>
    </Link>
  );
}
FILEOF

# ====== ⑤ コメント系のコントラスト改善 ======
echo "📝 src/components/comments/CommentItem.tsx（コントラスト改善）"

# sedでテキスト色を修正
if [ -f "src/components/comments/CommentItem.tsx" ]; then
  sed -i 's/text-gray-300 ml-auto/text-gray-500 ml-auto/g' src/components/comments/CommentItem.tsx
  sed -i 's/text-gray-400 ml-auto/text-gray-500 ml-auto/g' src/components/comments/CommentItem.tsx
  echo "  → CommentItem.tsx のテキスト色を修正"
fi

# ====== ⑥ タイムライン系のコントラスト改善 ======
echo "📝 src/components/social/TimelineItem.tsx（コントラスト改善）"

if [ -f "src/components/social/TimelineItem.tsx" ]; then
  sed -i 's/text-gray-300 ml-auto/text-gray-500 ml-auto/g' src/components/social/TimelineItem.tsx
  sed -i 's/text-gray-400">ハズレ/text-gray-500">ハズレ/g' src/components/social/TimelineItem.tsx
  echo "  → TimelineItem.tsx のテキスト色を修正"
fi

# ====== ⑦ ポイント履歴のコントラスト改善 ======
echo "📝 src/app/(main)/mypage/points/page.tsx（コントラスト改善）"

if [ -f "src/app/(main)/mypage/points/page.tsx" ]; then
  sed -i 's/text-gray-400">累計ポイント/text-gray-600">累計ポイント/g' src/app/\(main\)/mypage/points/page.tsx
  sed -i 's/text-gray-400">獲得回数/text-gray-600">獲得回数/g' src/app/\(main\)/mypage/points/page.tsx
  sed -i 's/border-gray-50/border-gray-100/g' src/app/\(main\)/mypage/points/page.tsx
  echo "  → ポイント履歴のテキスト色・ボーダー色を修正"
fi

# ====== ⑧ 大会ページのコントラスト改善 ======
echo "📝 src/components/rankings/ContestBoard.tsx（コントラスト改善）"

if [ -f "src/components/rankings/ContestBoard.tsx" ]; then
  # gradient-gold → inline style
  sed -i 's/className="gradient-gold/style={{ background: "linear-gradient(135deg, #eab308 0%, #ca8a04 100%)" }} className="/g' src/components/rankings/ContestBoard.tsx
  # gradient-purple → inline style  
  sed -i 's/className="gradient-purple/style={{ background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)" }} className="/g' src/components/rankings/ContestBoard.tsx
  echo "  → ContestBoard.tsx のグラデーション修正"
fi

echo ""
echo "✅ デザイン修正完了！"
echo ""
echo "修正内容:"
echo "  ① トップページ: ヒーローカードのグラデーション色をinline styleで適用"
echo "  ② 統計表示: 5列→2段レイアウト（フォロー2列 + 投票系4列）"
echo "  ③ 1着率・複勝率を追加（ワイヤーフレーム準拠）"
echo "  ④ テキスト色: gray-300/400 → gray-500/600/700/900 に改善"
echo "  ⑤ ボーダー色: gray-50/100 → gray-100/200 に改善"
echo "  ⑥ フォント: font-bold → font-black で見出しを強調"
echo ""
echo "🎮 確認手順:"
echo "  pkill -f 'next dev'; rm -rf .next/dev/lock; npm run dev"
