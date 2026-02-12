"use client";

import { useState } from "react";
import Link from "next/link";
import { getRank } from "@/lib/constants/ranks";
import CommentForm from "./CommentForm";

type Reaction = { emoji_type: string; user_id: string };

type Comment = {
  id: string;
  user_id: string;
  body: string;
  sentiment: string | null;
  created_at: string;
  reply_count: number;
  profiles: {
    display_name: string;
    avatar_url: string | null;
    rank_id: string;
  } | null;
  comment_reactions: Reaction[];
};

type Props = {
  comment: Comment;
  currentUserId: string;
  raceId: string;
};

const EMOJI_MAP: Record<string, { icon: string; label: string }> = {
  target: { icon: "🎯", label: "的中" },
  brain: { icon: "🧠", label: "なるほど" },
  thumbsup: { icon: "👍", label: "いいね" },
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
  const rank = comment.profiles ? getRank(comment.profiles.rank_id) : null;

  const timeAgo = getTimeAgo(comment.created_at);
  const sentimentBadge = comment.sentiment ? SENTIMENT_BADGE[comment.sentiment] : null;

  const toggleReaction = async (emojiType: string) => {
    const res = await fetch(`/api/comments/${comment.id}/reactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji_type: emojiType }),
    });
    if (res.ok) {
      const { action } = await res.json();
      if (action === "added") {
        setReactions([...reactions, { emoji_type: emojiType, user_id: currentUserId }]);
      } else {
        setReactions(reactions.filter(
          (r) => !(r.emoji_type === emojiType && r.user_id === currentUserId)
        ));
      }
    }
  };

  const handleReply = () => {
    setShowReply(false);
    setReplyCount((c) => c + 1);
  };

  return (
    <div className="px-5 py-4">
      {/* ヘッダー */}
      <div className="flex items-center gap-2 mb-2">
        <Link href={`/users/${comment.user_id}`} className="flex items-center gap-2 group">
          {comment.profiles?.avatar_url ? (
            <img src={comment.profiles.avatar_url} alt="" className="w-8 h-8 rounded-full" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-sm">🏇</div>
          )}
          <div>
            <span className="text-sm font-bold text-gray-800 group-hover:text-green-600">
              {comment.profiles?.display_name ?? "匿名"}
            </span>
            {rank && (
              <span className="text-xs text-gray-400 ml-1.5">{rank.icon} {rank.name}</span>
            )}
          </div>
        </Link>
        <span className="text-xs text-gray-300 ml-auto">{timeAgo}</span>
      </div>

      {/* センチメントバッジ */}
      {sentimentBadge && (
        <span className={`inline-block text-xs px-2 py-0.5 rounded-full mb-2 ${sentimentBadge.bg} ${sentimentBadge.text}`}>
          {sentimentBadge.label}
        </span>
      )}

      {/* 本文 */}
      <p className="text-sm text-gray-700 whitespace-pre-wrap mb-3">{comment.body}</p>

      {/* リアクション + 返信 */}
      <div className="flex items-center gap-2">
        {Object.entries(EMOJI_MAP).map(([type, { icon, label }]) => {
          const count = reactions.filter((r) => r.emoji_type === type).length;
          const isReacted = reactions.some(
            (r) => r.emoji_type === type && r.user_id === currentUserId
          );
          return (
            <button
              key={type}
              onClick={() => toggleReaction(type)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs transition-all ${
                isReacted
                  ? "bg-green-100 text-green-700 ring-1 ring-green-300"
                  : "bg-gray-50 text-gray-500 hover:bg-gray-100"
              }`}
            >
              <span>{icon}</span>
              {count > 0 && <span className="font-medium">{count}</span>}
            </button>
          );
        })}

        <button
          onClick={() => setShowReply(!showReply)}
          className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-gray-50 text-gray-500 hover:bg-gray-100 ml-auto"
        >
          💬 {replyCount > 0 ? replyCount : "返信"}
        </button>
      </div>

      {/* 返信フォーム */}
      {showReply && (
        <div className="mt-3 ml-6 pl-4 border-l-2 border-gray-100">
          <CommentForm
            raceId={raceId}
            parentId={comment.id}
            onSubmit={handleReply}
            onCancel={() => setShowReply(false)}
            placeholder="返信を書く..."
          />
        </div>
      )}
    </div>
  );
}

function getTimeAgo(dateStr: string): string {
  const now = new Date();
  const d = new Date(dateStr);
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (diff < 60) return "たった今";
  if (diff < 3600) return `${Math.floor(diff / 60)}分前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}時間前`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}日前`;
  return d.toLocaleDateString("ja-JP", { month: "short", day: "numeric" });
}
