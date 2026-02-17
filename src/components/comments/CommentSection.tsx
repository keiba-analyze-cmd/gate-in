"use client";

import { useState, useEffect } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import Image from "next/image";
import Link from "next/link";
import { getRank } from "@/lib/constants/ranks";

type Comment = {
  id: string;
  body: string;
  sentiment: string | null;
  created_at: string;
  user_id: string;
  profiles: { display_name: string; avatar_url: string | null; avatar_emoji: string | null; rank_id: string } | null;
};

type Props = { raceId: string; currentUserId: string };

const SENTIMENTS = [
  { key: "very_positive", icon: "🔥", label: "超注目" },
  { key: "positive", icon: "👍", label: "推し" },
  { key: "negative", icon: "🤔", label: "微妙" },
  { key: "very_negative", icon: "⚠️", label: "危険" },
];

export default function CommentSection({ raceId, currentUserId }: Props) {
  const { isDark } = useTheme();
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState("");
  const [sentiment, setSentiment] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const cardBg = isDark ? "bg-slate-900 border-slate-700" : "bg-white border-gray-100";
  const textPrimary = isDark ? "text-slate-100" : "text-gray-900";
  const textSecondary = isDark ? "text-slate-400" : "text-gray-600";
  const textMuted = isDark ? "text-slate-500" : "text-gray-400";
  const inputBg = isDark ? "bg-slate-800 border-slate-600 text-slate-100 placeholder-slate-500" : "bg-white border-gray-200 text-gray-900 placeholder-gray-400";
  const btnPrimary = isDark ? "bg-amber-500 text-slate-900 hover:bg-amber-400" : "bg-green-600 text-white hover:bg-green-700";
  const borderColor = isDark ? "border-slate-700" : "border-gray-100";

  useEffect(() => {
    fetch(`/api/races/${raceId}/comments`).then(r => r.json()).then(d => setComments(d.comments ?? []));
  }, [raceId]);

  const handleSubmit = async () => {
    if (!body.trim() || loading) return;
    setLoading(true);
    const res = await fetch(`/api/races/${raceId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: body.trim(), sentiment }),
    });
    if (res.ok) {
      const data = await res.json();
      setComments([data.comment, ...comments]);
      setBody("");
      setSentiment(null);
    }
    setLoading(false);
  };

  return (
    <div className={`rounded-2xl border overflow-hidden ${cardBg}`}>
      <div className="px-4 py-3 flex items-center justify-between">
        <h2 className={`font-bold ${textPrimary}`}>💬 掲示板</h2>
        <span className={`text-xs ${textMuted}`}>{comments.length}件</span>
      </div>

      <div className={`p-4 border-b ${borderColor}`}>
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder="レースの展望や注目馬について語ろう..."
          maxLength={500}
          rows={3}
          className={`w-full px-4 py-3 rounded-xl border resize-none focus:outline-none focus:ring-2 ${inputBg} ${isDark ? "focus:ring-amber-500" : "focus:ring-green-500"}`}
        />
        <div className="flex items-center justify-between mt-2">
          <div className="flex gap-1">
            {SENTIMENTS.map(s => (
              <button key={s.key} onClick={() => setSentiment(sentiment === s.key ? null : s.key)}
                className={`px-2 py-1 rounded-lg text-sm transition-colors ${sentiment === s.key ? (isDark ? "bg-amber-500/20 text-amber-400" : "bg-green-100 text-green-700") : ""}`}
                title={s.label}>
                {s.icon}
              </button>
            ))}
            <span className={`text-xs ml-2 ${textMuted}`}>{body.length}/500</span>
          </div>
          <button onClick={handleSubmit} disabled={!body.trim() || loading}
            className={`px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-40 ${btnPrimary}`}>
            投稿
          </button>
        </div>
      </div>

      <div className={`divide-y ${borderColor}`}>
        {comments.length === 0 ? (
          <div className={`p-8 text-center ${textMuted}`}>まだコメントはありません。最初のコメントを投稿しよう！</div>
        ) : (
          comments.map(c => {
            const rank = c.profiles ? getRank(c.profiles.rank_id) : null;
            return (
              <div key={c.id} className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Link href={`/users/${c.user_id}`} className="flex items-center gap-2 group">
                    {c.profiles?.avatar_url ? (
                      <Image src={c.profiles.avatar_url} alt="" width={28} height={28} className="w-7 h-7 rounded-full" unoptimized />
                    ) : (
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${isDark ? "bg-slate-700" : "bg-gray-100"}`}>🏇</div>
                    )}
                    <span className={`text-sm font-bold ${textPrimary}`}>{c.profiles?.display_name ?? "匿名"}</span>
                  </Link>
                  {rank && <span className={`text-xs ${textMuted}`}>{rank.icon}</span>}
                  {c.sentiment && <span className="text-sm">{SENTIMENTS.find(s => s.key === c.sentiment)?.icon}</span>}
                  <span className={`text-xs ml-auto ${textMuted}`}>{new Date(c.created_at).toLocaleString("ja-JP", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                <p className={`text-sm ${textSecondary}`}>{c.body}</p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
