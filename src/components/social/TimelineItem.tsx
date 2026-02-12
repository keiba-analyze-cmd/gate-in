import Link from "next/link";
import { getRank } from "@/lib/constants/ranks";

type Props = {
  item: {
    type: string;
    user: { display_name: string; avatar_url: string | null; rank_id: string } | null;
    user_id: string;
    race: { name: string; grade: string | null; course_name: string } | null;
    race_id: string;
    earned_points?: number;
    is_perfect?: boolean;
    status?: string;
    body?: string;
    sentiment?: string;
    timestamp: string;
  };
};

const SENTIMENT_LABEL: Record<string, string> = {
  very_positive: "🔥 超注目",
  positive: "👍 推し",
  negative: "🤔 微妙",
  very_negative: "⚠️ 危険",
};

export default function TimelineItem({ item }: Props) {
  const rank = item.user ? getRank(item.user.rank_id) : null;
  const timeAgo = getTimeAgo(item.timestamp);

  const isHit = item.status === "settled_hit";
  const gradeColor = item.race?.grade
    ? item.race.grade === "G1" ? "bg-yellow-100 text-yellow-800"
    : item.race.grade === "G2" ? "bg-red-100 text-red-700"
    : item.race.grade === "G3" ? "bg-green-100 text-green-700"
    : "bg-gray-100 text-gray-600"
    : "";

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      {/* ヘッダー */}
      <div className="flex items-center gap-2 mb-2">
        <Link href={`/users/${item.user_id}`} className="flex items-center gap-2 group">
          {item.user?.avatar_url ? (
            <img src={item.user.avatar_url} alt="" className="w-8 h-8 rounded-full" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-sm">🏇</div>
          )}
          <span className="text-sm font-bold text-gray-800 group-hover:text-green-600">
            {item.user?.display_name ?? "匿名"}
          </span>
        </Link>
        {rank && <span className="text-xs text-gray-400">{rank.icon}</span>}
        <span className="text-xs text-gray-300 ml-auto">{timeAgo}</span>
      </div>

      {/* コンテンツ */}
      {item.type === "vote_result" && (
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-gray-500">
              {isHit ? "🎯 的中！" : "📊 結果"} 
            </span>
            {item.race?.grade && (
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${gradeColor}`}>
                {item.race.grade}
              </span>
            )}
            <Link
              href={`/races/${item.race_id}`}
              className="text-sm font-bold text-gray-800 hover:text-green-600"
            >
              {item.race?.name}
            </Link>
          </div>
          <div className="flex items-center gap-2">
            {(item.earned_points ?? 0) > 0 && (
              <span className="text-sm font-bold text-green-600">+{item.earned_points} P</span>
            )}
            {item.is_perfect && (
              <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                💎 完全的中
              </span>
            )}
            {!isHit && (
              <span className="text-xs text-gray-400">ハズレ</span>
            )}
          </div>
        </div>
      )}

      {item.type === "comment" && (
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-gray-500">💬 コメント</span>
            {item.race?.grade && (
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${gradeColor}`}>
                {item.race.grade}
              </span>
            )}
            <Link
              href={`/races/${item.race_id}`}
              className="text-sm font-bold text-gray-800 hover:text-green-600"
            >
              {item.race?.name}
            </Link>
            {item.sentiment && (
              <span className="text-xs text-gray-400">{SENTIMENT_LABEL[item.sentiment]}</span>
            )}
          </div>
          <p className="text-sm text-gray-600 line-clamp-2">{item.body}</p>
        </div>
      )}
    </div>
  );
}

function getTimeAgo(dateStr: string): string {
  const now = new Date();
  const d = new Date(dateStr);
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return "たった今";
  if (diff < 3600) return `${Math.floor(diff / 60)}分前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}時間前`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}日前`;
  return d.toLocaleDateString("ja-JP", { month: "short", day: "numeric" });
}
