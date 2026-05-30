"use client";

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
  payout_amount: number;
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

function positionStyle(pos: number): React.CSSProperties {
  if (pos === 1) return { background: "var(--gate-gold)", color: "#3a2c08" };
  if (pos === 2) return { background: "#c5cad4", color: "#2b2f36" };
  if (pos === 3) return { background: "#cd9b67", color: "#fff" };
  return { background: "var(--surface-2)", color: "var(--ink-3)" };
}

export default function RaceResultTable({ results, payouts, myVote }: Props) {
  const myWinPick = myVote?.vote_picks?.find((p: any) => p.pick_type === "win")?.race_entries?.post_number;
  const myPlacePicks = myVote?.vote_picks?.filter((p: any) => p.pick_type === "place").map((p: any) => p.race_entries?.post_number) ?? [];

  const isMyPick = (postNumber: number) => postNumber === myWinPick || myPlacePicks.includes(postNumber);

  return (
    <div className="space-y-4 font-display">
      <div className="rounded-2xl border bg-surface border-line overflow-hidden">
        <div className="px-4 py-3 border-b border-line bg-surface-2">
          <h2 className="font-bold text-ink">🏁 レース結果</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-2">
              <tr className="border-b border-line">
                <th className="px-3 py-2 text-left font-bold text-ink-2">着</th>
                <th className="px-3 py-2 text-left font-bold text-ink-2">枠</th>
                <th className="px-3 py-2 text-left font-bold text-ink-2">馬名</th>
                <th className="px-3 py-2 text-left font-bold text-ink-2">騎手</th>
                <th className="px-3 py-2 text-right font-bold text-ink-2">タイム</th>
                <th className="px-3 py-2 text-right font-bold text-ink-2">オッズ</th>
                <th className="px-3 py-2 text-right font-bold text-ink-2">人気</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => {
                const postNum = r.race_entries?.post_number ?? 0;
                const isPicked = isMyPick(postNum);
                return (
                  <tr
                    key={r.finish_position}
                    className="border-b border-line"
                    style={isPicked ? { background: "var(--brand-soft)" } : undefined}
                  >
                    <td className="px-3 py-2">
                      <span
                        className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold font-data"
                        style={positionStyle(r.finish_position)}
                      >
                        {r.finish_position}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-ink-3 font-data">{postNum}</td>
                    <td className="px-3 py-2 font-bold text-ink">
                      {r.race_entries?.horses?.name ?? "不明"}
                      {isPicked && <span className="ml-1 text-xs text-brand-strong">★</span>}
                    </td>
                    <td className="px-3 py-2 text-ink-2">{r.race_entries?.jockey ?? "-"}</td>
                    <td className="px-3 py-2 text-right text-ink-2 font-data">{r.finish_time ?? "-"}</td>
                    <td className="px-3 py-2 text-right text-ink-2 font-data">{r.race_entries?.odds ?? "-"}</td>
                    <td className="px-3 py-2 text-right text-ink-2 font-data">{r.race_entries?.popularity ?? "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {payouts && payouts.length > 0 && (
        <div className="rounded-2xl border bg-surface border-line overflow-hidden">
          <div className="px-4 py-3 border-b border-line bg-surface-2">
            <h2 className="font-bold text-ink">💰 払戻金</h2>
          </div>
          <div className="p-4 space-y-2">
            {payouts.map((p, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-line last:border-0">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-ink-2">{BET_TYPE_LABELS[p.bet_type] ?? p.bet_type}</span>
                  <span className="text-sm text-ink-3 font-data">{p.combination}</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-ink font-data">¥{(p.payout_amount ?? 0).toLocaleString()}</span>
                  {p.popularity && <span className="text-xs ml-2 text-ink-3">{p.popularity}番人気</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
