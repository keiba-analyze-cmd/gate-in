"use client";

import { useState } from "react";

type Props = {
  raceId: string;
  parentId?: string;
  onSubmit: (comment: any) => void;
  onCancel?: () => void;
  placeholder?: string;
};

const SENTIMENTS = [
  { value: "very_positive", label: "🔥", title: "超注目" },
  { value: "positive", label: "👍", title: "推し" },
  { value: "negative", label: "🤔", title: "微妙" },
  { value: "very_negative", label: "⚠️", title: "危険" },
];

export default function CommentForm({ raceId, parentId, onSubmit, onCancel, placeholder }: Props) {
  const [body, setBody] = useState("");
  const [sentiment, setSentiment] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!body.trim() || loading) return;
    setLoading(true);

    const res = await fetch(`/api/races/${raceId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        body: body.trim(),
        sentiment,
        parent_id: parentId ?? null,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      onSubmit(data);
      setBody("");
      setSentiment(null);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-2">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={placeholder ?? "レースの展望や注目馬について語ろう..."}
        maxLength={500}
        rows={2}
        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
      />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {SENTIMENTS.map((s) => (
            <button
              key={s.value}
              onClick={() => setSentiment(sentiment === s.value ? null : s.value)}
              title={s.title}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all ${
                sentiment === s.value
                  ? "bg-green-100 ring-2 ring-green-400 scale-110"
                  : "hover:bg-gray-100"
              }`}
            >
              {s.label}
            </button>
          ))}
          <span className="text-xs text-gray-300 ml-2">{body.length}/500</span>
        </div>
        <div className="flex items-center gap-2">
          {onCancel && (
            <button
              onClick={onCancel}
              className="text-xs text-gray-400 hover:text-gray-600 px-3 py-1.5"
            >
              キャンセル
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={!body.trim() || loading}
            className="px-4 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-40 transition-colors"
          >
            {loading ? "..." : "投稿"}
          </button>
        </div>
      </div>
    </div>
  );
}
