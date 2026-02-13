"use client";

import { useState } from "react";

type Props = {
  commentId: string;
  onClose: () => void;
  onReported: () => void;
};

const REASONS = [
  { value: "spam", label: "🚫 スパム・宣伝" },
  { value: "harassment", label: "😠 誹謗中傷・嫌がらせ" },
  { value: "inappropriate", label: "⚠️ 不適切な内容" },
  { value: "misinformation", label: "❌ 誤情報" },
  { value: "other", label: "📝 その他" },
];

export default function ReportModal({ commentId, onClose, onReported }: Props) {
  const [reason, setReason] = useState("");
  const [detail, setDetail] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!reason) { setError("通報理由を選択してください"); return; }
    setSending(true);
    setError("");
    try {
      const res = await fetch(`/api/comments/${commentId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, detail: detail.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "通報に失敗しました"); setSending(false); return; }
      onReported();
    } catch {
      setError("通信エラーが発生しました");
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-black text-gray-900 mb-1">🚨 コメントを通報</h3>
        <p className="text-xs text-gray-500 mb-4">不適切なコメントを運営に報告します</p>
        <div className="space-y-2 mb-4">
          {REASONS.map((r) => (
            <button key={r.value} onClick={() => setReason(r.value)}
              className={`w-full text-left px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                reason === r.value ? "border-red-300 bg-red-50 text-red-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}>{r.label}</button>
          ))}
        </div>
        <textarea value={detail} onChange={(e) => setDetail(e.target.value)}
          placeholder="詳細（任意・500文字以内）" maxLength={500} rows={3}
          className="w-full text-sm border border-gray-200 rounded-xl px-4 py-2.5 mb-4 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent resize-none" />
        {error && <p className="text-xs text-red-600 mb-3">{error}</p>}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm font-bold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">キャンセル</button>
          <button onClick={handleSubmit} disabled={!reason || sending}
            className="flex-1 py-2.5 text-sm font-bold text-white bg-red-600 rounded-xl hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            {sending ? "送信中..." : "通報する"}</button>
        </div>
      </div>
    </div>
  );
}
