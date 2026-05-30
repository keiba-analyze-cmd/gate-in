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
    <div className="space-y-1.5 font-display">
      {/* ヘッダー */}
      <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs text-ink-3 font-medium">
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

        const rowStyle: React.CSSProperties =
          result?.finish_position === 1
            ? { background: "var(--gate-gold-soft)", border: "1px solid var(--gate-gold)" }
            : result?.finish_position && result.finish_position <= 3
            ? { background: "var(--surface-2)", border: "1px solid var(--line)" }
            : isWin
            ? { background: "var(--brand-soft)", border: "1px solid var(--brand)" }
            : isPlace
            ? { background: "var(--info-soft)", border: "1px solid var(--info)" }
            : isBack
            ? { background: "var(--osae-soft)", border: "1px solid var(--osae)" }
            : isDanger
            ? { background: "var(--danger-soft)", border: "1px solid var(--danger)" }
            : { background: "var(--surface-2)", border: "1px solid transparent" };

        return (
          <div
            key={entry.id}
            className="grid grid-cols-12 gap-2 items-center px-3 py-2.5 rounded-lg text-sm"
            style={rowStyle}
          >
            {/* 枠番 */}
            <div className="col-span-1">
              <GateNumber gate={entry.gate_number} />
            </div>

            {/* 馬番 */}
            <div className="col-span-1">
              <span className="font-bold text-ink font-data">{entry.post_number}</span>
            </div>

            {/* 馬名 */}
            <div className="col-span-3">
              <div className="font-bold text-ink truncate">
                {entry.horses?.id ? (
                  <Link href={"/horses/" + entry.horses.id} className="hover:text-brand-strong hover:underline">
                    {entry.horses.name}
                  </Link>
                ) : (
                  "不明"
                )}
              </div>
              <div className="text-xs text-ink-3 truncate">
                {entry.horses?.sex} {entry.horses?.sire}
              </div>
            </div>

            {/* 騎手 */}
            <div className="col-span-2 text-ink-2 truncate">
              {entry.jockey}
            </div>

            {/* 斤量 */}
            <div className="col-span-1 text-right text-ink-3 font-data">
              {entry.weight}
            </div>

            {/* オッズ */}
            <div className="col-span-2 text-right">
              {entry.odds && (
                <span className="font-bold text-ink font-data">{entry.odds}</span>
              )}
              {entry.popularity && (
                <span className="text-xs text-ink-3 ml-1 font-data">
                  ({entry.popularity}人気)
                </span>
              )}
            </div>

            {/* 予想マーク */}
            <div className="col-span-2 text-right">
              {result && (
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded font-data"
                  style={
                    result.finish_position === 1
                      ? { background: "var(--gate-gold)", color: "#3a2c08" }
                      : result.finish_position <= 3
                      ? { background: "var(--surface)", color: "var(--ink-2)" }
                      : { background: "var(--surface)", color: "var(--ink-3)" }
                  }
                >
                  {result.finish_position}着
                </span>
              )}
              {isWin && <span className="text-xs font-bold text-brand-strong ml-1">◎</span>}
              {isPlace && <span className="text-xs font-bold text-info ml-1">○</span>}
              {isBack && <span className="text-xs font-bold text-osae ml-1">△</span>}
              {isDanger && <span className="text-xs font-bold text-ink-3 ml-1">⚠️</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function GateNumber({ gate }: { gate: number | null }) {
  if (!gate) return <span className="text-ink-3">-</span>;
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
    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold font-data ${colors[gate] ?? "bg-gray-200"}`}>
      {gate}
    </span>
  );
}
