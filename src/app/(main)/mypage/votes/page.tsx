import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "予想履歴",
};

type Props = {
  searchParams: Promise<{ page?: string }>;
};

export default async function VoteHistoryPage({ searchParams }: Props) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const page = parseInt(params.page ?? "1");
  const perPage = 20;
  const offset = (page - 1) * perPage;

  // 全件数
  const { count: totalCount } = await supabase
    .from("votes")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  // 投票一覧
  const { data: votes } = await supabase
    .from("votes")
    .select("id, race_id, status, earned_points, is_perfect, created_at, settled_at, races(name, grade, course_name, race_number, race_date), vote_picks(pick_type, is_hit, points_earned, race_entries(post_number, horses(name)))")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + perPage - 1);

  const totalPages = Math.ceil((totalCount ?? 0) / perPage);

  const statusLabel = (s: string) => {
    switch (s) {
      case "pending": return { text: "未確定", color: "bg-yellow-100 text-yellow-700" };
      case "settled_hit": return { text: "的中", color: "bg-green-100 text-green-700" };
      case "settled_miss": return { text: "ハズレ", color: "bg-gray-100 text-gray-600" };
      default: return { text: s, color: "bg-gray-100 text-gray-600" };
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="text-sm text-gray-400">
        <Link href="/mypage" className="hover:text-green-600">マイページ</Link>
        <span className="mx-2">›</span>
        <span className="text-gray-600">予想履歴</span>
      </div>

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">📋 予想履歴</h1>
        <span className="text-sm text-gray-500">全{totalCount ?? 0}件</span>
      </div>

      {(!votes || votes.length === 0) ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400">
          <div className="text-4xl mb-3">🏇</div>
          <p>まだ投票がありません</p>
          <Link href="/races" className="text-sm text-green-600 hover:underline mt-2 inline-block">
            レース一覧を見る →
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {votes.map((vote: any) => {
            const race = vote.races as any;
            const status = statusLabel(vote.status);
            const picks = vote.vote_picks ?? [];
            const winPick = picks.find((p: any) => p.pick_type === "win");
            const placePicks = picks.filter((p: any) => p.pick_type === "place");
            const dangerPick = picks.find((p: any) => p.pick_type === "danger");

            return (
              <Link
                key={vote.id}
                href={`/races/${vote.race_id}`}
                className="block bg-white rounded-xl border border-gray-100 p-4 hover:border-green-200 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {race?.grade && (
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                        race.grade === "G1" ? "bg-yellow-100 text-yellow-800" :
                        race.grade === "G2" ? "bg-red-100 text-red-700" :
                        race.grade === "G3" ? "bg-green-100 text-green-700" :
                        "bg-blue-100 text-blue-700"
                      }`}>
                        {race.grade}
                      </span>
                    )}
                    <span className="text-sm font-bold text-gray-800">{race?.name}</span>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${status.color}`}>
                    {status.text}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                  <span>{race?.race_date} {race?.course_name}{race?.race_number ? ` ${race.race_number}R` : ""}</span>
                  {vote.earned_points > 0 && (
                    <span className="font-bold text-green-600">+{vote.earned_points}P{vote.is_perfect ? " 💎" : ""}</span>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {winPick && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${winPick.is_hit ? "bg-red-100 text-red-700 font-bold" : "bg-red-50 text-red-400"}`}>
                      ◎ {winPick.race_entries?.post_number}.{(winPick.race_entries?.horses as any)?.name}
                      {winPick.is_hit ? " ✓" : ""}
                    </span>
                  )}
                  {placePicks.map((p: any, i: number) => (
                    <span key={i} className={`text-xs px-2 py-0.5 rounded-full ${p.is_hit ? "bg-blue-100 text-blue-700 font-bold" : "bg-blue-50 text-blue-400"}`}>
                      ○ {p.race_entries?.post_number}.{(p.race_entries?.horses as any)?.name}
                      {p.is_hit ? " ✓" : ""}
                    </span>
                  ))}
                  {dangerPick && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${dangerPick.is_hit ? "bg-gray-200 text-gray-700 font-bold" : "bg-gray-100 text-gray-400"}`}>
                      △ {dangerPick.race_entries?.post_number}.{(dangerPick.race_entries?.horses as any)?.name}
                      {dangerPick.is_hit ? " ✓" : ""}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* ページネーション */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          {page > 1 && (
            <Link
              href={`/mypage/votes?page=${page - 1}`}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              ← 前
            </Link>
          )}
          <span className="text-sm text-gray-500">
            {page} / {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={`/mypage/votes?page=${page + 1}`}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              次 →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
