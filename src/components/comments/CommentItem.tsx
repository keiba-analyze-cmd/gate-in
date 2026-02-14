"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { getRank } from "@/lib/constants/ranks";
import CommentForm from "./CommentForm";
import ReportModal from "./ReportModal";

type Reaction = { emoji_type: string; user_id: string };
type Comment = {
  id: string; user_id: string; body: string; sentiment: string | null;
  created_at: string; edited_at?: string | null; reply_count: number;
  profiles: { display_name: string; avatar_url: string | null; rank_id: string } | null;
  comment_reactions: Reaction[];
};
type Reply = {
  id: string; user_id: string; body: string; created_at: string; edited_at?: string | null;
  profiles: { display_name: string; avatar_url: string | null; rank_id: string } | null;
};
type Props = { comment: Comment; currentUserId: string; raceId: string };

const EMOJI_MAP: Record<string, { icon: string; label: string }> = {
  target: { icon: "🎯", label: "的中" }, brain: { icon: "🧠", label: "なるほど" }, thumbsup: { icon: "👍", label: "いいね" },
};
const SENTIMENT_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  very_positive: { bg: "bg-red-100", text: "text-red-700", label: "🔥 超注目" },
  positive: { bg: "bg-blue-100", text: "text-blue-700", label: "👍 推し" },
  negative: { bg: "bg-yellow-100", text: "text-yellow-700", label: "🤔 微妙" },
  very_negative: { bg: "bg-gray-100", text: "text-gray-700", label: "⚠️ 危険" },
};

export default function CommentItem({ comment, currentUserId, raceId }: Props) {
  const [reactions, setReactions] = useState<Reaction[]>(comment.comment_reactions ?? []);
  const [showReply, setShowReply] = useState(false);
  const [replyCount, setReplyCount] = useState(comment.reply_count);
  const [showReport, setShowReport] = useState(false);
  const [reported, setReported] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editBody, setEditBody] = useState(comment.body);
  const [isDeleted, setIsDeleted] = useState(false);
  const [currentBody, setCurrentBody] = useState(comment.body);
  const [editedAt, setEditedAt] = useState<string | null>(comment.edited_at ?? null);
  const [showMenu, setShowMenu] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loadingReplies, setLoadingReplies] = useState(false);

  const rank = comment.profiles ? getRank(comment.profiles.rank_id) : null;
  const timeAgo = getTimeAgo(comment.created_at);
  const sentimentBadge = comment.sentiment ? SENTIMENT_BADGE[comment.sentiment] : null;

  if (isDeleted) {
    return (<div className="px-5 py-4 opacity-50"><p className="text-sm text-gray-400 italic">（このコメントは削除されました）</p></div>);
  }

  const handleEdit = async () => {
    if (!editBody.trim() || editSaving) return;
    setEditSaving(true);
    try {
      const res = await fetch(`/api/comments/${comment.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: editBody.trim() }) });
      if (res.ok) { setCurrentBody(editBody.trim()); setEditedAt(new Date().toISOString()); setIsEditing(false); }
    } catch {}
    setEditSaving(false);
  };

  const handleDelete = async () => {
    if (!confirm("このコメントを削除しますか？")) return;
    try { const res = await fetch(`/api/comments/${comment.id}`, { method: "DELETE" }); if (res.ok) setIsDeleted(true); } catch {}
  };

  const toggleReaction = async (emojiType: string) => {
    const res = await fetch(`/api/comments/${comment.id}/reactions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ emoji_type: emojiType }) });
    if (res.ok) {
      const { action } = await res.json();
      if (action === "added") setReactions([...reactions, { emoji_type: emojiType, user_id: currentUserId }]);
      else setReactions(reactions.filter((r) => !(r.emoji_type === emojiType && r.user_id === currentUserId)));
    }
  };

  const handleReplySubmitted = () => {
    setShowReply(false);
    setReplyCount((c) => c + 1);
    // リプライ一覧が表示中なら再取得
    if (showReplies) fetchReplies();
  };

  const fetchReplies = async () => {
    if (showReplies && !loadingReplies) { setShowReplies(false); return; }
    setLoadingReplies(true);
    try {
      const res = await fetch(`/api/races/${raceId}/comments?parent_id=${comment.id}&order=asc`);
      if (res.ok) {
        const data = await res.json();
        setReplies(data.comments ?? []);
        setShowReplies(true);
      }
    } catch {}
    setLoadingReplies(false);
  };

  return (
    <div className="px-5 py-4">
      {/* ヘッダー */}
      <div className="flex items-center gap-2 mb-2">
        <Link href={`/users/${comment.user_id}`} className="flex items-center gap-2 group">
          {comment.profiles?.avatar_url ? (<Image width={32} height={32} src={comment.profiles.avatar_url} alt="" className="w-8 h-8 rounded-full" unoptimized />) : (<div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-sm">🏇</div>)}
          <div>
            <span className="text-sm font-bold text-gray-800 group-hover:text-green-600">{comment.profiles?.display_name ?? "匿名"}</span>
            {rank && <span className="text-xs text-gray-400 ml-1.5">{rank.icon} {rank.name}</span>}
          </div>
        </Link>
        <span className="text-xs text-gray-300 ml-auto">{timeAgo}</span>
        {comment.user_id === currentUserId && (
          <div className="relative">
            <button onClick={() => setShowMenu(!showMenu)} className="text-gray-300 hover:text-gray-500 text-xs px-1" title="メニュー">⋯</button>
            {showMenu && (
              <div className="absolute right-0 top-6 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-10 min-w-[120px]">
                <button onClick={() => { setIsEditing(true); setShowMenu(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">✏️ 編集</button>
                <button onClick={() => { handleDelete(); setShowMenu(false); }} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">🗑 削除</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* センチメント */}
      {sentimentBadge && (<span className={`inline-block text-xs px-2 py-0.5 rounded-full mb-2 ${sentimentBadge.bg} ${sentimentBadge.text}`}>{sentimentBadge.label}</span>)}

      {/* 本文 */}
      {isEditing ? (
        <div className="mb-3 space-y-2">
          <textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} maxLength={500} rows={3} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none" />
          <div className="flex gap-2">
            <button onClick={handleEdit} disabled={!editBody.trim() || editSaving} className="px-3 py-1.5 text-xs font-bold bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">{editSaving ? "保存中..." : "保存"}</button>
            <button onClick={() => { setIsEditing(false); setEditBody(currentBody); }} className="px-3 py-1.5 text-xs font-bold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">キャンセル</button>
          </div>
        </div>
      ) : (
        <div className="mb-3">
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{currentBody}</p>
          {editedAt && <span className="text-[10px] text-gray-300 mt-1 inline-block">（編集済み）</span>}
        </div>
      )}

      {/* リアクション + 返信ボタン */}
      <div className="flex items-center gap-2 flex-wrap">
        {Object.entries(EMOJI_MAP).map(([type, { icon }]) => {
          const count = reactions.filter((r) => r.emoji_type === type).length;
          const isReacted = reactions.some((r) => r.emoji_type === type && r.user_id === currentUserId);
          return (<button key={type} onClick={() => toggleReaction(type)} className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs transition-all ${isReacted ? "bg-green-100 text-green-700 ring-1 ring-green-300" : "bg-gray-50 text-gray-500 hover:bg-gray-100"}`}><span>{icon}</span>{count > 0 && <span className="font-medium">{count}</span>}</button>);
        })}
        <button onClick={() => setShowReply(!showReply)} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-gray-50 text-gray-500 hover:bg-gray-100 ml-auto">💬 返信</button>
        {replyCount > 0 && (
          <button onClick={fetchReplies} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium">
            {loadingReplies ? "読込中..." : showReplies ? "▲ 閉じる" : `▼ ${replyCount}件の返信`}
          </button>
        )}
        {comment.user_id !== currentUserId && !reported && (<button onClick={() => setShowReport(true)} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-gray-50 text-gray-500 hover:bg-red-50 hover:text-red-600" title="通報">🚨</button>)}
        {reported && <span className="text-xs text-red-400 px-2">通報済み</span>}
      </div>

      {/* リプライ一覧 */}
      {showReplies && replies.length > 0 && (
        <div className="mt-3 ml-6 pl-4 border-l-2 border-green-100 space-y-3">
          {replies.map((reply) => {
            const rRank = reply.profiles ? getRank(reply.profiles.rank_id) : null;
            return (
              <div key={reply.id} className="py-2">
                <div className="flex items-center gap-2 mb-1">
                  <Link href={`/users/${reply.user_id}`} className="flex items-center gap-1.5 group">
                    {reply.profiles?.avatar_url
                      ? <Image width={24} height={24} src={reply.profiles.avatar_url} alt="" className="w-6 h-6 rounded-full" unoptimized />
                      : <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-xs">🏇</div>}
                    <span className="text-xs font-bold text-gray-700 group-hover:text-green-600">{reply.profiles?.display_name ?? "匿名"}</span>
                    {rRank && <span className="text-[10px] text-gray-400">{rRank.icon}</span>}
                  </Link>
                  <span className="text-[10px] text-gray-300 ml-auto">{getTimeAgo(reply.created_at)}</span>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{reply.body}</p>
                {reply.edited_at && <span className="text-[10px] text-gray-300">（編集済み）</span>}
              </div>
            );
          })}
        </div>
      )}

      {/* 返信フォーム */}
      {showReply && (<div className="mt-3 ml-6 pl-4 border-l-2 border-gray-100"><CommentForm raceId={raceId} parentId={comment.id} onSubmit={handleReplySubmitted} onCancel={() => setShowReply(false)} placeholder="返信を書く..." /></div>)}
      {showReport && (<ReportModal commentId={comment.id} onClose={() => setShowReport(false)} onReported={() => { setShowReport(false); setReported(true); }} />)}
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
