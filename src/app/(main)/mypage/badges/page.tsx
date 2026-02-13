import BackLink from "@/components/ui/BackLink";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function BadgesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 全バッジマスタ
  const { data: allBadges } = await supabase
    .from("badges")
    .select("*")
    .order("category")
    .order("condition_value", { ascending: true });

  // ユーザーの獲得済みバッジ
  const { data: userBadges } = await supabase
    .from("user_badges")
    .select("badge_id, earned_at")
    .eq("user_id", user.id);

  const earnedMap = new Map(
    (userBadges ?? []).map((ub) => [ub.badge_id, ub.earned_at])
  );

  const categories = [
    { key: "milestone", label: "🎫 マイルストーン", desc: "投票回数で獲得" },
    { key: "achievement", label: "🎯 アチーブメント", desc: "的中実績で獲得" },
    { key: "streak", label: "🔥 連続記録", desc: "連続的中で獲得" },
    { key: "rank", label: "👑 ランク", desc: "ランク到達で獲得" },
    { key: "special", label: "🦄 スペシャル", desc: "特別な条件で獲得" },
  ];

  const earned = (userBadges ?? []).length;
  const total = (allBadges ?? []).length;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="text-sm text-gray-400">
        <Link href="/mypage" className="hover:text-green-600">マイページ</Link>
        <span className="mx-2">›</span>
        <span className="text-gray-600">バッジコレクション</span>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5 text-center">
        <BackLink href="/mypage" label="マイページ" />
        <h1 className="text-xl font-bold text-gray-800 mb-2">🏅 バッジコレクション</h1>
        <div className="text-3xl font-black text-green-600">{earned} <span className="text-lg text-gray-400">/ {total}</span></div>
        <div className="mt-2 h-3 bg-gray-100 rounded-full overflow-hidden max-w-xs mx-auto">
          <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${total > 0 ? (earned / total) * 100 : 0}%` }} />
        </div>
      </div>

      {categories.map((cat) => {
        const badges = (allBadges ?? []).filter((b) => b.category === cat.key);
        if (badges.length === 0) return null;
        return (
          <div key={cat.key} className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="font-bold text-gray-800 mb-1">{cat.label}</h2>
            <p className="text-xs text-gray-400 mb-3">{cat.desc}</p>
            <div className="grid grid-cols-1 gap-2">
              {badges.map((badge) => {
                const isEarned = earnedMap.has(badge.id);
                const earnedAt = earnedMap.get(badge.id);
                return (
                  <div
                    key={badge.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border ${
                      isEarned ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-100 opacity-50"
                    }`}
                  >
                    <span className="text-2xl">{isEarned ? badge.icon : "🔒"}</span>
                    <div className="flex-1">
                      <div className="font-bold text-sm text-gray-800">{badge.name}</div>
                      <div className="text-xs text-gray-500">{badge.description}</div>
                    </div>
                    {isEarned && earnedAt && (
                      <span className="text-xs text-green-600 font-medium">
                        {new Date(earnedAt).toLocaleDateString("ja-JP")}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
