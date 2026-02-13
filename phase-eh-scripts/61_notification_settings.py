#!/usr/bin/env python3
"""
Task #61: 通知設定ページ
- supabase/migrations/add_notification_settings.sql: 通知設定カラム追加
- src/app/(main)/mypage/notification-settings/page.tsx: 設定UI
- src/app/api/notification-settings/route.ts: 設定API
"""

import os

# ============================================================
# 1. マイグレーション
# ============================================================
MIGRATION = '''\
-- 通知設定カラムをprofilesに追加
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notify_race_result BOOLEAN DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notify_points BOOLEAN DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notify_badge BOOLEAN DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notify_follow BOOLEAN DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notify_reply BOOLEAN DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notify_rank_up BOOLEAN DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notify_contest BOOLEAN DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notify_system BOOLEAN DEFAULT true;
'''

# ============================================================
# 2. 設定API
# ============================================================
SETTINGS_API = '''\
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const ALLOWED_FIELDS = [
  "notify_race_result",
  "notify_points",
  "notify_badge",
  "notify_follow",
  "notify_reply",
  "notify_rank_up",
  "notify_contest",
  "notify_system",
];

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(ALLOWED_FIELDS.join(", "))
    .eq("id", user.id)
    .single();

  return NextResponse.json(profile ?? {});
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const body = await request.json();
  const updates: Record<string, boolean> = {};

  for (const field of ALLOWED_FIELDS) {
    if (typeof body[field] === "boolean") {
      updates[field] = body[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "更新項目がありません" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id)
    .select(ALLOWED_FIELDS.join(", "))
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
'''

# ============================================================
# 3. 設定ページ
# ============================================================
SETTINGS_PAGE = '''\
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
'''

def run():
    # 1. マイグレーション
    os.makedirs("supabase/migrations", exist_ok=True)
    with open("supabase/migrations/add_notification_settings.sql", "w") as f:
        f.write(MIGRATION)
    print("  ✅ supabase/migrations/add_notification_settings.sql")

    # 2. API
    os.makedirs("src/app/api/notification-settings", exist_ok=True)
    with open("src/app/api/notification-settings/route.ts", "w") as f:
        f.write(SETTINGS_API)
    print("  ✅ src/app/api/notification-settings/route.ts")

    # 3. ページ
    os.makedirs("src/app/(main)/mypage/notification-settings", exist_ok=True)
    with open("src/app/(main)/mypage/notification-settings/page.tsx", "w") as f:
        f.write(SETTINGS_PAGE)
    print("  ✅ src/app/(main)/mypage/notification-settings/page.tsx")

    # 4. マイページメニューに通知設定リンク追加
    mypage = "src/app/(main)/mypage/page.tsx"
    if os.path.exists(mypage):
        with open(mypage, "r") as f:
            content = f.read()

        if "/mypage/notification-settings" not in content:
            old = '<MenuItem href="/notifications" icon="🔔" label="通知" desc="お知らせ一覧" />'
            new = old + '\n        <MenuItem href="/mypage/notification-settings" icon="⚙️" label="通知設定" desc="通知のON/OFF" />'

            if old in content:
                content = content.replace(old, new)
                with open(mypage, "w") as f:
                    f.write(content)
                print("  ✅ マイページメニューに通知設定リンク追加")
            else:
                print("  ⚠️  パターン不一致。手動追加してください")
        else:
            print("  ⏭️  既にリンクあり")

    print("\n🏁 Task #61 完了")
    print("📌 Supabase SQL Editor で add_notification_settings.sql を実行してください")

if __name__ == "__main__":
    run()
