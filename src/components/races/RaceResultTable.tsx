type Result = {
  finish_position: number;
  finish_time: string | null;
  margin: string | null;
  last_3f: number | null;
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

export default function RaceResultTable({ results, payouts, myVote }: Props) {
  return (
    <div className="space-y-4">
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
              </tr>
            </thead>
            <tbody>
              {results.slice(0, 5).map((result) => (
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
                  <td className="py-2.5 text-right text-gray-600">{result.finish_time ?? "-"}</td>
                  <td className="py-2.5 text-right text-gray-500">{result.margin || "-"}</td>
                  <td className="py-2.5 text-right text-gray-500">
                    {result.race_entries?.popularity ? `${result.race_entries.popularity}番` : "-"}
                  </td>
                </tr>
              ))}
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
                <span className="text-gray-600">{payout.bet_type}</span>
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
