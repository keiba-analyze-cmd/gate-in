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

        {/* 1段目: フォロー + フォロワー（タップで一覧へ） */}
        <div className="grid grid-cols-2 gap-2 mb-2">
          <Link href={`/users/${userId}/follows?tab=following`} className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100 hover:border-green-300 transition-colors">
            <div className="text-xl font-black text-gray-900">{followingCount ?? 0}</div>
            <div className="text-xs font-medium text-gray-600">フォロー</div>
          </Link>
          <Link href={`/users/${userId}/follows?tab=followers`} className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100 hover:border-green-300 transition-colors">
            <div className="text-xl font-black text-gray-900">{followerCount ?? 0}</div>
            <div className="text-xs font-medium text-gray-600">フォロワー</div>
          </Link>
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
