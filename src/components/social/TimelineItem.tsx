"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { getRank } from "@/lib/constants/ranks";
import LikeButton from "./LikeButton";

type Pick = { pick_type: string; post_number: number; horse_name: string };

type Props = {
  item: {
    type: string;
    id: string;
    vote_id?: string;
    like_count?: number;
    user: { display_name: string; avatar_url: string | null; rank_id: string } | null;
    user_id: string;
    race: { name: string; grade: string | null; course_name: string; race_number?: number | null; race_date?: string } | null;
    race_id: string;
    earned_points?: number;
    is_perfect?: boolean;
    status?: string;
    body?: string;
    sentiment?: string;
    picks?: Pick[];
    timestamp: string;
    comment_id?: string;
  };
};

const SENTIMENT_LABEL: Record<string, string> = {
  very_positive: "🔥 超注目", positive: "👍 推し", negative: "🤔 微妙", very_negative: "⚠️ 危険",
};

const PICK_STYLE: Record<string, { mark: string; bg: string; text: string }> = {
  win: { mark: "◎", bg: "bg-red-100", text: "text-red-700" },
  place: { mark: "○", bg: "bg-blue-100", text: "text-blue-700" },
  back: { mark: "△", bg: "bg-yellow-100", text: "text-yellow-700" },
  danger: { mark: "⚠️", bg: "bg-gray-200", text: "text-gray-700" },
};

export default function TimelineItem({ item }: Props) {
  const rank = item.user ? getRank(item.user.rank_id) : null;
  const timeAgo = getTimeAgo(item.timestamp);
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [replySent, setReplySent] = useState(false);

  const isHit = item.status === "settled_hit";
  const gradeColor = item.race?.grade
    ? item.race.grade === "G1" ? "bg-yellow-100 text-yellow-800"
    : item.race.grade === "G2" ? "bg-red-100 text-red-700"
    : item.race.grade === "G3" ? "bg-green-100 text-green-700"
    : "bg-gray-100 text-gray-600" : "";

  const handleReply = async () => {
    if (!replyText.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/races/${item.race_id}/comments`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: replyText.trim(), parent_id: item.comment_id ?? null }),
      });
      if (res.ok) { setReplyText(""); setShowReply(false); setReplySent(true); setTimeout(() => setReplySent(false), 3000); }
    } catch {}
    setSending(false);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      {/* ヘッダー */}
      <div className="flex items-center gap-2 mb-2">
        <Link href={`/users/${item.user_id}`} className="flex items-center gap-2 group">
          {item.user?.avatar_url ? (
            <Image width={32} height={32} src={item.user.avatar_url} alt="" className="w-8 h-8 rounded-full" unoptimized />
          ) : (
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-sm">🏇</div>
          )}
          <span className="text-sm font-bold text-gray-800 group-hover:text-green-600">{item.user?.display_name ?? "匿名"}</span>
        </Link>
        {rank && <span className="text-xs text-gray-400">{rank.icon}</span>}
        <span className="text-xs text-gray-300 ml-auto">{timeAgo}</span>
      </div>

      {/* 投票した（pending） */}
      {item.type === "vote_submitted" && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-gray-500">🗳 投票しました</span>
            {item.race?.grade && (
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${gradeColor}`}>{item.race.grade}</span>
            )}
            <Link href={`/races/${item.race_id}`} className="text-sm font-bold text-gray-800 hover:text-green-600">
              {item.race?.name}
            </Link>
            {item.race?.race_date && (
              <span className="text-[11px] text-gray-400">
                {item.race.course_name}{item.race.race_number ? ` ${item.race.race_number}R` : ""}
              </span>
            )}
          </div>
          {item.picks && item.picks.length > 0 && (() => {
            const nonBackPicks = item.picks.filter(p => p.pick_type !== "back");
            const backPicks = item.picks.filter(p => p.pick_type === "back");
            return (
              <div className="flex flex-wrap gap-1.5">
                {nonBackPicks.map((pick, i) => {
                  const style = PICK_STYLE[pick.pick_type] ?? PICK_STYLE.win;
                  return (
                    <span key={i} className={`${style.bg} ${style.text} text-xs px-2 py-1 rounded-full font-medium`}>
                      {style.mark} {pick.post_number} {pick.horse_name}
                    </span>
                  );
                })}
                {backPicks.length > 0 && (
                  <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-1 rounded-full font-medium">
                    △ {backPicks.map(p => p.post_number).join(",")}
                  </span>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* 投票結果（確定後） */}
      {item.type === "vote_result" && (
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-gray-500">{isHit ? "🎯 的中！" : "📊 結果"}</span>
            {item.race?.grade && (
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${gradeColor}`}>{item.race.grade}</span>
            )}
            <Link href={`/races/${item.race_id}`} className="text-sm font-bold text-gray-800 hover:text-green-600">{item.race?.name}</Link>
            {item.race?.race_date && (
              <span className="text-[11px] text-gray-400">
                {item.race.course_name}{item.race.race_number ? ` ${item.race.race_number}R` : ""}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mb-2">
            {(item.earned_points ?? 0) > 0 && <span className="text-sm font-bold text-green-600">+{item.earned_points} P</span>}
            {item.is_perfect && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">💎 完全的中</span>}
            {!isHit && <span className="text-xs text-gray-400">ハズレ</span>}
          </div>
          {item.picks && item.picks.length > 0 && (() => {
            const nonBackPicks = item.picks.filter(p => p.pick_type !== "back");
            const backPicks = item.picks.filter(p => p.pick_type === "back");
            return (
              <div className="flex flex-wrap gap-1.5">
                {nonBackPicks.map((pick, i) => {
                  const style = PICK_STYLE[pick.pick_type] ?? PICK_STYLE.win;
                  return (
                    <span key={i} className={`${style.bg} ${style.text} text-xs px-2 py-1 rounded-full font-medium`}>
                      {style.mark} {pick.post_number} {pick.horse_name}
                    </span>
                  );
                })}
                {backPicks.length > 0 && (
                  <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-1 rounded-full font-medium">
                    △ {backPicks.map(p => p.post_number).join(",")}
                  </span>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* コメント */}
      {item.type === "comment" && (
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-gray-500">💬 コメント</span>
            {item.race?.grade && (
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${gradeColor}`}>{item.race.grade}</span>
            )}
            <Link href={`/races/${item.race_id}`} className="text-sm font-bold text-gray-800 hover:text-green-600">{item.race?.name}</Link>
            {item.race?.race_date && (
              <span className="text-[11px] text-gray-400">
                {item.race.course_name}{item.race.race_number ? ` ${item.race.race_number}R` : ""}
              </span>
            )}
            {item.sentiment && <span className="text-xs text-gray-400">{SENTIMENT_LABEL[item.sentiment]}</span>}
          </div>
          <p className="text-sm text-gray-600 line-clamp-2">{item.body}</p>
        </div>
      )}

      {/* アクションバー（コメント・投票結果共通） */}
      {(item.type === "comment" || item.type === "vote_result" || item.type === "vote_submitted") && (
        <div className="mt-2 pt-2 border-t border-gray-50 flex items-center gap-3">
          {item.type === "comment" && (
            <button onClick={() => setShowReply(!showReply)}
              className="text-xs text-gray-400 hover:text-green-600 transition-colors flex items-center gap-1">💬 返信</button>
          )}
          <Link href={`/races/${item.race_id}`}
            className="text-xs text-gray-400 hover:text-green-600 transition-colors flex items-center gap-1">📄 レースを見る</Link>
          {replySent && <span className="text-xs text-green-500 ml-auto">✅ 返信しました</span>}
        </div>
      )}

      {showReply && (
        <div className="mt-3 flex gap-2">
          <input type="text" value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="返信を入力..." maxLength={500}
            className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleReply(); } }} />
          <button onClick={handleReply} disabled={!replyText.trim() || sending}
            className="px-4 py-2 bg-green-600 text-white text-sm font-bold rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors shrink-0">
            {sending ? "..." : "送信"}</button>
        </div>
      )}
    </div>
  );
}

function getTimeAgo(dateStr: string): string {
  const now = new Date(); const d = new Date(dateStr);
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return "たった今";
  if (diff < 3600) return `${Math.floor(diff / 60)}分前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}時間前`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}日前`;
  return d.toLocaleDateString("ja-JP", { month: "short", day: "numeric" });
}
