"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link_url: string | null;
  is_read: boolean;
  created_at: string;
};

export default function NotificationList() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications);
        setUnreadCount(data.unread_count);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const markAllRead = async () => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mark_all_read: true }),
    });
    setNotifications(notifications.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const typeIcon: Record<string, string> = {
    race_result: "🏇",
    points_earned: "💰",
    badge_earned: "🏅",
    follow: "👤",
    rank_up: "⬆️",
    contest: "🏆",
    system: "📢",
  };

  if (loading) {
    return <div className="bg-white rounded-xl p-8 text-center text-gray-400 text-sm">読み込み中...</div>;
  }

  return (
    <div>
      {unreadCount > 0 && (
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-gray-500">{unreadCount}件の未読</span>
          <button
            onClick={markAllRead}
            className="text-xs text-green-600 hover:underline"
          >
            すべて既読にする
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            通知はまだありません
          </div>
        ) : (
          notifications.map((notif) => {
            const content = (
              <div className={`flex items-start gap-3 px-5 py-4 border-b border-gray-50 last:border-0 transition-colors ${
                !notif.is_read ? "bg-green-50/50" : "hover:bg-gray-50"
              }`}>
                <span className="text-xl mt-0.5">{typeIcon[notif.type] ?? "📌"}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-800">{notif.title}</span>
                    {!notif.is_read && (
                      <span className="w-2 h-2 bg-green-500 rounded-full shrink-0" />
                    )}
                  </div>
                  {notif.body && (
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notif.body}</p>
                  )}
                  <span className="text-xs text-gray-300 mt-1 block">
                    {new Date(notif.created_at).toLocaleDateString("ja-JP", {
                      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            );

            return notif.link_url ? (
              <Link key={notif.id} href={notif.link_url}>{content}</Link>
            ) : (
              <div key={notif.id}>{content}</div>
            );
          })
        )}
      </div>
    </div>
  );
}
