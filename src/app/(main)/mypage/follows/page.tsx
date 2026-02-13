import BackLink from "@/components/ui/BackLink";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import FollowList from "@/components/social/FollowList";

type Props = {
  searchParams: Promise<{ tab?: string }>;
};

export default async function MyFollowsPage({ searchParams }: Props) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const tab = params.tab === "followers" ? "followers" : "following";

  const { count: followingCount } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("follower_id", user.id);

  const { count: followerCount } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("following_id", user.id);

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* ヘッダー */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/mypage" className="text-gray-400 hover:text-gray-600">
          ←
        </Link>
        <BackLink href="/mypage" label="マイページ" />
        <h1 className="text-lg font-bold text-gray-800">フォロー / フォロワー</h1>
      </div>

      {/* タブ */}
      <div className="flex border-b border-gray-200 mb-4">
        <Link
          href="/mypage/follows?tab=following"
          className={`flex-1 text-center py-3 text-sm font-medium border-b-2 transition-colors ${
            tab === "following"
              ? "border-green-600 text-green-600"
              : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          フォロー中
          <span className="ml-1.5 text-xs bg-gray-100 px-2 py-0.5 rounded-full">
            {followingCount ?? 0}
          </span>
        </Link>
        <Link
          href="/mypage/follows?tab=followers"
          className={`flex-1 text-center py-3 text-sm font-medium border-b-2 transition-colors ${
            tab === "followers"
              ? "border-green-600 text-green-600"
              : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          フォロワー
          <span className="ml-1.5 text-xs bg-gray-100 px-2 py-0.5 rounded-full">
            {followerCount ?? 0}
          </span>
        </Link>
      </div>

      {/* リスト */}
      <FollowList userId={user.id} type={tab} currentUserId={user.id} />
    </div>
  );
}
