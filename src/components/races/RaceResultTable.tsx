"use client";

import { useTheme } from "@/contexts/ThemeContext";

type Result = {
  finish_position: number;
  finish_time: string | null;
  margin: string | null;
  race_entries: {
    post_number: number;
    jockey: string;
    odds: number | null;
    popularity: number | null;
    horses: { name: string } | null;
  } | null;
};

type Payout = {
  bet_type: string;
  combination: string;
  payout: number;
  popularity: number | null;
};

type Props = {
  results: Result[];
  payouts: Payout[] | null;
  myVote: any;
};

const BET_TYPE_LABELS: Record<string, string> = {
  win: "単勝", place: "複勝", bracket_quinella: "枠連", quinella: "馬連",
  quinella_place: "ワイド", exacta: "馬単", trio: "三連複", trifecta: "三連単",
};

export default function RaceResultTable({ results, payouts, myVote }: Props) {
  const { isDark } = useTheme();

  const cardBg = isDark ? "bg-slate-900 border-slate-700" : "bg-white border-gray-100";
  const textPrimary = isDark ? "text-slate-100" : "text-gray-900";
  const textSecondary = isDark ? "text-slate-400" : "text-gray-600";
  const textMuted = isDark ? "text-slate-500" : "text-gray-400";
  const headerBg = isDark ? "bg-slate-800" : "bg-gray-50";
  const borderColor = isDark ? "border-slate-700" : "border-gray-100";
  const rowHover = isDark ? "hover:bg-slate-800" : "hover:bg-gray-50";

  const myWinPick = myVote?.vote_picks?.find((p: any) => p.pick_type === "win")?.race_entries?.post_number;
  const myPlacePicks = myVote?.vote_picks?.filter((p: any) => p.pick_type === "place").map((p: any) => p.race_entries?.post_number) ?? [];

  const getPositionStyle = (pos: number) => {
    if (pos === 1) return isDark ? "bg-yellow-500 text-slate-900" : "bg-yellow-400 text-yellow-900";
    if (pos === 2) return isDark ? "bg-slate-400 text-slate-900" : "bg-gray-300 text-gray-800";
    if (pos === 3) return isDark ? "bg-orange-600 text-white" : "bg-orange-400 text-orange-900";
    return isDark ? "bg-slate-700 text-slate-300" : "bg-gray-100 text-gray-600";
  };

  const isMyPick = (postNumber: number) => postNumber === myWinPick || myPlacePicks.includes(postNumber);

  return (
    <div className="space-y-4">
      <div className={`rounded-2xl border overflow-hidden ${cardBg}`}>
        <div className={`px-4 py-3 border-b ${headerBg} ${borderColor}`}>
          <h2 className={`font-bold ${textPrimary}`}>🏁 レース結果</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className={headerBg}>
              <tr className={`border-b ${borderColor}`}>
                <th className={`px-3 py-2 text-left font-bold ${textSecondary}`}>着</th>
                <th className={`px-3 py-2 text-left font-bold ${textSecondary}`}>枠</th>
                <th className={`px-3 py-2 text-left font-bold ${textSecondary}`}>馬名</th>
                <th className={`px-3 py-2 text-left font-bold ${textSecondary}`}>騎手</th>
                <th className={`px-3 py-2 text-right font-bold ${textSecondary}`}>タイム</th>
                <th className={`px-3 py-2 text-right font-bold ${textSecondary}`}>オッズ</th>
                <th className={`px-3 py-2 text-right font-bold ${textSecondary}`}>人気</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => {
                const postNum = r.race_entries?.post_number ?? 0;
                const isPicked = isMyPick(postNum);
                return (
                  <tr key={r.finish_position} className={`border-b ${borderColor} ${rowHover} ${isPicked ? (isDark ? "bg-green-500/10" : "bg-green-50") : ""}`}>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${getPositionStyle(r.finish_position)}`}>
                        {r.finish_position}
                      </span>
                    </td>
                    <td className={`px-3 py-2 ${textMuted}`}>{postNum}</td>
                    <td className={`px-3 py-2 font-bold ${textPrimary}`}>
                      {r.race_entries?.horses?.name ?? "不明"}
                      {isPicked && <span className={`ml-1 text-xs ${isDark ? "text-green-400" : "text-green-600"}`}>★</span>}
                    </td>
                    <td className={`px-3 py-2 ${textSecondary}`}>{r.race_entries?.jockey ?? "-"}</td>
                    <td className={`px-3 py-2 text-right ${textSecondary}`}>{r.finish_time ?? "-"}</td>
                    <td className={`px-3 py-2 text-right ${textSecondary}`}>{r.race_entries?.odds ?? "-"}</td>
                    <td className={`px-3 py-2 text-right ${textSecondary}`}>{r.race_entries?.popularity ?? "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {payouts && payouts.length > 0 && (
        <div className={`rounded-2xl border overflow-hidden ${cardBg}`}>
          <div className={`px-4 py-3 border-b ${headerBg} ${borderColor}`}>
            <h2 className={`font-bold ${textPrimary}`}>💰 払戻金</h2>
          </div>
          <div className="p-4 space-y-2">
            {payouts.map((p, i) => (
              <div key={i} className={`flex items-center justify-between py-2 border-b last:border-0 ${borderColor}`}>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-medium ${textSecondary}`}>{BET_TYPE_LABELS[p.bet_type] ?? p.bet_type}</span>
                  <span className={`text-sm ${textMuted}`}>{p.combination}</span>
                </div>
                <div className="text-right">
                  <span className={`font-bold ${textPrimary}`}>¥{(p.payout ?? 0).toLocaleString()}</span>
                  {p.popularity && <span className={`text-xs ml-2 ${textMuted}`}>{p.popularity}番人気</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
