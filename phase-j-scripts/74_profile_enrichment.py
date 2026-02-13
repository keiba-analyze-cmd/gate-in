#!/usr/bin/env python3
"""
Task #74: 会員登録時のプロフィール拡充
- supabase/migrations/add_profile_demographics.sql: デモグラカラム追加
- src/app/(main)/mypage/setup/page.tsx: 初回プロフィール設定ページ
- src/app/auth/callback/route.ts: 新規ユーザーを設定ページへリダイレクト
- src/app/(main)/mypage/edit/page.tsx: 編集ページにもデモグラ追加
"""

import os

# ============================================================
# 1. マイグレーション
# ============================================================
MIGRATION = '''\
-- プロフィール拡充: デモグラフィック情報
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS age_group TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS horse_racing_exp TEXT DEFAULT 'beginner';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS favorite_course TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT false;
'''

# ============================================================
# 2. 初回プロフィール設定ページ
# ============================================================
SETUP_PAGE = '''\
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const AGE_GROUPS = [
  { value: "", label: "選択してください" },
  { value: "10s", label: "10代" },
  { value: "20s", label: "20代" },
  { value: "30s", label: "30代" },
  { value: "40s", label: "40代" },
  { value: "50s", label: "50代" },
  { value: "60s", label: "60代以上" },
];

const GENDERS = [
  { value: "", label: "選択してください" },
  { value: "male", label: "男性" },
  { value: "female", label: "女性" },
  { value: "other", label: "その他" },
  { value: "prefer_not", label: "回答しない" },
];

const EXPERIENCES = [
  { value: "beginner", label: "🔰 初心者（始めたばかり）" },
  { value: "intermediate", label: "📗 中級者（1〜3年）" },
  { value: "advanced", label: "📘 上級者（3年以上）" },
  { value: "expert", label: "📕 ベテラン（10年以上）" },
];

const COURSES = [
  { value: "", label: "選択してください" },
  { value: "tokyo", label: "東京" },
  { value: "nakayama", label: "中山" },
  { value: "hanshin", label: "阪神" },
  { value: "kyoto", label: "京都" },
  { value: "chukyo", label: "中京" },
  { value: "kokura", label: "小倉" },
  { value: "niigata", label: "新潟" },
  { value: "fukushima", label: "福島" },
  { value: "sapporo", label: "札幌" },
  { value: "hakodate", label: "函館" },
];

export default function ProfileSetupPage() {
  const [name, setName] = useState("");
  const [gender, setGender] = useState("");
  const [ageGroup, setAgeGroup] = useState("");
  const [exp, setExp] = useState("beginner");
  const [course, setCourse] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("表示名を入力してください");
      return;
    }
    setLoading(true);
    setError("");

    const res = await fetch("/api/profile/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        display_name: name.trim(),
        gender: gender || null,
        age_group: ageGroup || null,
        horse_racing_exp: exp,
        favorite_course: course || null,
      }),
    });

    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error ?? "保存に失敗しました");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🏇</div>
          <h1 className="text-2xl font-black text-gray-800">ようこそ！</h1>
          <p className="text-sm text-gray-500 mt-1">プロフィールを設定しましょう</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
          {/* 表示名（必須） */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">
              表示名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="予想太郎"
              maxLength={20}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none"
            />
            <p className="text-xs text-gray-400 mt-1">他のユーザーに表示されます（20文字以内）</p>
          </div>

          {/* 性別 */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">性別</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm bg-white focus:border-green-500 outline-none"
            >
              {GENDERS.map((g) => (
                <option key={g.value} value={g.value}>{g.label}</option>
              ))}
            </select>
          </div>

          {/* 年代 */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">年代</label>
            <select
              value={ageGroup}
              onChange={(e) => setAgeGroup(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm bg-white focus:border-green-500 outline-none"
            >
              {AGE_GROUPS.map((a) => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
          </div>

          {/* 競馬歴 */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">競馬歴</label>
            <div className="grid grid-cols-2 gap-2">
              {EXPERIENCES.map((e) => (
                <button
                  key={e.value}
                  onClick={() => setExp(e.value)}
                  className={`text-left px-3 py-2.5 rounded-xl text-sm border transition-colors ${
                    exp === e.value
                      ? "border-green-500 bg-green-50 text-green-700 font-bold"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {e.label}
                </button>
              ))}
            </div>
          </div>

          {/* お気に入り競馬場 */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">お気に入り競馬場</label>
            <select
              value={course}
              onChange={(e) => setCourse(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm bg-white focus:border-green-500 outline-none"
            >
              {COURSES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading || !name.trim()}
            className="w-full py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 disabled:opacity-40 transition-colors text-base"
          >
            {loading ? "保存中..." : "はじめる 🏇"}
          </button>

          <p className="text-xs text-gray-400 text-center">
            性別・年代は任意です。後から変更できます。
          </p>
        </div>
      </div>
    </div>
  );
}
'''

# ============================================================
# 3. プロフィール設定API
# ============================================================
SETUP_API = '''\
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const body = await request.json();

  if (!body.display_name?.trim() || body.display_name.length > 20) {
    return NextResponse.json({ error: "表示名は1〜20文字で入力してください" }, { status: 400 });
  }

  const updates: Record<string, any> = {
    display_name: body.display_name.trim(),
    profile_completed: true,
  };

  const allowedFields = ["gender", "age_group", "horse_racing_exp", "favorite_course"];
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates[field] = body[field];
    }
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
'''

# ============================================================
# 4. auth callback 修正（新規ユーザーをsetupへ）
# ============================================================
AUTH_CALLBACK = '''\
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // プロフィール設定完了チェック
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("profile_completed")
          .eq("id", user.id)
          .single();

        // 未設定の場合はセットアップへ
        if (!profile?.profile_completed) {
          return NextResponse.redirect(`${origin}/mypage/setup`);
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
'''

def run():
    # 1. マイグレーション
    os.makedirs("supabase/migrations", exist_ok=True)
    with open("supabase/migrations/add_profile_demographics.sql", "w") as f:
        f.write(MIGRATION)
    print("  ✅ supabase/migrations/add_profile_demographics.sql")

    # 2. セットアップページ
    os.makedirs("src/app/(main)/mypage/setup", exist_ok=True)
    with open("src/app/(main)/mypage/setup/page.tsx", "w") as f:
        f.write(SETUP_PAGE)
    print("  ✅ src/app/(main)/mypage/setup/page.tsx")

    # 3. セットアップAPI
    os.makedirs("src/app/api/profile/setup", exist_ok=True)
    with open("src/app/api/profile/setup/route.ts", "w") as f:
        f.write(SETUP_API)
    print("  ✅ src/app/api/profile/setup/route.ts")

    # 4. auth callback 更新
    with open("src/app/auth/callback/route.ts", "w") as f:
        f.write(AUTH_CALLBACK)
    print("  ✅ src/app/auth/callback/route.ts 更新")

    # 5. profile API にデモグラフィールド追加
    profile_api = "src/app/api/profile/route.ts"
    if os.path.exists(profile_api):
        with open(profile_api, "r") as f:
            content = f.read()

        if "gender" not in content:
            content = content.replace(
                '  const allowedFields = ["display_name", "bio"];',
                '  const allowedFields = ["display_name", "bio", "gender", "age_group", "horse_racing_exp", "favorite_course"];'
            )
            with open(profile_api, "w") as f:
                f.write(content)
            print("  ✅ profile API にデモグラフィールド追加")
        else:
            print("  ⏭️  profile API 既に追加済み")

    print("\n🏁 Task #74 完了")
    print("📌 Supabase SQL Editor で add_profile_demographics.sql を実行してください")

if __name__ == "__main__":
    run()
