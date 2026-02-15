"use client";

import { useTheme } from "@/contexts/ThemeContext";
import NotificationList from "@/components/mypage/NotificationList";

export default function NotificationsClient() {
  const { isDark } = useTheme();

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h1 className={`text-xl font-black ${isDark ? "text-slate-100" : "text-gray-800"}`}>🔔 通知</h1>
      <NotificationList />
    </div>
  );
}
