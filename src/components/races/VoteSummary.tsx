type Props = {
  vote: {
    status: string;
    earned_points: number;
    is_perfect: boolean;
    vote_picks: {
      pick_type: string;
      is_hit: boolean | null;
      points_earned: number;
      race_entries: {
        post_number: number;
        horses: { name: string } | null;
      } | null;
    }[];
  };
  isFinished: boolean;
};

export default function VoteSummary({ vote, isFinished }: Props) {
  const winPick = vote.vote_picks.find((p) => p.pick_type === "win");
  const placePicks = vote.vote_picks.filter((p) => p.pick_type === "place");
  const dangerPick = vote.vote_picks.find((p) => p.pick_type === "danger");

  const isHit = vote.status === "settled_hit";

  return (
    <div className={`rounded-2xl border p-5 ${
      isFinished && isHit
        ? "bg-green-50 border-green-200"
        : isFinished
        ? "bg-gray-50 border-gray-200"
        : "bg-white border-gray-100"
    }`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-gray-800">🗳 あなたの予想</h3>
        {isFinished && (
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
            isHit ? "bg-green-200 text-green-800" : "bg-gray-200 text-gray-600"
          }`}>
            {isHit ? "🎉 的中！" : "ハズレ"}
          </span>
        )}
      </div>

      <div className="space-y-2.5">
        {/* 1着予想 */}
        {winPick && (
          <PickRow
            label="◎ 1着"
            labelColor="text-red-600"
            name={winPick.race_entries?.horses?.name ?? ""}
            number={winPick.race_entries?.post_number}
            isHit={winPick.is_hit}
            points={winPick.points_earned}
            isFinished={isFinished}
          />
        )}

        {/* 複勝予想 */}
        {placePicks.map((pick, i) => (
          <PickRow
            key={i}
            label="○ 複勝"
            labelColor="text-blue-600"
            name={pick.race_entries?.horses?.name ?? ""}
            number={pick.race_entries?.post_number}
            isHit={pick.is_hit}
            points={pick.points_earned}
            isFinished={isFinished}
          />
        ))}

        {/* 危険馬 */}
        {dangerPick && (
          <PickRow
            label="△ 危険"
            labelColor="text-gray-500"
            name={dangerPick.race_entries?.horses?.name ?? ""}
            number={dangerPick.race_entries?.post_number}
            isHit={dangerPick.is_hit}
            points={dangerPick.points_earned}
            isFinished={isFinished}
          />
        )}
      </div>

      {/* 合計ポイント */}
      {isFinished && (
        <div className="mt-4 pt-3 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <span className="font-bold text-gray-700">獲得ポイント</span>
            <span className={`text-xl font-bold ${
              vote.earned_points > 0 ? "text-green-600" : "text-gray-400"
            }`}>
              +{vote.earned_points} P
            </span>
          </div>
          {vote.is_perfect && (
            <div className="mt-2 bg-yellow-100 text-yellow-800 text-xs font-bold px-3 py-2 rounded-lg text-center">
              💎 完全的中ボーナス +300P
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PickRow({
  label, labelColor, name, number, isHit, points, isFinished,
}: {
  label: string;
  labelColor: string;
  name: string;
  number?: number;
  isHit: boolean | null;
  points: number;
  isFinished: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className={`text-xs font-bold w-14 ${labelColor}`}>{label}</span>
      <span className="text-sm font-medium text-gray-800 flex-1">
        {number && <span className="text-gray-400 mr-1">{number}</span>}
        {name}
      </span>
      {isFinished && isHit !== null && (
        <span className={`text-xs font-bold px-2 py-0.5 rounded ${
          isHit ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
        }`}>
          {isHit ? `✓ +${points}P` : "✗"}
        </span>
      )}
    </div>
  );
}
