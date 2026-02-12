import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function PointsHistoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("cumulative_points, monthly_points")
    .eq("id", user.id)
    .single();

  // 全ポイント履歴
  const { data: transactions } = await supabase
    .from("points_transactions")
    .select("*, races(name, grade, course_name)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  // 月別集計
  const monthlyMap = new Map<string, number>();
  for (const tx of transactions ?? []) {
    const month = new Date(tx.created_at).toLocaleDateString("ja-JP", { year: "numeric", month: "long" });
    monthlyMap.set(month, (monthlyMap.get(month) ?? 0) + tx.amount);
  }

  // 理由別のアイコン
  const reasonIcon = (reason: string): string => {
    if (reason.includes("win")) return "🎯";
    if (reason.includes("place")) return "○";
    if (reason.includes("danger")) return "△";
    if (reason.includes("perfect")) return "💎";
    if (reason.includes("streak")) return "🔥";
    if (reason.includes("g1")) return "🏆";
    return "💰";
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/mypage" className="text-gray-400 hover:text-green-600">← 戻る</Link>
        <h1 className="text-xl font-bold text-gray-800">💰 ポイント履歴</h1>
      </div>

      {/* サマリー */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <div className="text-2xl font-bold text-green-600">
            {profile?.cumulative_points.toLocaleString() ?? 0}
          </div>
          <div className="text-xs text-gray-400">累計ポイント</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">
            {transactions?.length ?? 0}
          </div>
          <div className="text-xs text-gray-400">獲得回数</div>
        </div>
      </div>

      {/* 月別サマリー */}
      {monthlyMap.size > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-bold text-gray-800 mb-3">📅 月別サマリー</h2>
          <div className="space-y-2">
            {[...monthlyMap.entries()].map(([month, total]) => (
              <div key={month} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <span className="text-sm text-gray-600">{month}</span>
                <span className="text-sm font-bold text-green-600">+{total.toLocaleString()} P</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 詳細履歴 */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h2 className="font-bold text-gray-800 mb-3">📋 詳細履歴</h2>
        {transactions && transactions.length > 0 ? (
          <div className="space-y-1">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0">
                <span className="text-lg w-8 text-center">{reasonIcon(tx.reason)}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-700">{tx.description}</div>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    {(tx.races as any)?.name && (
                      <span>{(tx.races as any).grade && `[${(tx.races as any).grade}] `}{(tx.races as any).name}</span>
                    )}
                    <span>{new Date(tx.created_at).toLocaleDateString("ja-JP", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                </div>
                <span className={`text-sm font-bold shrink-0 ${tx.amount > 0 ? "text-green-600" : "text-red-600"}`}>
                  {tx.amount > 0 ? "+" : ""}{tx.amount} P
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400 text-sm">
            まだポイント履歴がありません
          </div>
        )}
      </div>
    </div>
  );
}
