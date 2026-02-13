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
