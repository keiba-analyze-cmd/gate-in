import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { getRank, getNextRank } from "@/lib/constants/ranks";
import UserProfileClient from "./UserProfileClient";

type Props = { params: Promise<{ userId: string }> };

export default async function UserProfilePage({ params }: Props) {
  const { userId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // UUID形式かハンドル形式かを判定
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);

  let profile;
  let error;

  if (isUUID) {
    const result = await supabase.from("profiles").select("*").eq("id", userId).single();
    profile = result.data;
    error = result.error;
  } else {
    // ハンドルで検索
    const result = await supabase.from("profiles").select("*").eq("user_handle", userId.toLowerCase()).single();
    profile = result.data;
    error = result.error;
  }

  if (!profile || error) notFound();

  let featuredBadge = null;
  if (profile.featured_badge_id) {
    const { data: badge } = await supabase.from("badges").select("id, name, icon").eq("id", profile.featured_badge_id).single();
    featuredBadge = badge;
  }

  const rank = getRank(profile.rank_id);
  const nextRank = getNextRank(profile.rank_id);
  const isOwnProfile = user.id === profile.id;

  let isFollowing = false;
  let isBlocked = false;
  if (!isOwnProfile) {
    const { data } = await supabase.from("follows").select("id").eq("follower_id", user.id).eq("following_id", profile.id).maybeSingle();
    isFollowing = !!data;
    const { data: blockData } = await supabase.from("blocks").select("id").eq("blocker_id", user.id).eq("blocked_id", profile.id).maybeSingle();
    isBlocked = !!blockData;
  }

  const { count: followingCount } = await supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", profile.id);
  const { count: followerCount } = await supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", profile.id);

  const { data: userBadges } = await supabase.from("user_badges").select("badge_id, earned_at, badges(name, icon, description)").eq("user_id", profile.id).order("earned_at", { ascending: false });

  const winRate = profile.total_votes > 0 ? Math.round((profile.win_hits / profile.total_votes) * 1000) / 10 : 0;
  const placeRate = profile.total_votes > 0 ? Math.round((profile.place_hits / profile.total_votes) * 1000) / 10 : 0;
  const progressToNext = nextRank ? Math.round(((profile.cumulative_points - rank.threshold) / (nextRank.threshold - rank.threshold)) * 100) : 100;

  return (
    <UserProfileClient
      profile={{ ...profile, featured_badge: featuredBadge }}
      rank={rank}
      nextRank={nextRank}
      isOwnProfile={isOwnProfile}
      isFollowing={isFollowing}
      isBlocked={isBlocked}
      followingCount={followingCount ?? 0}
      followerCount={followerCount ?? 0}
      userBadges={userBadges ?? []}
      winRate={winRate}
      placeRate={placeRate}
      progressToNext={progressToNext}
      userId={profile.id}
      isVerified={profile.is_verified ?? false}
    />
  );
}
