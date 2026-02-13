import BackLink from "@/components/ui/BackLink";
export const revalidate = 300;

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/admin";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";

type Props = {
  params: Promise<{ horseId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { horseId } = await params;
  const supabase = await createClient();
  const { data: horse } = await supabase
    .from("horses")
    .select("name")
    .eq("id", horseId)
    .single();
  return {
    title: horse ? `${horse.name} - 馬カルテ | ゲートイン！` : "馬カルテ | ゲートイン！",
  };
}

export default async function HorseDetailPage({ params }: Props) {
  const { horseId } = await params;
  const admin = createAdminClient();

  // 馬情報
  const { data: horse, error } = await admin
    .from("horses")
    .select("*")
    .eq("id", horseId)
    .single();

  if (!horse || error) notFound();

  // 出走履歴（race_entries → races + race_results）
  const { data: entries } = await admin
    .from("race_entries")
    .select(`
      id,
      post_number,
      jockey,
      odds,
      popularity,
      is_scratched,
      race_id,
      races (
        id, name, race_date, course_name, grade, distance, track_type, status, race_number
      )
    `)
    .eq("horse_id", horseId)
    .order("created_at", { ascending: false });

  // 各出走の結果を取得
  const entryIds = (entries ?? []).map((e) => e.id);
  const { data: results } = entryIds.length > 0
    ? await admin
        .from("race_results")
        .select("race_entry_id, finish_position, finish_time, margin, last_3f")
        .in("race_entry_id", entryIds)
    : { data: [] };

  const resultMap = new Map(
    (results ?? []).map((r) => [r.race_entry_id, r])
  );

  // 統計計算
  const finishedEntries = (entries ?? []).filter(
    (e) => resultMap.has(e.id) && !e.is_scratched
  );
  const totalRaces = finishedEntries.length;
  const wins = finishedEntries.filter((e) => resultMap.get(e.id)?.finish_position === 1).length;
  const places = finishedEntries.filter((e) => {
    const pos = resultMap.get(e.id)?.finish_position;
    return pos != null && pos <= 3;
  }).length;

  const sexLabel = horse.sex === "牡" ? "♂ 牡" : horse.sex === "牝" ? "♀ 牝" : horse.sex === "セ" ? "セン" : horse.sex ?? "";

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="text-sm text-gray-400">
        <Link href="/races" className="hover:text-green-600">レース一覧</Link>
        <span className="mx-2">›</span>
        <span className="text-gray-600">{horse.name}</span>
      </div>

      {/* 馬情報ヘッダー */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl">🐴</span>
          <div>
            <BackLink href="/races" label="レース一覧" />
            <h1 className="text-2xl font-bold text-gray-800">{horse.name}</h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500 mt-1">
              {sexLabel && <span>{sexLabel}</span>}
              {horse.sire && <span>父: {horse.sire}</span>}
              {horse.trainer && <span>調教師: {horse.trainer}</span>}
              {horse.stable_area && <span>所属: {horse.stable_area}</span>}
            </div>
          </div>
        </div>

        {/* 戦績サマリー */}
        <div className="grid grid-cols-4 gap-2 mt-4">
          <StatBox label="出走" value={`${totalRaces}戦`} />
          <StatBox label="勝利" value={`${wins}勝`} color="text-red-600" />
          <StatBox label="複勝圏" value={`${places}回`} color="text-blue-600" />
          <StatBox label="勝率" value={totalRaces > 0 ? `${Math.round((wins / totalRaces) * 100)}%` : "-"} color="text-green-600" />
        </div>
      </div>

      {/* 出走履歴 */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h2 className="font-bold text-gray-800 mb-3">📊 出走履歴</h2>
        {(entries ?? []).length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">出走データがありません</p>
        ) : (
          <div className="space-y-2">
            {(entries ?? []).map((entry) => {
              const race = entry.races as any;
              if (!race) return null;
              const result = resultMap.get(entry.id);
              const pos = result?.finish_position;

              return (
                <Link
                  key={entry.id}
                  href={`/races/${race.id}`}
                  className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors border border-gray-100"
                >
                  {/* 着順 */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black shrink-0 ${
                    pos === 1 ? "bg-yellow-100 text-yellow-700"
                    : pos != null && pos <= 3 ? "bg-blue-100 text-blue-700"
                    : entry.is_scratched ? "bg-gray-200 text-gray-400"
                    : pos != null ? "bg-gray-100 text-gray-600"
                    : "bg-gray-100 text-gray-400"
                  }`}>
                    {entry.is_scratched ? "取" : pos != null ? `${pos}着` : race.status === "finished" ? "-" : "未"}
                  </div>

                  {/* レース情報 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {race.grade && (
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                          race.grade === "G1" ? "bg-yellow-100 text-yellow-800"
                          : race.grade === "G2" ? "bg-red-100 text-red-700"
                          : race.grade === "G3" ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                        }`}>{race.grade}</span>
                      )}
                      <span className="text-sm font-bold text-gray-800 truncate">{race.name}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {race.race_date} {race.course_name} {race.distance}m {race.track_type ?? ""}
                    </div>
                  </div>

                  {/* 詳細 */}
                  <div className="text-right shrink-0">
                    <div className="text-xs text-gray-600">
                      {entry.post_number}番 / {entry.jockey}
                    </div>
                    {result?.last_3f && (
                      <div className="text-xs text-gray-500">上がり {result.last_3f}</div>
                    )}
                    {entry.odds && (
                      <div className="text-xs text-gray-400">{entry.odds}倍 {entry.popularity ? `(${entry.popularity}人気)` : ""}</div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
      <div className={`text-lg font-black ${color ?? "text-gray-900"}`}>{value}</div>
      <div className="text-[10px] font-medium text-gray-600">{label}</div>
    </div>
  );
}
