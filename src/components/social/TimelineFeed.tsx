"use client";

import { useEffect, useState } from "react";
import TimelineItem from "./TimelineItem";
import { useTheme } from "@/contexts/ThemeContext";

type TimelineEntry = {
  type: string;
  id: string;
  vote_id?: string;
  like_count?: number;
  is_liked?: boolean;
  user: { display_name: string; avatar_url: string | null; avatar_emoji: string | null; rank_id: string; is_verified?: boolean } | null;
  user_id: string;
  race: { name: string; grade: string | null; course_name: string } | null;
  race_id: string;
  earned_points?: number;
  is_perfect?: boolean;
  status?: string;
  body?: string;
  sentiment?: string;
  comment?: string | null;
  picks?: { pick_type: string; horse_name: string; post_number: number }[];
  timestamp: string;
};

export default function TimelineFeed() {
  const { isDark } = useTheme();
  const [items, setItems] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");

  const fetchItems = async (cursor?: string, isRefresh?: boolean) => {
    const url = cursor
      ? `/api/timeline?filter=${filter}&cursor=${cursor}`
      : `/api/timeline?filter=${filter}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (cursor) {
        setItems((prev) => [...prev, ...data.items]);
      } else {
        setItems(data.items);
      }
      setNextCursor(data.next_cursor);
    }
    setLoading(false);
    if (isRefresh) setRefreshing(false);
  };

  useEffect(() => {
    setLoading(true);
    fetchItems();
  }, [filter]);

  // 手動更新
  const handleRefresh = () => {
    setRefreshing(true);
    fetchItems(undefined, true);
  };

  const filters = [
    { key: "all", label: "すべて" },
    { key: "hit", label: "🎯 的中報告" },
    { key: "vote", label: "🗳 みんなの予想" },
    { key: "comment", label: "💬 コメント" },
  ];

  const tabActive = isDark ? "bg-amber-500 text-slate-900" : "bg-green-600 text-white";
  const tabInactive = isDark 
    ? "bg-slate-800 text-slate-300 border border-slate-700 hover:border-amber-500/50" 
    : "bg-white text-gray-600 border border-gray-200 hover:border-green-300";
  const cardBg = isDark ? "bg-slate-900" : "bg-white";
  const textMuted = isDark ? "text-slate-400" : "text-gray-400";
  const btnStyle = isDark 
    ? "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700" 
    : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200";
  const refreshBtnStyle = isDark
    ? "bg-amber-500 text-slate-900 hover:bg-amber-400"
    : "bg-green-600 text-white hover:bg-green-700";

  return (
    <div>
      {/* フィルター + 更新ボタン */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide flex-1">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                filter === f.key ? tabActive : tabInactive
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing || loading}
          className={`px-3 py-1.5 rounded-full text-sm font-bold transition-colors shrink-0 disabled:opacity-50 ${refreshBtnStyle}`}
        >
          {refreshing ? "🔄" : "🔄 更新"}
        </button>
      </div>

      {loading ? (
        <div className={`${cardBg} rounded-xl p-8 text-center text-sm ${textMuted}`}>
          読み込み中...
        </div>
      ) : items.length === 0 ? (
        <div className={`${cardBg} rounded-xl p-8 text-center text-sm ${textMuted}`}>
          <div className="text-3xl mb-2">📭</div>
          まだ投稿がありません
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <TimelineItem key={`${item.type}-${item.id}`} item={item} />
          ))}

          {nextCursor && (
            <button
              onClick={() => fetchItems(nextCursor)}
              className={`w-full py-3 rounded-xl text-sm font-medium transition-colors ${btnStyle}`}
            >
              もっと見る
            </button>
          )}
        </div>
      )}
    </div>
  );
}
