"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTheme } from "@/contexts/ThemeContext";

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
  const { isDark } = useTheme();
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

  const cardBg = isDark ? "bg-slate-900 border-slate-700" : "bg-white border-gray-100";
  const textPrimary = isDark ? "text-slate-100" : "text-gray-900";
  const textSecondary = isDark ? "text-slate-400" : "text-gray-500";
  const textMuted = isDark ? "text-slate-500" : "text-gray-400";
  const hoverBg = isDark ? "hover:bg-slate-800" : "hover:bg-gray-50";
  const borderColor = isDark ? "border-slate-700" : "border-gray-50";
  const unreadBg = isDark ? "bg-amber-500/10" : "bg-green-50";
  const linkColor = isDark ? "text-amber-400 hover:underline" : "text-green-600 hover:underline";

  if (loading) {
    return <div className={`${cardBg} rounded-xl p-8 text-center text-sm ${textMuted}`}>読み込み中...</div>;
  }

  return (
    <div>
      {unreadCount > 0 && (
        <div className="flex items-center justify-between mb-3">
          <span className={`text-sm ${textSecondary}`}>{unreadCount}件の未読</span>
          <button onClick={markAllRead} className={`text-xs ${linkColor}`}>
            すべて既読にする
          </button>
        </div>
      )}

      <div className={`rounded-2xl border overflow-hidden ${cardBg}`}>
        {notifications.length === 0 ? (
          <div className={`p-8 text-center text-sm ${textMuted}`}>
            通知はまだありません
          </div>
        ) : (
          notifications.map((notif) => {
            const content = (
              <div className={`flex items-start gap-3 px-5 py-4 border-b last:border-0 transition-colors ${borderColor} ${hoverBg} ${!notif.is_read ? unreadBg : ""}`}>
                <span className="text-xl shrink-0">{typeIcon[notif.type] ?? "📌"}</span>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-bold ${textPrimary}`}>{notif.title}</div>
                  {notif.body && <div className={`text-xs mt-0.5 ${textSecondary}`}>{notif.body}</div>}
                  <div className={`text-[10px] mt-1 ${textMuted}`}>
                    {new Date(notif.created_at).toLocaleString("ja-JP", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
                {!notif.is_read && (
                  <span className={`w-2 h-2 rounded-full shrink-0 mt-2 ${isDark ? "bg-amber-500" : "bg-green-500"}`} />
                )}
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
