#!/usr/bin/env python3
"""
Task #73: 管理画面 お問い合わせ対応GUI
- supabase/migrations/add_contact_inquiries.sql: テーブル作成
- src/app/(main)/contact/page.tsx: フォーム送信をDB保存に変更
- src/app/api/contact/route.ts: 問い合わせ送信API
- src/app/api/admin/inquiries/route.ts: 管理者用一覧・更新API
- src/components/admin/AdminInquiries.tsx: 管理画面コンポーネント
- AdminTabs.tsx にタブ追加
- admin/page.tsx にタブ表示追加
"""

import os

# ============================================================
# 1. マイグレーション
# ============================================================
MIGRATION = '''\
-- お問い合わせテーブル
CREATE TABLE IF NOT EXISTS contact_inquiries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  admin_note TEXT,
  replied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_contact_inquiries_status ON contact_inquiries(status);
CREATE INDEX IF NOT EXISTS idx_contact_inquiries_created ON contact_inquiries(created_at DESC);

-- RLS
ALTER TABLE contact_inquiries ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分の問い合わせのみ作成可能
CREATE POLICY "Users can insert own inquiries" ON contact_inquiries
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- 管理者は全件閲覧・更新可能
CREATE POLICY "Admins can view all inquiries" ON contact_inquiries
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admins can update inquiries" ON contact_inquiries
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );
'''

# ============================================================
# 2. 問い合わせ送信API
# ============================================================
CONTACT_API = '''\
import { createClient } from "@/lib/supabase/server";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // レート制限（未ログインはIP、ログイン済みはuser_id）
  const key = user ? `contact:${user.id}` : `contact:anon`;
  const rl = rateLimit(key, { limit: 5, windowMs: 3600_000 }); // 1時間5件
  if (!rl.ok) return rateLimitResponse();

  const body = await request.json();

  // バリデーション
  if (!body.name?.trim() || body.name.length > 50) {
    return NextResponse.json({ error: "お名前は50文字以内で入力してください" }, { status: 400 });
  }
  if (!body.email?.trim() || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(body.email)) {
    return NextResponse.json({ error: "有効なメールアドレスを入力してください" }, { status: 400 });
  }
  if (!body.subject?.trim() || body.subject.length > 100) {
    return NextResponse.json({ error: "件名は100文字以内で入力してください" }, { status: 400 });
  }
  if (!body.body?.trim() || body.body.length > 2000) {
    return NextResponse.json({ error: "内容は2000文字以内で入力してください" }, { status: 400 });
  }

  const { error } = await supabase.from("contact_inquiries").insert({
    user_id: user?.id ?? null,
    name: body.name.trim(),
    email: body.email.trim(),
    category: body.category ?? "general",
    subject: body.subject.trim(),
    body: body.body.trim(),
  });

  if (error) {
    return NextResponse.json({ error: "送信に失敗しました" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
'''

# ============================================================
# 3. 管理者用問い合わせAPI
# ============================================================
ADMIN_INQUIRIES_API = '''\
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/admin";
import { NextResponse } from "next/server";

async function checkAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  return profile?.is_admin ? user : null;
}

export async function GET(request: Request) {
  const admin = await checkAdmin();
  if (!admin) return NextResponse.json({ error: "権限がありません" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? "all";

  const supabaseAdmin = createAdminClient();
  let query = supabaseAdmin
    .from("contact_inquiries")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ inquiries: data ?? [] });
}

export async function PATCH(request: Request) {
  const admin = await checkAdmin();
  if (!admin) return NextResponse.json({ error: "権限がありません" }, { status: 403 });

  const body = await request.json();
  if (!body.id) return NextResponse.json({ error: "IDが必要です" }, { status: 400 });

  const supabaseAdmin = createAdminClient();
  const updates: Record<string, any> = { updated_at: new Date().toISOString() };

  if (body.status) updates.status = body.status;
  if (body.admin_note !== undefined) updates.admin_note = body.admin_note;
  if (body.status === "replied") updates.replied_at = new Date().toISOString();

  const { error } = await supabaseAdmin
    .from("contact_inquiries")
    .update(updates)
    .eq("id", body.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
'''

# ============================================================
# 4. お問い合わせページ（フォーム版に変更）
# ============================================================
CONTACT_PAGE = '''\
"use client";

import { useState } from "react";
import Link from "next/link";

const CATEGORIES = [
  { value: "general", label: "一般的なお問い合わせ" },
  { value: "bug", label: "不具合の報告" },
  { value: "feature", label: "機能のリクエスト" },
  { value: "account", label: "アカウントについて" },
  { value: "other", label: "その他" },
];

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", category: "general", subject: "", body: "" });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setLoading(true);
    setError("");

    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      setSent(true);
    } else {
      const data = await res.json();
      setError(data.error ?? "送信に失敗しました");
    }
    setLoading(false);
  };

  if (sent) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center space-y-4">
          <div className="text-5xl">✉️</div>
          <h1 className="text-xl font-bold text-gray-800">お問い合わせを受け付けました</h1>
          <p className="text-sm text-gray-500">
            内容を確認の上、ご入力いただいたメールアドレスに返信いたします。<br />
            通常2〜3営業日以内に回答いたします。
          </p>
          <Link href="/" className="inline-block text-sm text-green-600 hover:underline font-medium mt-4">
            ← トップページに戻る
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-sm text-gray-400">
        <Link href="/" className="hover:text-green-600">TOP</Link>
        <span className="mx-2">›</span>
        <span className="text-gray-600">お問い合わせ</span>
      </div>

      <h1 className="text-xl font-bold text-gray-800">📩 お問い合わせ</h1>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">お名前 <span className="text-red-500">*</span></label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="山田 太郎"
            maxLength={50}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">メールアドレス <span className="text-red-500">*</span></label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="example@email.com"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">カテゴリ</label>
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none bg-white"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">件名 <span className="text-red-500">*</span></label>
          <input
            type="text"
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
            placeholder="お問い合わせの件名"
            maxLength={100}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">内容 <span className="text-red-500">*</span></label>
          <textarea
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            placeholder="お問い合わせ内容をご記入ください"
            maxLength={2000}
            rows={6}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none resize-none"
          />
          <p className="text-xs text-gray-400 mt-1 text-right">{form.body.length}/2000</p>
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading || !form.name || !form.email || !form.subject || !form.body}
          className="w-full py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 disabled:opacity-40 transition-colors"
        >
          {loading ? "送信中..." : "送信する"}
        </button>
      </div>
    </div>
  );
}
'''

# ============================================================
# 5. 管理画面コンポーネント
# ============================================================
ADMIN_INQUIRIES = '''\
"use client";

import { useState, useEffect } from "react";

type Inquiry = {
  id: string;
  name: string;
  email: string;
  category: string;
  subject: string;
  body: string;
  status: string;
  admin_note: string | null;
  user_id: string | null;
  created_at: string;
  replied_at: string | null;
};

const STATUS_OPTIONS = [
  { value: "all", label: "すべて" },
  { value: "open", label: "未対応" },
  { value: "in_progress", label: "対応中" },
  { value: "replied", label: "返信済" },
  { value: "closed", label: "クローズ" },
];

const CATEGORY_LABEL: Record<string, string> = {
  general: "一般",
  bug: "不具合",
  feature: "要望",
  account: "アカウント",
  other: "その他",
};

const STATUS_STYLE: Record<string, string> = {
  open: "bg-red-100 text-red-700",
  in_progress: "bg-yellow-100 text-yellow-700",
  replied: "bg-blue-100 text-blue-700",
  closed: "bg-gray-100 text-gray-500",
};

export default function AdminInquiries() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<Inquiry | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/inquiries?status=${filter}`);
    if (res.ok) {
      const data = await res.json();
      setInquiries(data.inquiries);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [filter]);

  const updateStatus = async (id: string, status: string, adminNote?: string) => {
    setSaving(true);
    await fetch("/api/admin/inquiries", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status, admin_note: adminNote }),
    });
    await fetchData();
    if (selected?.id === id) {
      setSelected(null);
    }
    setSaving(false);
  };

  const openDetail = (inq: Inquiry) => {
    setSelected(inq);
    setNote(inq.admin_note ?? "");
  };

  return (
    <div className="space-y-4">
      {/* フィルター */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFilter(opt.value)}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
              filter === opt.value
                ? "bg-green-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-400 text-sm">読み込み中...</div>
      ) : inquiries.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <div className="text-4xl mb-2">📭</div>
          <p className="text-sm">お問い合わせはありません</p>
        </div>
      ) : (
        <div className="space-y-2">
          {inquiries.map((inq) => (
            <div
              key={inq.id}
              onClick={() => openDetail(inq)}
              className="bg-gray-50 rounded-xl p-4 cursor-pointer hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_STYLE[inq.status] ?? "bg-gray-100"}`}>
                    {STATUS_OPTIONS.find((o) => o.value === inq.status)?.label ?? inq.status}
                  </span>
                  <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">
                    {CATEGORY_LABEL[inq.category] ?? inq.category}
                  </span>
                  <span className="text-sm font-bold text-gray-800">{inq.subject}</span>
                </div>
                <span className="text-[10px] text-gray-400">
                  {new Date(inq.created_at).toLocaleDateString("ja-JP", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <div className="text-xs text-gray-500">
                {inq.name} ({inq.email})
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 詳細モーダル */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-800">📩 お問い合わせ詳細</h3>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <div className="space-y-3">
              <div className="flex gap-2 text-xs">
                <span className={`font-bold px-2 py-0.5 rounded-full ${STATUS_STYLE[selected.status]}`}>
                  {STATUS_OPTIONS.find((o) => o.value === selected.status)?.label}
                </span>
                <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">
                  {CATEGORY_LABEL[selected.category]}
                </span>
              </div>

              <div>
                <span className="text-xs text-gray-400">差出人</span>
                <p className="text-sm font-bold">{selected.name} &lt;{selected.email}&gt;</p>
              </div>

              <div>
                <span className="text-xs text-gray-400">件名</span>
                <p className="text-sm font-bold">{selected.subject}</p>
              </div>

              <div>
                <span className="text-xs text-gray-400">内容</span>
                <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg p-3">{selected.body}</p>
              </div>

              <div>
                <span className="text-xs text-gray-400">受信日時</span>
                <p className="text-sm">{new Date(selected.created_at).toLocaleString("ja-JP")}</p>
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1">管理者メモ</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  placeholder="対応メモを記入..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-green-500 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => updateStatus(selected.id, "in_progress", note)}
                disabled={saving}
                className="px-4 py-2 text-xs font-bold bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 disabled:opacity-40"
              >
                対応中にする
              </button>
              <button
                onClick={() => updateStatus(selected.id, "replied", note)}
                disabled={saving}
                className="px-4 py-2 text-xs font-bold bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 disabled:opacity-40"
              >
                返信済にする
              </button>
              <button
                onClick={() => updateStatus(selected.id, "closed", note)}
                disabled={saving}
                className="px-4 py-2 text-xs font-bold bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 disabled:opacity-40"
              >
                クローズ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
'''

def run():
    # 1. マイグレーション
    os.makedirs("supabase/migrations", exist_ok=True)
    with open("supabase/migrations/add_contact_inquiries.sql", "w") as f:
        f.write(MIGRATION)
    print("  ✅ supabase/migrations/add_contact_inquiries.sql")

    # 2. 問い合わせ送信API
    os.makedirs("src/app/api/contact", exist_ok=True)
    with open("src/app/api/contact/route.ts", "w") as f:
        f.write(CONTACT_API)
    print("  ✅ src/app/api/contact/route.ts")

    # 3. 管理者用API
    os.makedirs("src/app/api/admin/inquiries", exist_ok=True)
    with open("src/app/api/admin/inquiries/route.ts", "w") as f:
        f.write(ADMIN_INQUIRIES_API)
    print("  ✅ src/app/api/admin/inquiries/route.ts")

    # 4. お問い合わせページ（フォーム版に上書き）
    with open("src/app/(main)/contact/page.tsx", "w") as f:
        f.write(CONTACT_PAGE)
    print("  ✅ src/app/(main)/contact/page.tsx 更新（フォーム版）")

    # 5. 管理画面コンポーネント
    with open("src/components/admin/AdminInquiries.tsx", "w") as f:
        f.write(ADMIN_INQUIRIES)
    print("  ✅ src/components/admin/AdminInquiries.tsx")

    # 6. AdminTabs にタブ追加
    tabs_path = "src/components/admin/AdminTabs.tsx"
    with open(tabs_path, "r") as f:
        content = f.read()

    if '"inquiries"' not in content:
        old = '  { key: "list", label: "📋 レース一覧", description: "登録済みレース" },'
        new = old + '\n  { key: "inquiries", label: "📩 お問い合わせ", description: "問い合わせ管理" },'
        content = content.replace(old, new)
        with open(tabs_path, "w") as f:
            f.write(content)
        print("  ✅ AdminTabs にお問い合わせタブ追加")
    else:
        print("  ⏭️  AdminTabs 既に追加済み")

    # 7. admin/page.tsx にインポート+タブ表示追加
    admin_path = "src/app/(main)/admin/page.tsx"
    with open(admin_path, "r") as f:
        content = f.read()

    if "AdminInquiries" not in content:
        # import追加
        content = content.replace(
            'import AdminScrapeForm from "@/components/admin/AdminScrapeForm";',
            'import AdminScrapeForm from "@/components/admin/AdminScrapeForm";\nimport AdminInquiries from "@/components/admin/AdminInquiries";'
        )
        # タブ表示追加（listタブの後に）
        old = '''        {/* 📋 レース一覧タブ */}
        {currentTab === "list" && ('''
        new = '''        {/* 📩 お問い合わせタブ */}
        {currentTab === "inquiries" && <AdminInquiries />}

        {/* 📋 レース一覧タブ */}
        {currentTab === "list" && ('''
        content = content.replace(old, new)

        with open(admin_path, "w") as f:
            f.write(content)
        print("  ✅ admin/page.tsx にお問い合わせタブ追加")
    else:
        print("  ⏭️  admin/page.tsx 既に追加済み")

    print("\n🏁 Task #73 完了")
    print("📌 Supabase SQL Editor で add_contact_inquiries.sql を実行してください")

if __name__ == "__main__":
    run()
