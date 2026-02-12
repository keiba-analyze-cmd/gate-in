import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import TimelineFeed from "@/components/social/TimelineFeed";

export default async function TimelinePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // フォロー数
  const { count: followingCount } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("follower_id", user.id);

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">📰 タイムライン</h1>
        <span className="text-xs text-gray-400">
          {followingCount ?? 0}人をフォロー中
        </span>
      </div>

      {(followingCount ?? 0) === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
          💡 他のユーザーをフォローすると、ここに投票結果やコメントが表示されます。
          レースの掲示板で気になるユーザーを見つけたら、プロフィールからフォローしてみましょう！
        </div>
      )}

      <TimelineFeed />
    </div>
  );
}
