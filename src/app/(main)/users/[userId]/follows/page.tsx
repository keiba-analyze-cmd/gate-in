import BackLink from "@/components/ui/BackLink";
import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import FollowList from "@/components/social/FollowList";

type Props = {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ tab?: string }>;
};

export default async function UserFollowsPage({ params, searchParams }: Props) {
  const { userId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", userId)
    .single();

  if (!profile) notFound();

  const sparams = await searchParams;
  const tab = sparams.tab === "followers" ? "followers" : "following";

  const { count: followingCount } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("follower_id", userId);

  const { count: followerCount } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("following_id", userId);

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* ヘッダー */}
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/users/${userId}`} className="text-gray-400 hover:text-gray-600">
          ←
        </Link>
        <h1 className="text-lg font-bold text-gray-800">
          {profile.display_name ?? "匿名"} のフォロー
        </h1>
      </div>

      {/* タブ */}
      <div className="flex border-b border-gray-200 mb-4">
        <Link
          href={`/users/${userId}/follows?tab=following`}
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
          href={`/users/${userId}/follows?tab=followers`}
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
      <FollowList userId={userId} type={tab} currentUserId={user.id} />
    </div>
  );
}
