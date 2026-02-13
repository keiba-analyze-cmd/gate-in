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

        {/* ポイント表示（タップでポイント履歴へ） */}
        <Link href="/mypage/points" className="grid grid-cols-2 gap-3 group">
          <div className="bg-white/10 rounded-xl p-3 text-center group-hover:bg-white/20 transition-colors">
            <div className="text-2xl font-black">{profile.cumulative_points.toLocaleString()}</div>
            <div className="text-xs text-green-100 font-medium">累計ポイント</div>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-center group-hover:bg-white/20 transition-colors">
            <div className="text-2xl font-black">{monthlyTotal.toLocaleString()}</div>
            <div className="text-xs text-green-100 font-medium">今月のポイント ›</div>
          </div>
        </Link>
      </div>

      {/* ====== 統計: 2段レイアウト ====== */}

      {/* 1段目: フォロー + フォロワー */}
      <div className="grid grid-cols-2 gap-2">
        <Link href="/mypage/follows?tab=following"><StatCard label="フォロー" value={followingCount ?? 0} /></Link>
        <Link href="/mypage/follows?tab=followers"><StatCard label="フォロワー" value={followerCount ?? 0} /></Link>
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
