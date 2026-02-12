"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import CommentItem from "./CommentItem";
import CommentForm from "./CommentForm";

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
  comment_reactions: {
    emoji_type: string;
    user_id: string;
  }[];
};

type Props = {
  raceId: string;
  currentUserId: string;
};

export default function CommentSection({ raceId, currentUserId }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const supabase = createClient();

  const fetchComments = useCallback(async (cursor?: string) => {
    const url = cursor
      ? `/api/races/${raceId}/comments?cursor=${cursor}`
      : `/api/races/${raceId}/comments`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (cursor) {
        setComments((prev) => [...prev, ...data.comments]);
      } else {
        setComments(data.comments);
      }
      setNextCursor(data.next_cursor);
    }
    setLoading(false);
  }, [raceId]);

  useEffect(() => {
    fetchComments();

    // リアルタイム購読
    const channel = supabase
      .channel(`comments-${raceId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "comments",
          filter: `race_id=eq.${raceId}`,
        },
        () => fetchComments()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [raceId, fetchComments, supabase]);

  const handleNewComment = (comment: Comment) => {
    setComments((prev) => [{ ...comment, reply_count: 0, comment_reactions: [] }, ...prev]);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <h2 className="font-bold text-gray-800">💬 掲示板</h2>
        <span className="text-xs text-gray-400">{comments.length}件</span>
      </div>

      {/* 投稿フォーム */}
      <div className="px-5 pb-3">
        <CommentForm raceId={raceId} onSubmit={handleNewComment} />
      </div>

      {/* コメントリスト */}
      <div className="divide-y divide-gray-50">
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">読み込み中...</div>
        ) : comments.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            まだコメントはありません。最初のコメントを投稿しよう！
          </div>
        ) : (
          comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              currentUserId={currentUserId}
              raceId={raceId}
            />
          ))
        )}
      </div>

      {/* もっと読む */}
      {nextCursor && (
        <div className="p-3 text-center border-t border-gray-50">
          <button
            onClick={() => fetchComments(nextCursor)}
            className="text-sm text-green-600 hover:underline"
          >
            もっと読む
          </button>
        </div>
      )}
    </div>
  );
}
