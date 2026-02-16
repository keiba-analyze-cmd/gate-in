"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { getRank } from "@/lib/constants/ranks";
import { useTheme } from "@/contexts/ThemeContext";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import LikeButton from "@/components/social/LikeButton";

type Pick = { pick_type: string; post_number: number; horse_name: string };

type Props = {
  item: {
    type: string;
    id: string;
    vote_id?: string;
    like_count?: number;
    is_liked?: boolean;
    user: { display_name: string; avatar_url: string | null; rank_id: string; is_verified?: boolean } | null;
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

export default function TimelineItem({ item }: Props) {
  const { isDark } = useTheme();
  const rank = item.user ? getRank(item.user.rank_id) : null;
  const timeAgo = getTimeAgo(item.timestamp);
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [replySent, setReplySent] = useState(false);

  const isHit = item.status === "settled_hit";

  // ダークモード対応スタイル
  const cardBg = isDark ? "bg-slate-900 border-slate-700" : "bg-white border-gray-100";
  const textPrimary = isDark ? "text-slate-100" : "text-gray-800";
  const textSecondary = isDark ? "text-slate-400" : "text-gray-500";
  const textMuted = isDark ? "text-slate-500" : "text-gray-300";
  const hoverColor = isDark ? "hover:text-amber-400" : "hover:text-green-600";
  const avatarBg = isDark ? "bg-slate-700" : "bg-green-100";
  const borderColor = isDark ? "border-slate-700" : "border-gray-50";
  const inputBg = isDark ? "bg-slate-800 border-slate-600 text-slate-100" : "border-gray-200";
  const btnBg = isDark ? "bg-amber-500 hover:bg-amber-600" : "bg-green-600 hover:bg-green-700";

  const gradeColor = item.race?.grade
    ? item.race.grade === "G1" ? (isDark ? "bg-yellow-500/20 text-yellow-400" : "bg-yellow-100 text-yellow-800")
    : item.race.grade === "G2" ? (isDark ? "bg-red-500/20 text-red-400" : "bg-red-100 text-red-700")
    : item.race.grade === "G3" ? (isDark ? "bg-green-500/20 text-green-400" : "bg-green-100 text-green-700")
    : (isDark ? "bg-slate-700 text-slate-300" : "bg-gray-100 text-gray-600") : "";

  const PICK_STYLE: Record<string, { mark: string; bg: string; text: string }> = {
    win: { mark: "◎", bg: isDark ? "bg-red-500/20" : "bg-red-100", text: isDark ? "text-red-400" : "text-red-700" },
    place: { mark: "○", bg: isDark ? "bg-blue-500/20" : "bg-blue-100", text: isDark ? "text-blue-400" : "text-blue-700" },
    back: { mark: "△", bg: isDark ? "bg-yellow-500/20" : "bg-yellow-100", text: isDark ? "text-yellow-400" : "text-yellow-700" },
    danger: { mark: "⚠️", bg: isDark ? "bg-slate-700" : "bg-gray-200", text: isDark ? "text-slate-300" : "text-gray-700" },
  };

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

  const renderPicks = () => {
    if (!item.picks || item.picks.length === 0) return null;
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
          <span className={`${PICK_STYLE.back.bg} ${PICK_STYLE.back.text} text-xs px-2 py-1 rounded-full font-medium`}>
            △ {backPicks.map(p => p.post_number).join(",")}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className={`rounded-xl border p-4 ${cardBg}`}>
      {/* ヘッダー */}
      <div className="flex items-center gap-2 mb-2">
        <Link href={`/users/${item.user_id}`} className="flex items-center gap-2 group">
          {item.user?.avatar_url ? (
            <Image width={32} height={32} src={item.user.avatar_url} alt="" className="w-8 h-8 rounded-full" unoptimized />
          ) : (
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${avatarBg}`}>🏇</div>
          )}
          <span className={`text-sm font-bold ${textPrimary} group-${hoverColor}`}>{item.user?.display_name ?? "匿名"}</span>
          {item.user?.is_verified && <VerifiedBadge size="sm" />}
        </Link>
        {rank && <span className={`text-xs ${textMuted}`}>{rank.icon}</span>}
        <span className={`text-xs ml-auto ${textMuted}`}>{timeAgo}</span>
      </div>

      {/* 投票した（pending） */}
      {item.type === "vote_submitted" && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-xs ${textSecondary}`}>🗳 投票しました</span>
            {item.race?.grade && (
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${gradeColor}`}>{item.race.grade}</span>
            )}
            <Link href={`/races/${item.race_id}`} className={`text-sm font-bold ${textPrimary} ${hoverColor}`}>
              {item.race?.name}
            </Link>
            {item.race?.race_date && (
              <span className={`text-[11px] ${textMuted}`}>
                {item.race.course_name}{item.race.race_number ? ` ${item.race.race_number}R` : ""}
              </span>
            )}
          </div>
          {renderPicks()}
        </div>
      )}

      {/* 投票結果（確定後） */}
      {item.type === "vote_result" && (
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs ${textSecondary}`}>{isHit ? "🎯 的中！" : "📊 結果"}</span>
            {item.race?.grade && (
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${gradeColor}`}>{item.race.grade}</span>
            )}
            <Link href={`/races/${item.race_id}`} className={`text-sm font-bold ${textPrimary} ${hoverColor}`}>{item.race?.name}</Link>
            {item.race?.race_date && (
              <span className={`text-[11px] ${textMuted}`}>
                {item.race.course_name}{item.race.race_number ? ` ${item.race.race_number}R` : ""}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mb-2">
            {(item.earned_points ?? 0) > 0 && <span className={`text-sm font-bold ${isDark ? "text-green-400" : "text-green-600"}`}>+{item.earned_points} P</span>}
            {item.is_perfect && <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? "bg-yellow-500/20 text-yellow-400" : "bg-yellow-100 text-yellow-700"}`}>💎 完全的中</span>}
            {!isHit && <span className={`text-xs ${textMuted}`}>ハズレ</span>}
          </div>
          {renderPicks()}
        </div>
      )}

      {/* コメント */}
      {item.type === "comment" && (
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs ${textSecondary}`}>💬 コメント</span>
            {item.race?.grade && (
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${gradeColor}`}>{item.race.grade}</span>
            )}
            <Link href={`/races/${item.race_id}`} className={`text-sm font-bold ${textPrimary} ${hoverColor}`}>{item.race?.name}</Link>
            {item.race?.race_date && (
              <span className={`text-[11px] ${textMuted}`}>
                {item.race.course_name}{item.race.race_number ? ` ${item.race.race_number}R` : ""}
              </span>
            )}
            {item.sentiment && <span className={`text-xs ${textMuted}`}>{SENTIMENT_LABEL[item.sentiment]}</span>}
          </div>
          <p className={`text-sm line-clamp-2 ${isDark ? "text-slate-300" : "text-gray-600"}`}>{item.body}</p>
        </div>
      )}

      {/* アクションバー */}
      {(item.type === "comment" || item.type === "vote_result" || item.type === "vote_submitted") && (
        <div className={`mt-2 pt-2 border-t flex items-center gap-3 ${borderColor}`}>
          {item.type === "comment" && (
            <button onClick={() => setShowReply(!showReply)}
              className={`text-xs transition-colors flex items-center gap-1 ${textMuted} ${hoverColor}`}>💬 返信</button>
          )}
          <Link href={`/races/${item.race_id}`}
            className={`text-xs transition-colors flex items-center gap-1 ${textMuted} ${hoverColor}`}>📄 レースを見る</Link>
          {item.vote_id && (
            <div className="ml-auto">
              <LikeButton voteId={item.vote_id} initialCount={item.like_count ?? 0} initialLiked={item.is_liked ?? false} />
            </div>
          )}
          {replySent && <span className={`text-xs ml-auto ${isDark ? "text-green-400" : "text-green-500"}`}>✅ 返信しました</span>}
        </div>
      )}

      {showReply && (
        <div className="mt-3 flex gap-2">
          <input type="text" value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="返信を入力..." maxLength={500}
            className={`flex-1 text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:border-transparent ${inputBg} ${isDark ? "focus:ring-amber-500" : "focus:ring-green-500"}`}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleReply(); } }} />
          <button onClick={handleReply} disabled={!replyText.trim() || sending}
            className={`px-4 py-2 text-white text-sm font-bold rounded-lg disabled:opacity-50 transition-colors shrink-0 ${btnBg}`}>
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
