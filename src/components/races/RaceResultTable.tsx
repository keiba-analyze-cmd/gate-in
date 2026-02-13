type Result = {
  finish_position: number;
  finish_time: string | null;
  margin: string | null;
  last_3f: number | null;
  race_entries: {
    id?: string;
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

export default function RaceResultTable({ results, payouts, myVote }: Props) {
  // 自分の予想を抽出
  const myPicks = myVote?.vote_picks ?? [];
  const myWinEntryId = myPicks.find((p: any) => p.pick_type === "win")?.race_entry_id;
  const myPlaceEntryIds = new Set(myPicks.filter((p: any) => p.pick_type === "place").map((p: any) => p.race_entry_id));
  const myDangerEntryId = myPicks.find((p: any) => p.pick_type === "danger")?.race_entry_id;

  const isMyPick = (entryId?: string) => {
    if (!entryId) return null;
    if (myWinEntryId === entryId) return "◎";
    if (myPlaceEntryIds.has(entryId)) return "○";
    if (myDangerEntryId === entryId) return "△";
    return null;
  };

  const betTypeLabels: Record<string, string> = {
    win: "単勝",
    place: "複勝",
    bracket_quinella: "枠連",
    quinella: "馬連",
    exacta: "馬単",
    wide: "ワイド",
    trio: "三連複",
    trifecta: "三連単",
  };

  return (
    <div className="space-y-4">
      {/* 的中サマリー */}
      {myVote && (
        <div className={`rounded-2xl border-2 p-4 text-center ${
          myVote.status === "settled_hit"
            ? "border-green-400 bg-green-50"
            : "border-gray-200 bg-gray-50"
        }`}>
          <div className="text-3xl mb-1">
            {myVote.is_perfect ? "💎" : myVote.status === "settled_hit" ? "🎯" : "😢"}
          </div>
          <div className={`text-lg font-black ${
            myVote.status === "settled_hit" ? "text-green-600" : "text-gray-500"
          }`}>
            {myVote.is_perfect
              ? "完全的中！"
              : myVote.status === "settled_hit"
              ? "的中！"
              : "ハズレ..."}
          </div>
          {(myVote.earned_points ?? 0) > 0 && (
            <div className="text-2xl font-black text-green-600 mt-1">
              +{myVote.earned_points} P
            </div>
          )}
        </div>
      )}

      {/* 着順結果 */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h2 className="font-bold text-gray-800 mb-3">🏆 レース結果</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 border-b border-gray-100">
                <th className="py-2 text-left w-12">着順</th>
                <th className="py-2 text-left w-10">馬番</th>
                <th className="py-2 text-left">馬名</th>
                <th className="py-2 text-left">騎手</th>
                <th className="py-2 text-right">タイム</th>
                <th className="py-2 text-right">着差</th>
                <th className="py-2 text-right">人気</th>
                {myVote && <th className="py-2 text-center w-10">予想</th>}
              </tr>
            </thead>
            <tbody>
              {results.map((result) => {
                const pick = isMyPick((result.race_entries as any)?.id);
                return (
                  <tr
                    key={result.finish_position}
                    className={`border-b border-gray-50 ${
                      result.finish_position === 1 ? "bg-yellow-50" :
                      result.finish_position <= 3 ? "bg-orange-50/30" : ""
                    }`}
                  >
                    <td className="py-2.5">
                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                        result.finish_position === 1
                          ? "bg-yellow-400 text-white"
                          : result.finish_position === 2
                          ? "bg-gray-300 text-white"
                          : result.finish_position === 3
                          ? "bg-orange-400 text-white"
                          : "bg-gray-100 text-gray-600"
                      }`}>
                        {result.finish_position}
                      </span>
                    </td>
                    <td className="py-2.5 font-bold">{result.race_entries?.post_number}</td>
                    <td className="py-2.5 font-bold">{result.race_entries?.horses?.name}</td>
                    <td className="py-2.5 text-gray-600">{result.race_entries?.jockey}</td>
                    <td className="py-2.5 text-right text-gray-600 font-mono text-xs">{result.finish_time ?? "-"}</td>
                    <td className="py-2.5 text-right text-gray-500 text-xs">{result.margin || "-"}</td>
                    <td className="py-2.5 text-right text-gray-500">
                      {result.race_entries?.popularity ? `${result.race_entries.popularity}番` : "-"}
                    </td>
                    {myVote && (
                      <td className="py-2.5 text-center">
                        {pick && (
                          <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                            pick === "◎" ? "bg-red-100 text-red-600" :
                            pick === "○" ? "bg-blue-100 text-blue-600" :
                            "bg-gray-100 text-gray-600"
                          }`}>
                            {pick}
                          </span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 払戻金 */}
      {payouts && payouts.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-bold text-gray-800 mb-3">💰 払戻金</h2>
          <div className="space-y-1.5">
            {payouts.map((payout, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-gray-600 font-medium">{betTypeLabels[payout.bet_type] ?? payout.bet_type}</span>
                  <span className="text-xs text-gray-400">{payout.combination}</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-gray-800">
                    ¥{payout.payout_amount.toLocaleString()}
                  </span>
                  {payout.popularity && (
                    <span className="text-xs text-gray-400 ml-2">{payout.popularity}番人気</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
