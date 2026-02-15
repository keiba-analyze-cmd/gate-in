"use client";

import { useEffect, useState } from "react";
import TimelineItem from "./TimelineItem";

type TimelineEntry = {
  type: string;
  id: string;
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

export default function TimelineFeed() {
  const [items, setItems] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");

  const fetchItems = async (cursor?: string) => {
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
  };

  useEffect(() => {
    setLoading(true);
    fetchItems();
  }, [filter]);

  const filters = [
    { key: "all", label: "すべて" },
    { key: "hit", label: "🎯 的中報告" },
    { key: "vote", label: "🗳 みんなの予想" },
    { key: "comment", label: "💬 コメント" },
  ];

  return (
    <div>
      {/* フィルター */}
      <div className="flex gap-2 mb-4">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              filter === f.key
                ? "bg-green-600 text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:border-green-300"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* アイテムリスト */}
      {loading ? (
        <div className="bg-white rounded-xl p-8 text-center text-gray-400 text-sm">
          読み込み中...
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center text-gray-400 text-sm">
          まだアクティビティがありません
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <TimelineItem key={item.id} item={item} />
          ))}
        </div>
      )}

      {/* もっと読む */}
      {nextCursor && (
        <div className="text-center mt-4">
          <button
            onClick={() => fetchItems(nextCursor)}
            className="text-sm text-green-600 hover:underline"
          >
            もっと読む
          </button>
        </div>
      )}
    </div>
  );
}
