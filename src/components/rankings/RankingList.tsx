import Link from "next/link";
import Image from "next/image";
import { getRank } from "@/lib/constants/ranks";

type RankingEntry = {
  rank: number;
  id: string;
  display_name: string;
  avatar_url: string | null;
  rank_id: string;
  cumulative_points?: number;
  monthly_points?: number;
  total_votes?: number;
  win_hits?: number;
  hit_rate?: number;
  best_streak?: number;
  current_streak?: number;
};

type Props = {
  rankings: RankingEntry[];
  type: string;
  currentUserId: string;
};

const MEDAL = ["🥇", "🥈", "🥉"];

export default function RankingList({ rankings, type, currentUserId }: Props) {
  // 上位3名を特別表示
  const top3 = rankings.slice(0, 3);
  const rest = rankings.slice(3);

  return (
    <div className="space-y-3">
      {/* 🏆 トップ3 */}
      {top3.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {[1, 0, 2].map((idx) => {
            const entry = top3[idx];
            if (!entry) return <div key={idx} />;
            const userRank = getRank(entry.rank_id);
            const isMe = entry.id === currentUserId;
            return (
              <Link
                key={entry.id}
                href={`/users/${entry.id}`}
                className={`bg-white rounded-2xl border p-4 text-center transition-all hover:shadow-md ${
                  idx === 0 ? "border-yellow-300 bg-yellow-50/50 -mt-2 pb-6" :
                  idx === 1 ? "border-gray-200" :
                  "border-orange-200 bg-orange-50/30"
                } ${isMe ? "ring-2 ring-green-400" : ""}`}
              >
                <div className="text-2xl mb-1">{MEDAL[entry.rank - 1]}</div>
                {entry.avatar_url ? (
                  <img src={entry.avatar_url} alt="" className={`mx-auto rounded-full mb-2 ${idx === 0 ? "w-16 h-16" : "w-12 h-12"}`} />
                ) : (
                  <div className={`mx-auto rounded-full bg-green-100 flex items-center justify-center mb-2 ${idx === 0 ? "w-16 h-16 text-2xl" : "w-12 h-12 text-lg"}`}>🏇</div>
                )}
                <div className="text-sm font-bold text-gray-800 truncate">{entry.display_name}</div>
                <div className="text-xs text-gray-400">{userRank.icon} {userRank.name}</div>
                <div className="text-lg font-bold text-green-600 mt-1">
                  {getValueDisplay(entry, type)}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* 4位以降 */}
      {rest.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {rest.map((entry) => {
            const userRank = getRank(entry.rank_id);
            const isMe = entry.id === currentUserId;
            return (
              <Link
                key={entry.id}
                href={`/users/${entry.id}`}
                className={`flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors ${
                  isMe ? "bg-green-50/50" : ""
                }`}
              >
                <span className={`w-8 text-center text-sm font-bold ${
                  entry.rank <= 10 ? "text-green-600" : "text-gray-400"
                }`}>
                  {entry.rank}
                </span>
                {entry.avatar_url ? (
                  <Image width={32} height={32} src={entry.avatar_url} alt="" className="w-9 h-9 rounded-full" unoptimized />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-sm">🏇</div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-gray-800 truncate">
                    {entry.display_name}
                    {isMe && <span className="text-xs text-green-600 ml-1">（あなた）</span>}
                  </div>
                  <div className="text-xs text-gray-400">{userRank.icon} {userRank.name}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-bold text-green-600">
                    {getValueDisplay(entry, type)}
                  </div>
                  {type !== "streak" && entry.hit_rate !== undefined && (
                    <div className="text-xs text-gray-400">的中率 {entry.hit_rate}%</div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function getValueDisplay(entry: any, type: string): string {
  switch (type) {
    case "monthly":
      return `${entry.monthly_points?.toLocaleString() ?? 0} P`;
    case "cumulative":
      return `${entry.cumulative_points?.toLocaleString() ?? 0} P`;
    case "hit_rate":
      return `${entry.win_hits ?? 0}回的中`;
    case "streak":
      return `${entry.best_streak ?? 0}連続`;
    default:
      return "";
  }
}
