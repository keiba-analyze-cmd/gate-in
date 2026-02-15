import BackLink from "@/components/ui/BackLink";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import LikedVotesList from "./LikedVotesList";

export const metadata: Metadata = {
  title: "いいねした予想",
};

export default async function LikedVotesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // いいね数を取得
  const { count: likeCount } = await supabase
    .from("vote_likes")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="text-sm text-gray-400">
        <Link href="/mypage" className="hover:text-green-600">マイページ</Link>
        <span className="mx-2">›</span>
        <span className="text-gray-600">いいねした予想</span>
      </div>

      <div className="flex items-center justify-between">
        <BackLink href="/mypage" label="マイページ" />
        <h1 className="text-xl font-bold text-gray-800">❤️ いいねした予想</h1>
        <span className="text-sm text-gray-500">全{likeCount ?? 0}件</span>
      </div>

      <LikedVotesList />
    </div>
  );
}
