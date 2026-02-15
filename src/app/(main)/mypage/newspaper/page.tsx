import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import NewspaperMemberSettings from "./NewspaperMemberSettings";

export const metadata: Metadata = {
  title: "My競馬新聞設定",
};

export default async function NewspaperSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // フォロー中のユーザーを取得
  const { data: follows } = await supabase
    .from("follows")
    .select(`
      following_id,
      profiles!follows_following_id_fkey(id, display_name, avatar_url, rank_id)
    `)
    .eq("follower_id", user.id);

  const followingUsers = (follows ?? []).map((f: any) => ({
    user_id: f.following_id,
    display_name: f.profiles?.display_name ?? "匿名",
    avatar_url: f.profiles?.avatar_url,
    rank_id: f.profiles?.rank_id ?? "beginner_1",
  }));

  // 現在の新聞メンバーを取得
  const { data: members } = await supabase
    .from("newspaper_members")
    .select(`
      id,
      member_user_id,
      display_order,
      profiles!newspaper_members_member_user_id_fkey(display_name, avatar_url, rank_id)
    `)
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

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="text-sm text-gray-400">
        <Link href="/mypage" className="hover:text-green-600">マイページ</Link>
        <span className="mx-2">›</span>
        <span className="text-gray-600">My競馬新聞設定</span>
      </div>

      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold text-gray-800">📰 My競馬新聞設定</h1>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
        <p className="font-bold mb-1">💡 My競馬新聞とは？</p>
        <p>選んだ5人の予想を競馬新聞のように一覧表示できます。レース詳細ページの「📰 My新聞」タブで確認できます。</p>
      </div>

      <NewspaperMemberSettings
        initialMembers={currentMembers}
        followingUsers={followingUsers}
      />
    </div>
  );
}
