import Link from "next/link";
import RaceCardCountdown from "./RaceCardCountdown";

type Props = {
  race: {
    id: string;
    name: string;
    race_date: string;
    course_name: string;
    grade: string | null;
    status: string;
    race_number?: number | null;
    distance?: number | null;
    start_time?: string | null;
    track_type?: string | null;
    head_count?: number | null;
    post_time?: string | null;
  };
  voted?: boolean;
  voteResult?: "none" | "pending" | "hit" | "miss";
  isDeadlinePassed?: boolean;
};

const GRADE_STYLES: Record<string, { bg: string; text: string }> = {
  G1: { bg: "bg-orange-600", text: "text-white" },
  G2: { bg: "bg-red-600", text: "text-white" },
  G3: { bg: "bg-green-600", text: "text-white" },
  OP: { bg: "bg-gray-600", text: "text-white" },
  L: { bg: "bg-blue-600", text: "text-white" },
};

export default function RaceCard({ race, voted, voteResult = "none", isDeadlinePassed }: Props) {
  const grade = race.grade ? GRADE_STYLES[race.grade] ?? { bg: "bg-gray-500", text: "text-white" } : null;
  const isFinished = race.status === "finished";

  // ステータスラベル
  const statusInfo = isFinished
    ? { label: "確定", color: "text-gray-500 font-bold" }
    : isDeadlinePassed
    ? { label: "締切", color: "text-orange-500 font-bold" }
    : race.status === "voting_open"
    ? { label: "受付中", color: "text-green-600 font-black" }
    : { label: "締切", color: "text-yellow-600 font-bold" };

  // 結果確定済みレースのカード色
  const cardStyle = isFinished
    ? voteResult === "hit"
      ? "border-green-300 bg-green-50/60"
      : voteResult === "miss"
      ? "border-gray-200 bg-gray-50/80"
      : "border-gray-200 bg-gray-50/50"
    : "border-gray-200 bg-white";

  // 結果バッジ
  const resultBadge = isFinished
    ? voteResult === "hit"
      ? { label: "🎯 的中", color: "text-green-600" }
      : voteResult === "miss"
      ? { label: "ハズレ", color: "text-gray-400" }
      : voteResult === "none" && !voted
      ? { label: "未投票", color: "text-gray-300" }
      : null
    : null;

  return (
    <Link href={`/races/${race.id}`}
      className={`rounded-2xl border flex items-center gap-3 px-4 py-3 hover:shadow-md hover:border-gray-300 transition-all cursor-pointer relative ${cardStyle}`}>

      {/* 的中マーク */}
      {voteResult === "hit" && (
        <span className="absolute -top-2 -right-1 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm rotate-[3deg] z-10">
          🎯 的中!
        </span>
      )}

      {voted && !isFinished && (
        <span className="absolute -top-2 -left-1 bg-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm rotate-[-3deg] z-10">
          ✅ 投票済
        </span>
      )}

      {/* ハズレの左ドット */}
      {voteResult === "miss" && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-red-300 rounded-r-full" />
      )}

      {grade ? (
        <span className={`${grade.bg} ${grade.text} text-[11px] font-black px-2 py-1 rounded-md min-w-[32px] text-center`}>
          {race.grade}
        </span>
      ) : (
        <span className="bg-gray-200 text-gray-700 text-[11px] font-bold px-2 py-1 rounded-md min-w-[32px] text-center">
          {race.race_number ? `${race.race_number}R` : "一般"}
        </span>
      )}

      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold text-gray-900 truncate">{race.name}</div>
        <div className="text-[11px] text-gray-500 font-medium flex items-center gap-1 flex-wrap">
          <span>{race.course_name}</span>
          <span className="text-gray-300">|</span>
          <span>{race.track_type}{race.distance}m</span>
          {race.head_count != null && race.head_count > 0 && (
            <>
              <span className="text-gray-300">|</span>
              <span>{race.head_count}頭</span>
            </>
          )}
          {race.post_time && race.status === "voting_open" && !isDeadlinePassed && (
            <>
              <span className="text-gray-300">|</span>
              <RaceCardCountdown postTime={race.post_time} />
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col items-end gap-0.5 shrink-0">
        <span className={`text-[11px] ${statusInfo.color}`}>
          {statusInfo.label}
        </span>
        {resultBadge && (
          <span className={`text-[10px] font-medium ${resultBadge.color}`}>
            {resultBadge.label}
          </span>
        )}
      </div>

      <span className="text-gray-400 text-sm font-bold">›</span>
    </Link>
  );
}
