import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getRank, getNextRank } from "@/lib/constants/ranks";
import Link from "next/link";
import MyPageClient from "./MyPageClient";

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

  let featuredBadge = null;
  if (profile.featured_badge_id) {
    const { data: badge } = await supabase
      .from("badges")
      .select("id, name, icon")
      .eq("id", profile.featured_badge_id)
      .single();
    featuredBadge = badge;
  }

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
    <MyPageClient
      user={{ id: user.id }}
      profile={profile}
      featuredBadge={featuredBadge}
      rank={rank}
      nextRank={nextRank}
      winRate={winRate}
      placeRate={placeRate}
      progressToNext={progressToNext}
      followingCount={followingCount ?? 0}
      followerCount={followerCount ?? 0}
      badgeCount={badgeCount ?? 0}
      recentTx={recentTx ?? []}
      monthlyTotal={monthlyTotal}
    />
  );
}
