import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import NewspaperSettingsClient from "./NewspaperSettingsClient";

export const metadata: Metadata = {
  title: "My競馬新聞設定",
};

export default async function NewspaperSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: follows } = await supabase
    .from("follows")
    .select("following_id, profiles!follows_following_id_fkey(id, display_name, avatar_url, rank_id)")
    .eq("follower_id", user.id);

  const followingUsers = (follows ?? []).map((f: any) => ({
    user_id: f.following_id,
    display_name: f.profiles?.display_name ?? "匿名",
    avatar_url: f.profiles?.avatar_url,
    rank_id: f.profiles?.rank_id ?? "beginner_1",
  }));

  const { data: members } = await supabase
    .from("newspaper_members")
    .select("id, member_user_id, display_order, profiles!newspaper_members_member_user_id_fkey(display_name, avatar_url, rank_id)")
    .eq("user_id", user.id)
    .order("display_order", { ascending: true });

  const currentMembers = (members ?? []).map((m: any) => ({
    id: m.id,
    user_id: m.member_user_id,
    display_order: m.display_order,
    display_name: m.profiles?.display_name ?? "匿名",
    avatar_url: m.profiles?.avatar_url,
    rank_id: m.profiles?.rank_id ?? "beginner_1",
  }));

  return <NewspaperSettingsClient initialMembers={currentMembers} followingUsers={followingUsers} />;
}
