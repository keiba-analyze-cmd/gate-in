"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Settings = {
  notify_race_result: boolean;
  notify_points: boolean;
  notify_badge: boolean;
  notify_follow: boolean;
  notify_reply: boolean;
  notify_rank_up: boolean;
  notify_contest: boolean;
  notify_system: boolean;
};

const SETTING_ITEMS: { key: keyof Settings; icon: string; label: string; desc: string }[] = [
  { key: "notify_race_result", icon: "🏇", label: "レース結果", desc: "精算結果の通知" },
  { key: "notify_points", icon: "💰", label: "ポイント獲得", desc: "ポイント獲得時の通知" },
  { key: "notify_badge", icon: "🏅", label: "バッジ獲得", desc: "新しいバッジを獲得した時" },
  { key: "notify_follow", icon: "👤", label: "フォロー", desc: "フォローされた時" },
  { key: "notify_reply", icon: "💬", label: "リプライ", desc: "コメントにリプライがあった時" },
  { key: "notify_rank_up", icon: "⬆️", label: "ランクアップ", desc: "ランクが上がった時" },
  { key: "notify_contest", icon: "🏆", label: "月間大会", desc: "大会結果の通知" },
  { key: "notify_system", icon: "📢", label: "システム", desc: "運営からのお知らせ" },
];

export default function NotificationSettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/notification-settings")
      .then((res) => res.json())
      .then((data) => {
        setSettings(data);
        setLoading(false);
      });
  }, []);

  const toggle = async (key: keyof Settings) => {
    if (!settings) return;
    setSaving(true);
    setMessage("");

    const newVal = !settings[key];
    const res = await fetch("/api/notification-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: newVal }),
    });

    if (res.ok) {
      setSettings({ ...settings, [key]: newVal });
      setMessage("✅ 保存しました");
      setTimeout(() => setMessage(""), 2000);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-7 bg-gray-200 rounded w-32" />
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div className="text-sm text-gray-400">
        <Link href="/mypage" className="hover:text-green-600">マイページ</Link>
        <span className="mx-2">›</span>
        <span className="text-gray-600">通知設定</span>
      </div>

      <h1 className="text-xl font-bold text-gray-800">🔔 通知設定</h1>

      {message && (
        <div className="text-sm text-green-600 bg-green-50 p-2 rounded-lg text-center">{message}</div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {SETTING_ITEMS.map((item) => (
          <div key={item.key} className="flex items-center justify-between px-5 py-4 border-b border-gray-100 last:border-0">
            <div className="flex items-center gap-3">
              <span className="text-xl">{item.icon}</span>
              <div>
                <div className="text-sm font-bold text-gray-800">{item.label}</div>
                <div className="text-xs text-gray-500">{item.desc}</div>
              </div>
            </div>
            <button
              onClick={() => toggle(item.key)}
              disabled={saving}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                settings?.[item.key] ? "bg-green-500" : "bg-gray-300"
              }`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  settings?.[item.key] ? "translate-x-5.5 left-0.5" : "left-0.5"
                }`}
                style={{ transform: settings?.[item.key] ? "translateX(22px)" : "translateX(0)" }}
              />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
