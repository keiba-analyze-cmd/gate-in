import Link from "next/link";

type Entry = {
  id: string;
  post_number: number;
  gate_number: number | null;
  jockey: string;
  weight: number | null;
  odds: number | null;
  popularity: number | null;
  horses: {
    id: string;
    name: string;
    sex: string;
    sire: string | null;
    trainer: string | null;
    stable_area: string | null;
  } | null;
};

type Props = {
  entries: Entry[];
  myVote?: any;
  results?: any[] | null;
};

export default function HorseList({ entries, myVote, results }: Props) {
  const winPickId = myVote?.vote_picks?.find((p: any) => p.pick_type === "win")?.race_entry_id;
  const placePickIds = myVote?.vote_picks?.filter((p: any) => p.pick_type === "place").map((p: any) => p.race_entry_id) ?? [];
  const backPickIds = myVote?.vote_picks?.filter((p: any) => p.pick_type === "back").map((p: any) => p.race_entry_id) ?? [];
  const dangerPickId = myVote?.vote_picks?.find((p: any) => p.pick_type === "danger")?.race_entry_id;

  return (
    <div className="space-y-1.5">
      {/* ヘッダー */}
      <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs text-gray-400 font-medium">
        <div className="col-span-1">枠</div>
        <div className="col-span-1">番</div>
        <div className="col-span-3">馬名</div>
        <div className="col-span-2">騎手</div>
        <div className="col-span-1 text-right">斤量</div>
        <div className="col-span-2 text-right">オッズ</div>
        <div className="col-span-2 text-right">予想</div>
      </div>

      {entries.map((entry) => {
        const isWin = entry.id === winPickId;
        const isPlace = placePickIds.includes(entry.id);
        const isBack = backPickIds.includes(entry.id);
        const isDanger = entry.id === dangerPickId;
        const result = results?.find((r: any) => r.race_entry_id === entry.id);

        return (
          <div
            key={entry.id}
            className={`grid grid-cols-12 gap-2 items-center px-3 py-2.5 rounded-lg text-sm ${
              result?.finish_position === 1
                ? "bg-yellow-50 border border-yellow-200"
                : result?.finish_position && result.finish_position <= 3
                ? "bg-orange-50 border border-orange-100"
                : isWin
                ? "bg-red-50 border border-red-100"
                : isPlace
                ? "bg-blue-50 border border-blue-100"
                : isBack
                ? "bg-yellow-50 border border-yellow-100"
                : isDanger
                ? "bg-gray-100 border border-gray-200"
                : "bg-gray-50"
            }`}
          >
            {/* 枠番 */}
            <div className="col-span-1">
              <GateNumber gate={entry.gate_number} />
            </div>

            {/* 馬番 */}
            <div className="col-span-1">
              <span className="font-bold text-gray-800">{entry.post_number}</span>
            </div>

            {/* 馬名 */}
            <div className="col-span-3">
              <div className="font-bold text-gray-800 truncate">
                {entry.horses?.id ? (
                  <Link href={"/horses/" + entry.horses.id} className="hover:text-green-600 hover:underline">
                    {entry.horses.name}
                  </Link>
                ) : (
                  "不明"
                )}
              </div>
              <div className="text-xs text-gray-400 truncate">
                {entry.horses?.sex} {entry.horses?.sire}
              </div>
            </div>

            {/* 騎手 */}
            <div className="col-span-2 text-gray-600 truncate">
              {entry.jockey}
            </div>

            {/* 斤量 */}
            <div className="col-span-1 text-right text-gray-500">
              {entry.weight}
            </div>

            {/* オッズ */}
            <div className="col-span-2 text-right">
              {entry.odds && (
                <span className="font-bold text-gray-800">{entry.odds}</span>
              )}
              {entry.popularity && (
                <span className="text-xs text-gray-400 ml-1">
                  ({entry.popularity}人気)
                </span>
              )}
            </div>

            {/* 予想マーク */}
            <div className="col-span-2 text-right">
              {result && (
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                  result.finish_position === 1 ? "bg-yellow-200 text-yellow-800" :
                  result.finish_position <= 3 ? "bg-orange-200 text-orange-800" :
                  "bg-gray-200 text-gray-600"
                }`}>
                  {result.finish_position}着
                </span>
              )}
              {isWin && <span className="text-xs font-bold text-red-600 ml-1">◎</span>}
              {isPlace && <span className="text-xs font-bold text-blue-600 ml-1">○</span>}
              {isBack && <span className="text-xs font-bold text-yellow-600 ml-1">△</span>}
              {isDanger && <span className="text-xs font-bold text-gray-500 ml-1">⚠️</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function GateNumber({ gate }: { gate: number | null }) {
  if (!gate) return <span className="text-gray-300">-</span>;
  const colors: Record<number, string> = {
    1: "bg-white text-gray-800 border border-gray-300",
    2: "bg-black text-white",
    3: "bg-red-500 text-white",
    4: "bg-blue-500 text-white",
    5: "bg-yellow-400 text-gray-800",
    6: "bg-green-500 text-white",
    7: "bg-orange-500 text-white",
    8: "bg-pink-400 text-white",
  };
  return (
    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${colors[gate] ?? "bg-gray-200"}`}>
      {gate}
    </span>
  );
}
