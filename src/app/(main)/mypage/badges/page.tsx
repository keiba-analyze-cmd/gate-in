import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function BadgesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // 全バッジ
  const { data: allBadges } = await supabase
    .from("badges")
    .select("*")
    .order("id");

  // ユーザーが獲得したバッジ
  const { data: earnedBadges } = await supabase
    .from("user_badges")
    .select("badge_id, earned_at")
    .eq("user_id", user.id);

  const earnedMap = new Map(earnedBadges?.map((b) => [b.badge_id, b.earned_at]) ?? []);

  // カテゴリ別に分類
  const categories: Record<string, typeof allBadges> = {};
  for (const badge of allBadges ?? []) {
    const cat = badge.category ?? "その他";
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(badge);
  }

  const categoryLabels: Record<string, string> = {
    accuracy: "🎯 的中系",
    streak: "🔥 連続系",
    volume: "📊 投票数系",
    grade: "🏆 重賞系",
    social: "💬 ソーシャル系",
    special: "✨ 特別",
  };

  const earnedCount = earnedBadges?.length ?? 0;
  const totalCount = allBadges?.length ?? 0;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/mypage" className="text-gray-400 hover:text-green-600">← 戻る</Link>
        <h1 className="text-xl font-bold text-gray-800">🏅 バッジコレクション</h1>
      </div>

      {/* 進捗 */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold text-gray-700">コンプリート進捗</span>
          <span className="text-sm font-bold text-green-600">{earnedCount} / {totalCount}</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full transition-all"
            style={{ width: `${totalCount > 0 ? (earnedCount / totalCount) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* バッジ一覧 */}
      {Object.entries(categories).map(([category, badges]) => (
        <div key={category} className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-bold text-gray-800 mb-3">
            {categoryLabels[category] ?? category}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {badges?.map((badge) => {
              const isEarned = earnedMap.has(badge.id);
              const earnedAt = earnedMap.get(badge.id);
              return (
                <div
                  key={badge.id}
                  className={`rounded-xl p-4 text-center transition-all ${
                    isEarned
                      ? "bg-yellow-50 border-2 border-yellow-200"
                      : "bg-gray-50 border-2 border-transparent opacity-50"
                  }`}
                >
                  <div className={`text-3xl mb-2 ${isEarned ? "" : "grayscale"}`}>
                    {badge.icon}
                  </div>
                  <div className="text-sm font-bold text-gray-800">{badge.name}</div>
                  <div className="text-xs text-gray-500 mt-1">{badge.description}</div>
                  {isEarned && earnedAt && (
                    <div className="text-xs text-yellow-600 mt-2">
                      ✓ {new Date(earnedAt).toLocaleDateString("ja-JP", { month: "short", day: "numeric" })}獲得
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
