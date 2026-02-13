"use client";
import BackLink from "@/components/ui/BackLink";

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
