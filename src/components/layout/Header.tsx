import { createClient } from "@/lib/supabase/server";
import { getRank } from "@/lib/constants/ranks";
import HeaderClient from "./HeaderClient";

export default async function Header() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let profile = null;
  if (user) {
    const { data } = await supabase.from("profiles").select("display_name, avatar_url, avatar_emoji, rank_id, cumulative_points").eq("id", user.id).single();
    profile = data;
  }

  let unreadCount = 0;
  if (user) {
    const { count } = await supabase.from("notifications").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("is_read", false);
    unreadCount = count ?? 0;
  }

  const rank = profile ? getRank(profile.rank_id) : null;

  return <HeaderClient user={user ? { id: user.id } : null} profile={profile ? { display_name: profile.display_name, avatar_url: profile.avatar_url, avatar_emoji: profile.avatar_emoji, cumulative_points: profile.cumulative_points, rank_icon: rank?.icon ?? "🏇" } : null} unreadCount={unreadCount} />;
}
