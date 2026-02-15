"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type Pick = { pick_type: string; post_number: number; horse_name: string };
type ActivityItem = {
  type: string;
  id: string;
  race: { name: string; grade: string | null; course_name: string; race_number?: number | null; race_date?: string } | null;
  race_id: string;
  earned_points?: number;
  is_perfect?: boolean;
  status?: string;
  body?: string;
  sentiment?: string;
  picks?: Pick[];
  timestamp: string;
};

const PICK_STYLE: Record<string, { mark: string; bg: string; text: string }> = {
  win: { mark: "◎", bg: "bg-red-100", text: "text-red-700" },
  place: { mark: "○", bg: "bg-blue-100", text: "text-blue-700" },
  back: { mark: "△", bg: "bg-yellow-100", text: "text-yellow-700" },
  danger: { mark: "⚠️", bg: "bg-gray-200", text: "text-gray-700" },
};

export default function UserActivityFeed({ userId }: { userId: string }) {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  const fetchItems = async (cursorVal?: string) => {
    const isMore = !!cursorVal;
    if (isMore) setLoadingMore(true); else setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "5" });
      if (cursorVal) params.set("cursor", cursorVal);
      const res = await fetch(`/api/users/${userId}/activity?${params}`);
      if (res.ok) {
        const data = await res.json();
        if (isMore) setItems((prev) => [...prev, ...data.items]);
        else setItems(data.items);
        setCursor(data.next_cursor);
        setHasMore(!!data.next_cursor);
      }
    } catch {}
    setLoading(false);
    setLoadingMore(false);
  };

  useEffect(() => { fetchItems(); }, [userId]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h2 className="font-black text-gray-900 mb-3">📝 アクティビティ</h2>
        <div className="text-center py-6 text-gray-400 text-sm">読み込み中...</div>
      </div>
    );
  }

  if (items.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <h2 className="font-black text-gray-900 mb-3">📝 アクティビティ</h2>
      <div className="space-y-3">
        {items.map((item) => (
          <ActivityCard key={item.id} item={item} />
        ))}
      </div>
      {hasMore && (
        <button onClick={() => cursor && fetchItems(cursor)} disabled={loadingMore}
          className="w-full mt-4 py-2.5 text-sm font-bold text-green-600 bg-green-50 rounded-xl hover:bg-green-100 transition-colors disabled:opacity-50">
          {loadingMore ? "読み込み中..." : "もっと見る"}
        </button>
      )}
    </div>
  );
}

function ActivityCard({ item }: { item: ActivityItem }) {
  const timeAgo = getTimeAgo(item.timestamp);
  const isHit = item.status === "settled_hit";

  const raceInfo = item.race
    ? `${item.race.course_name}${item.race.race_number ? ` ${item.race.race_number}R` : ""}`
    : "";

  return (
    <Link href={`/races/${item.race_id}`}
      className="block bg-gray-50 rounded-xl p-3 hover:bg-gray-100 transition-colors border border-gray-100">

      {/* ヘッダー: タイプ + レース名 + 時間 */}
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-xs text-gray-400">
          {item.type === "vote_submitted" ? "🗳 投票"
            : item.type === "vote_result" ? (isHit ? "🎯 的中" : "📊 結果")
            : "💬 コメント"}
        </span>
        {item.race?.grade && (
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
            item.race.grade === "G1" ? "bg-yellow-100 text-yellow-800"
            : item.race.grade === "G2" ? "bg-red-100 text-red-700"
            : item.race.grade === "G3" ? "bg-green-100 text-green-700"
            : "bg-gray-100 text-gray-600"
          }`}>{item.race.grade}</span>
        )}
        <span className="text-sm font-bold text-gray-800 truncate flex-1">{item.race?.name}</span>
        <span className="text-[10px] text-gray-300 shrink-0">{timeAgo}</span>
      </div>

      {/* レース情報 */}
      {raceInfo && (
        <div className="text-[11px] text-gray-400 mb-1.5">{raceInfo}</div>
      )}

      {/* 投票内容 */}
      {(item.type === "vote_submitted" || item.type === "vote_result") && item.picks && item.picks.length > 0 && (() => {
        const nonBackPicks = item.picks.filter(p => p.pick_type !== "back");
        const backPicks = item.picks.filter(p => p.pick_type === "back");
        return (
          <div className="flex flex-wrap gap-1.5 mb-1">
            {nonBackPicks.map((pick, i) => {
              const style = PICK_STYLE[pick.pick_type] ?? PICK_STYLE.win;
              return (
                <span key={i} className={`${style.bg} ${style.text} text-[11px] px-2 py-0.5 rounded-full font-medium`}>
                  {style.mark} {pick.post_number} {pick.horse_name}
                </span>
              );
            })}
            {backPicks.length > 0 && (
              <span className="bg-yellow-100 text-yellow-700 text-[11px] px-2 py-0.5 rounded-full font-medium">
                △ {backPicks.map(p => p.post_number).join(",")}
              </span>
            )}
          </div>
        );
      })()}

      {/* 結果ポイント */}
      {item.type === "vote_result" && (
        <div className="flex items-center gap-2">
          {isHit && (item.earned_points ?? 0) > 0 && (
            <span className="text-xs font-bold text-green-600">+{item.earned_points} P</span>
          )}
          {item.is_perfect && <span className="text-xs">💎 完全的中</span>}
          {!isHit && <span className="text-xs text-gray-400">ハズレ</span>}
        </div>
      )}

      {/* コメント本文 */}
      {item.type === "comment" && item.body && (
        <p className="text-sm text-gray-600 line-clamp-2">{item.body}</p>
      )}
    </Link>
  );
}

function getTimeAgo(dateStr: string): string {
  const now = new Date(); const d = new Date(dateStr);
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return "たった今";
  if (diff < 3600) return `${Math.floor(diff / 60)}分前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}時間前`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}日前`;
  return d.toLocaleDateString("ja-JP", { month: "short", day: "numeric" });
}
