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
};

const GRADE_STYLES: Record<string, { bg: string; text: string }> = {
  G1: { bg: "bg-orange-600", text: "text-white" },
  G2: { bg: "bg-red-600", text: "text-white" },
  G3: { bg: "bg-green-600", text: "text-white" },
  OP: { bg: "bg-gray-600", text: "text-white" },
  L: { bg: "bg-blue-600", text: "text-white" },
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  voting_open: { label: "受付中", color: "text-green-600 font-black" },
  voting_closed: { label: "締切", color: "text-yellow-600 font-bold" },
  finished: { label: "確定", color: "text-gray-500 font-bold" },
};

export default function RaceCard({ race, voted }: Props) {
  const grade = race.grade ? GRADE_STYLES[race.grade] ?? { bg: "bg-gray-500", text: "text-white" } : null;
  const status = STATUS_LABELS[race.status] ?? { label: race.status, color: "text-gray-600" };

  return (
    <Link href={`/races/${race.id}`} className="bg-white rounded-2xl border border-gray-200 flex items-center gap-3 px-4 py-3 hover:shadow-md hover:border-gray-300 transition-all cursor-pointer relative">
      {voted && (
        <span className="absolute -top-2 -left-1 bg-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm rotate-[-3deg] z-10">
          ✅ 投票済
        </span>
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
          {race.post_time && race.status === "voting_open" && (
            <>
              <span className="text-gray-300">|</span>
              <RaceCardCountdown postTime={race.post_time} />
            </>
          )}
        </div>
      </div>

      <span className={`text-[11px] ${status.color} shrink-0`}>
        {status.label}
      </span>

      <span className="text-gray-400 text-sm font-bold">›</span>
    </Link>
  );
}
