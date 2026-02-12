#!/bin/bash
# ============================================
# ゲートイン！ Phase 5+6 セットアップスクリプト
# コメント・リアクション・タイムライン・フォロー
# gate-in フォルダ内で実行してください
# ============================================

echo "🏇 ゲートイン！ Phase 5+6（ソーシャル機能）セットアップを開始します..."
echo ""

# ディレクトリ作成
echo "📁 フォルダを作成中..."
mkdir -p src/app/api/races/\[raceId\]/comments
mkdir -p src/app/api/comments/\[commentId\]/reactions
mkdir -p src/app/api/timeline
mkdir -p src/app/api/follows
mkdir -p src/app/\(main\)/timeline
mkdir -p src/app/\(main\)/users/\[userId\]
mkdir -p src/components/comments
mkdir -p src/components/social

# ============================================
# Phase 5: コメント・リアクション
# ============================================

# ====== コメントAPI ======
echo "📝 src/app/api/races/[raceId]/comments/route.ts"
cat << 'FILEOF' > src/app/api/races/\[raceId\]/comments/route.ts
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type Props = {
  params: Promise<{ raceId: string }>;
};

export async function GET(request: Request, { params }: Props) {
  const { raceId } = await params;
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor");
  const limit = 20;

  let query = supabase
    .from("comments")
    .select("*, profiles(display_name, avatar_url, rank_id), comment_reactions(emoji_type, user_id)")
    .eq("race_id", raceId)
    .is("parent_id", null)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  const { data: comments, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // リプライ数を取得
  const commentIds = comments?.map((c) => c.id) ?? [];
  const commentsWithReplyCounts = await Promise.all(
    (comments ?? []).map(async (comment) => {
      const { count } = await supabase
        .from("comments")
        .select("*", { count: "exact", head: true })
        .eq("parent_id", comment.id)
        .eq("is_deleted", false);
      return { ...comment, reply_count: count ?? 0 };
    })
  );

  const nextCursor =
    comments && comments.length === limit
      ? comments[comments.length - 1].created_at
      : null;

  return NextResponse.json({
    comments: commentsWithReplyCounts,
    next_cursor: nextCursor,
  });
}

export async function POST(request: Request, { params }: Props) {
  const { raceId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const body = await request.json();
  const { body: commentBody, sentiment, parent_id } = body;

  if (!commentBody || commentBody.trim().length === 0) {
    return NextResponse.json({ error: "コメントを入力してください" }, { status: 400 });
  }

  if (commentBody.length > 500) {
    return NextResponse.json({ error: "500文字以内で入力してください" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("comments")
    .insert({
      user_id: user.id,
      race_id: raceId,
      parent_id: parent_id ?? null,
      body: commentBody.trim(),
      sentiment: sentiment ?? null,
    })
    .select("*, profiles(display_name, avatar_url, rank_id)")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
FILEOF

# ====== リアクションAPI ======
echo "📝 src/app/api/comments/[commentId]/reactions/route.ts"
cat << 'FILEOF' > src/app/api/comments/\[commentId\]/reactions/route.ts
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type Props = {
  params: Promise<{ commentId: string }>;
};

export async function POST(request: Request, { params }: Props) {
  const { commentId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const { emoji_type } = await request.json();

  if (!["target", "brain", "thumbsup"].includes(emoji_type)) {
    return NextResponse.json({ error: "無効なリアクション" }, { status: 400 });
  }

  // 既存チェック → トグル
  const { data: existing } = await supabase
    .from("comment_reactions")
    .select("id")
    .eq("comment_id", commentId)
    .eq("user_id", user.id)
    .eq("emoji_type", emoji_type)
    .maybeSingle();

  if (existing) {
    await supabase.from("comment_reactions").delete().eq("id", existing.id);
    return NextResponse.json({ action: "removed" });
  } else {
    await supabase.from("comment_reactions").insert({
      comment_id: commentId,
      user_id: user.id,
      emoji_type,
    });
    return NextResponse.json({ action: "added" });
  }
}
FILEOF

# ====== CommentSection.tsx ======
echo "📝 src/components/comments/CommentSection.tsx"
cat << 'FILEOF' > src/components/comments/CommentSection.tsx
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
FILEOF

# ====== CommentForm.tsx ======
echo "📝 src/components/comments/CommentForm.tsx"
cat << 'FILEOF' > src/components/comments/CommentForm.tsx
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
FILEOF

# ====== CommentItem.tsx ======
echo "📝 src/components/comments/CommentItem.tsx"
cat << 'FILEOF' > src/components/comments/CommentItem.tsx
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
FILEOF

# ============================================
# Phase 6: タイムライン・フォロー
# ============================================

# ====== タイムラインAPI ======
echo "📝 src/app/api/timeline/route.ts"
cat << 'FILEOF' > src/app/api/timeline/route.ts
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor");
  const filter = searchParams.get("filter") ?? "all";
  const limit = 20;

  // フォロー中のユーザーを取得
  const { data: follows } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", user.id);

  const followingIds = follows?.map((f) => f.following_id) ?? [];
  const targetIds = [user.id, ...followingIds];

  // 投票アクティビティ
  let voteItems: any[] = [];
  if (filter === "all" || filter === "vote") {
    let voteQuery = supabase
      .from("votes")
      .select("id, user_id, race_id, status, earned_points, is_perfect, settled_at, created_at, profiles(display_name, avatar_url, rank_id), races(name, grade, course_name)")
      .in("user_id", targetIds)
      .neq("status", "pending")
      .order("settled_at", { ascending: false })
      .limit(limit);

    if (cursor) {
      voteQuery = voteQuery.lt("settled_at", cursor);
    }

    const { data } = await voteQuery;
    voteItems = (data ?? []).map((v) => ({
      type: "vote_result",
      id: `vote-${v.id}`,
      user: v.profiles,
      user_id: v.user_id,
      race: v.races,
      race_id: v.race_id,
      earned_points: v.earned_points,
      is_perfect: v.is_perfect,
      status: v.status,
      timestamp: v.settled_at ?? v.created_at,
    }));
  }

  // コメントアクティビティ
  let commentItems: any[] = [];
  if (filter === "all" || filter === "comment") {
    let commentQuery = supabase
      .from("comments")
      .select("id, user_id, race_id, body, sentiment, created_at, profiles(display_name, avatar_url, rank_id), races(name, grade, course_name)")
      .in("user_id", targetIds)
      .is("parent_id", null)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (cursor) {
      commentQuery = commentQuery.lt("created_at", cursor);
    }

    const { data } = await commentQuery;
    commentItems = (data ?? []).map((c) => ({
      type: "comment",
      id: `comment-${c.id}`,
      user: c.profiles,
      user_id: c.user_id,
      race: c.races,
      race_id: c.race_id,
      body: c.body,
      sentiment: c.sentiment,
      timestamp: c.created_at,
    }));
  }

  // マージして時系列ソート
  const allItems = [...voteItems, ...commentItems]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);

  const newCursor = allItems.length === limit ? allItems[allItems.length - 1].timestamp : null;

  return NextResponse.json({ items: allItems, next_cursor: newCursor });
}
FILEOF

# ====== フォローAPI ======
echo "📝 src/app/api/follows/route.ts"
cat << 'FILEOF' > src/app/api/follows/route.ts
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const { following_id } = await request.json();

  if (!following_id || following_id === user.id) {
    return NextResponse.json({ error: "無効なユーザーです" }, { status: 400 });
  }

  // トグル：既存ならアンフォロー、なければフォロー
  const { data: existing } = await supabase
    .from("follows")
    .select("id")
    .eq("follower_id", user.id)
    .eq("following_id", following_id)
    .maybeSingle();

  if (existing) {
    await supabase.from("follows").delete().eq("id", existing.id);
    return NextResponse.json({ action: "unfollowed" });
  } else {
    const { error } = await supabase.from("follows").insert({
      follower_id: user.id,
      following_id,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ action: "followed" });
  }
}
FILEOF

# ====== タイムラインページ ======
echo "📝 src/app/(main)/timeline/page.tsx"
cat << 'FILEOF' > src/app/\(main\)/timeline/page.tsx
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import TimelineFeed from "@/components/social/TimelineFeed";

export default async function TimelinePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // フォロー数
  const { count: followingCount } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("follower_id", user.id);

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">📰 タイムライン</h1>
        <span className="text-xs text-gray-400">
          {followingCount ?? 0}人をフォロー中
        </span>
      </div>

      {(followingCount ?? 0) === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
          💡 他のユーザーをフォローすると、ここに投票結果やコメントが表示されます。
          レースの掲示板で気になるユーザーを見つけたら、プロフィールからフォローしてみましょう！
        </div>
      )}

      <TimelineFeed />
    </div>
  );
}
FILEOF

# ====== TimelineFeed.tsx ======
echo "📝 src/components/social/TimelineFeed.tsx"
cat << 'FILEOF' > src/components/social/TimelineFeed.tsx
"use client";

import { useEffect, useState } from "react";
import TimelineItem from "./TimelineItem";

type TimelineEntry = {
  type: string;
  id: string;
  user: { display_name: string; avatar_url: string | null; rank_id: string } | null;
  user_id: string;
  race: { name: string; grade: string | null; course_name: string } | null;
  race_id: string;
  earned_points?: number;
  is_perfect?: boolean;
  status?: string;
  body?: string;
  sentiment?: string;
  timestamp: string;
};

export default function TimelineFeed() {
  const [items, setItems] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");

  const fetchItems = async (cursor?: string) => {
    const url = cursor
      ? `/api/timeline?filter=${filter}&cursor=${cursor}`
      : `/api/timeline?filter=${filter}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (cursor) {
        setItems((prev) => [...prev, ...data.items]);
      } else {
        setItems(data.items);
      }
      setNextCursor(data.next_cursor);
    }
    setLoading(false);
  };

  useEffect(() => {
    setLoading(true);
    fetchItems();
  }, [filter]);

  const filters = [
    { key: "all", label: "すべて" },
    { key: "vote", label: "🗳 投票結果" },
    { key: "comment", label: "💬 コメント" },
  ];

  return (
    <div>
      {/* フィルター */}
      <div className="flex gap-2 mb-4">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              filter === f.key
                ? "bg-green-600 text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:border-green-300"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* アイテムリスト */}
      {loading ? (
        <div className="bg-white rounded-xl p-8 text-center text-gray-400 text-sm">
          読み込み中...
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center text-gray-400 text-sm">
          まだアクティビティがありません
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <TimelineItem key={item.id} item={item} />
          ))}
        </div>
      )}

      {/* もっと読む */}
      {nextCursor && (
        <div className="text-center mt-4">
          <button
            onClick={() => fetchItems(nextCursor)}
            className="text-sm text-green-600 hover:underline"
          >
            もっと読む
          </button>
        </div>
      )}
    </div>
  );
}
FILEOF

# ====== TimelineItem.tsx ======
echo "📝 src/components/social/TimelineItem.tsx"
cat << 'FILEOF' > src/components/social/TimelineItem.tsx
import Link from "next/link";
import { getRank } from "@/lib/constants/ranks";

type Props = {
  item: {
    type: string;
    user: { display_name: string; avatar_url: string | null; rank_id: string } | null;
    user_id: string;
    race: { name: string; grade: string | null; course_name: string } | null;
    race_id: string;
    earned_points?: number;
    is_perfect?: boolean;
    status?: string;
    body?: string;
    sentiment?: string;
    timestamp: string;
  };
};

const SENTIMENT_LABEL: Record<string, string> = {
  very_positive: "🔥 超注目",
  positive: "👍 推し",
  negative: "🤔 微妙",
  very_negative: "⚠️ 危険",
};

export default function TimelineItem({ item }: Props) {
  const rank = item.user ? getRank(item.user.rank_id) : null;
  const timeAgo = getTimeAgo(item.timestamp);

  const isHit = item.status === "settled_hit";
  const gradeColor = item.race?.grade
    ? item.race.grade === "G1" ? "bg-yellow-100 text-yellow-800"
    : item.race.grade === "G2" ? "bg-red-100 text-red-700"
    : item.race.grade === "G3" ? "bg-green-100 text-green-700"
    : "bg-gray-100 text-gray-600"
    : "";

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      {/* ヘッダー */}
      <div className="flex items-center gap-2 mb-2">
        <Link href={`/users/${item.user_id}`} className="flex items-center gap-2 group">
          {item.user?.avatar_url ? (
            <img src={item.user.avatar_url} alt="" className="w-8 h-8 rounded-full" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-sm">🏇</div>
          )}
          <span className="text-sm font-bold text-gray-800 group-hover:text-green-600">
            {item.user?.display_name ?? "匿名"}
          </span>
        </Link>
        {rank && <span className="text-xs text-gray-400">{rank.icon}</span>}
        <span className="text-xs text-gray-300 ml-auto">{timeAgo}</span>
      </div>

      {/* コンテンツ */}
      {item.type === "vote_result" && (
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-gray-500">
              {isHit ? "🎯 的中！" : "📊 結果"} 
            </span>
            {item.race?.grade && (
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${gradeColor}`}>
                {item.race.grade}
              </span>
            )}
            <Link
              href={`/races/${item.race_id}`}
              className="text-sm font-bold text-gray-800 hover:text-green-600"
            >
              {item.race?.name}
            </Link>
          </div>
          <div className="flex items-center gap-2">
            {(item.earned_points ?? 0) > 0 && (
              <span className="text-sm font-bold text-green-600">+{item.earned_points} P</span>
            )}
            {item.is_perfect && (
              <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                💎 完全的中
              </span>
            )}
            {!isHit && (
              <span className="text-xs text-gray-400">ハズレ</span>
            )}
          </div>
        </div>
      )}

      {item.type === "comment" && (
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-gray-500">💬 コメント</span>
            {item.race?.grade && (
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${gradeColor}`}>
                {item.race.grade}
              </span>
            )}
            <Link
              href={`/races/${item.race_id}`}
              className="text-sm font-bold text-gray-800 hover:text-green-600"
            >
              {item.race?.name}
            </Link>
            {item.sentiment && (
              <span className="text-xs text-gray-400">{SENTIMENT_LABEL[item.sentiment]}</span>
            )}
          </div>
          <p className="text-sm text-gray-600 line-clamp-2">{item.body}</p>
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
FILEOF

# ====== FollowButton.tsx ======
echo "📝 src/components/social/FollowButton.tsx"
cat << 'FILEOF' > src/components/social/FollowButton.tsx
"use client";

import { useState } from "react";

type Props = {
  targetUserId: string;
  initialFollowing: boolean;
};

export default function FollowButton({ targetUserId, initialFollowing }: Props) {
  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    setLoading(true);
    const res = await fetch("/api/follows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ following_id: targetUserId }),
    });
    if (res.ok) {
      const { action } = await res.json();
      setIsFollowing(action === "followed");
    }
    setLoading(false);
  };

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${
        isFollowing
          ? "bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600"
          : "bg-green-600 text-white hover:bg-green-700"
      } disabled:opacity-50`}
    >
      {loading ? "..." : isFollowing ? "フォロー中" : "フォローする"}
    </button>
  );
}
FILEOF

# ====== ユーザープロフィールページ ======
echo "📝 src/app/(main)/users/[userId]/page.tsx"
cat << 'FILEOF' > src/app/\(main\)/users/\[userId\]/page.tsx
import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { getRank, getNextRank } from "@/lib/constants/ranks";
import FollowButton from "@/components/social/FollowButton";
import Link from "next/link";

type Props = {
  params: Promise<{ userId: string }>;
};

export default async function UserProfilePage({ params }: Props) {
  const { userId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // プロフィール
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (!profile || error) notFound();

  const rank = getRank(profile.rank_id);
  const nextRank = getNextRank(profile.rank_id);
  const isOwnProfile = user.id === userId;

  // フォロー状態
  let isFollowing = false;
  if (!isOwnProfile) {
    const { data } = await supabase
      .from("follows")
      .select("id")
      .eq("follower_id", user.id)
      .eq("following_id", userId)
      .maybeSingle();
    isFollowing = !!data;
  }

  // フォロー数・フォロワー数
  const { count: followingCount } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("follower_id", userId);

  const { count: followerCount } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("following_id", userId);

  // 直近の投票結果
  const { data: recentVotes } = await supabase
    .from("votes")
    .select("id, race_id, status, earned_points, is_perfect, settled_at, races(name, grade)")
    .eq("user_id", userId)
    .neq("status", "pending")
    .order("settled_at", { ascending: false })
    .limit(10);

  // バッジ
  const { data: userBadges } = await supabase
    .from("user_badges")
    .select("badge_id, earned_at, badges(name, icon, description)")
    .eq("user_id", userId)
    .order("earned_at", { ascending: false });

  // 的中率計算
  const hitRate = profile.total_votes > 0
    ? Math.round((profile.win_hits / profile.total_votes) * 1000) / 10
    : 0;

  const progressToNext = nextRank
    ? Math.round(((profile.cumulative_points - rank.threshold) / (nextRank.threshold - rank.threshold)) * 100)
    : 100;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* プロフィールカード */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-start gap-4 mb-4">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-20 h-20 rounded-full" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center text-3xl">🏇</div>
          )}
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-gray-800">{profile.display_name}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm">{rank.icon} {rank.name}</span>
                  <span className="text-sm font-bold text-green-600">{profile.cumulative_points} P</span>
                </div>
              </div>
              {!isOwnProfile && (
                <FollowButton targetUserId={userId} initialFollowing={isFollowing} />
              )}
            </div>
            {profile.bio && (
              <p className="text-sm text-gray-600 mt-2">{profile.bio}</p>
            )}
          </div>
        </div>

        {/* ランク進捗 */}
        {nextRank && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>{rank.name}</span>
              <span>{nextRank.name}まであと{nextRank.threshold - profile.cumulative_points}P</span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full transition-all"
                style={{ width: `${Math.min(progressToNext, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* フォロー数 + 統計 */}
        <div className="grid grid-cols-5 gap-2 text-center">
          <div className="bg-gray-50 rounded-xl p-3">
            <div className="text-lg font-bold text-gray-800">{followingCount ?? 0}</div>
            <div className="text-xs text-gray-400">フォロー</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <div className="text-lg font-bold text-gray-800">{followerCount ?? 0}</div>
            <div className="text-xs text-gray-400">フォロワー</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <div className="text-lg font-bold text-gray-800">{profile.total_votes}</div>
            <div className="text-xs text-gray-400">投票数</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <div className="text-lg font-bold text-green-600">{hitRate}%</div>
            <div className="text-xs text-gray-400">的中率</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <div className="text-lg font-bold text-orange-500">🔥{profile.best_streak}</div>
            <div className="text-xs text-gray-400">最長連続</div>
          </div>
        </div>
      </div>

      {/* バッジ */}
      {userBadges && userBadges.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-bold text-gray-800 mb-3">🏅 獲得バッジ</h2>
          <div className="flex flex-wrap gap-2">
            {userBadges.map((ub) => (
              <div key={ub.badge_id} className="flex items-center gap-1.5 bg-gray-50 rounded-full px-3 py-1.5" title={(ub.badges as any)?.description}>
                <span>{(ub.badges as any)?.icon}</span>
                <span className="text-xs font-medium text-gray-700">{(ub.badges as any)?.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 最近の結果 */}
      {recentVotes && recentVotes.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-bold text-gray-800 mb-3">📊 最近の投票結果</h2>
          <div className="space-y-2">
            {recentVotes.map((vote) => (
              <Link
                key={vote.id}
                href={`/races/${vote.race_id}`}
                className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 hover:bg-gray-100 transition-colors"
              >
                {(vote.races as any)?.grade && (
                  <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-green-100 text-green-700">
                    {(vote.races as any).grade}
                  </span>
                )}
                <span className="text-sm font-medium flex-1">{(vote.races as any)?.name}</span>
                <span className={`text-xs font-bold ${
                  vote.status === "settled_hit" ? "text-green-600" : "text-gray-400"
                }`}>
                  {vote.status === "settled_hit" ? `🎯 +${vote.earned_points}P` : "ハズレ"}
                </span>
                {vote.is_perfect && <span className="text-xs">💎</span>}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
FILEOF

# ====== レース詳細ページにコメントセクションを追加 ======
echo "📝 レース詳細ページを更新（コメント追加）"

# race detail の最後にコメントセクション追加のため、import と使用箇所を修正
# sed でファイルを修正する方が確実

# まず import を追加
sed -i '5a import CommentSection from "@/components/comments/CommentSection";' src/app/\(main\)/races/\[raceId\]/page.tsx 2>/dev/null || true

# コメントセクションを出馬表の後に追加（</div> の最後のメインエリア内）
# ファイルの末尾付近を確認して、適切な場所に追加する

# シンプルに: page.tsx の中に CommentSection を直接追加する方が確実
# → ページ全体を書き換える代わりに、インポートと使用箇所を追加

python3 << 'PYEOF'
import re

filepath = "src/app/(main)/races/[raceId]/page.tsx"

with open(filepath, "r") as f:
    content = f.read()

# import CommentSection を追加（まだなければ）
if "CommentSection" not in content:
    content = content.replace(
        'import RaceResultTable from "@/components/races/RaceResultTable";',
        'import RaceResultTable from "@/components/races/RaceResultTable";\nimport CommentSection from "@/components/comments/CommentSection";'
    )

# コメントセクションを出馬表の後に追加
# 「出馬表」セクションの閉じタグの後に追加
insert_marker = """          {/* 出馬表（投票済み or 結果確定） */}
          {!isVotable && entries && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="font-bold text-gray-800 mb-3">📋 出馬表</h2>
              <HorseList entries={entries} myVote={myVote} results={results} />
            </div>
          )}"""

comment_section = """

          {/* コメント掲示板 */}
          <CommentSection raceId={race.id} currentUserId={user.id} />"""

if "CommentSection raceId" not in content:
    content = content.replace(insert_marker, insert_marker + comment_section)

with open(filepath, "w") as f:
    f.write(content)

print("  → レース詳細にコメントセクション追加完了")
PYEOF

# ====== ヘッダーにタイムラインリンクを追加 ======
echo "📝 ヘッダーを更新（タイムライン追加）"
cat << 'FILEOF' > src/components/layout/Header.tsx
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getRank } from "@/lib/constants/ranks";
import LogoutButton from "@/components/LogoutButton";

export default async function Header() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let profile = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("display_name, avatar_url, rank_id, cumulative_points")
      .eq("id", user.id)
      .single();
    profile = data;
  }

  const rank = profile ? getRank(profile.rank_id) : null;

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-4 h-14">
        <Link href="/" className="text-xl font-bold text-green-600 shrink-0">
          🏇 ゲートイン！
        </Link>

        <nav className="hidden md:flex items-center gap-1 ml-8">
          <NavLink href="/">トップ</NavLink>
          <NavLink href="/races">レース</NavLink>
          <NavLink href="/timeline">TL</NavLink>
          <NavLink href="/admin">管理</NavLink>
        </nav>

        <div className="flex items-center gap-3">
          {profile && user ? (
            <>
              <div className="hidden sm:flex items-center gap-2 bg-green-50 px-3 py-1.5 rounded-full">
                <span className="text-xs">{rank?.icon}</span>
                <span className="text-sm font-bold text-green-700">
                  {profile.cumulative_points} P
                </span>
              </div>
              <Link
                href={`/users/${user.id}`}
                className="text-sm text-gray-600 hidden sm:block hover:text-green-600"
              >
                {profile.display_name}
              </Link>
              <LogoutButton />
            </>
          ) : (
            <Link href="/login" className="text-sm bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
              ログイン
            </Link>
          )}
        </div>
      </div>

      <nav className="md:hidden flex border-t border-gray-100">
        <MobileNavLink href="/">トップ</MobileNavLink>
        <MobileNavLink href="/races">レース</MobileNavLink>
        <MobileNavLink href="/timeline">TL</MobileNavLink>
        {user && <MobileNavLink href={`/users/${user.id}`}>マイ</MobileNavLink>}
      </nav>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors">
      {children}
    </Link>
  );
}

function MobileNavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="flex-1 text-center py-2.5 text-sm font-medium text-gray-600 hover:text-green-600 hover:bg-green-50 transition-colors">
      {children}
    </Link>
  );
}
FILEOF

echo ""
echo "✅ Phase 5+6 セットアップ完了！"
echo ""
echo "📂 作成されたファイル（13ファイル）:"
echo ""
echo "  【Phase 5: コメント・リアクション】"
echo "  src/app/api/races/[raceId]/comments/route.ts  ← コメントAPI"
echo "  src/app/api/comments/[commentId]/reactions/route.ts ← リアクションAPI"
echo "  src/components/comments/CommentSection.tsx     ← コメント一覧"
echo "  src/components/comments/CommentForm.tsx        ← コメント投稿フォーム"
echo "  src/components/comments/CommentItem.tsx        ← コメント表示（リアクション付き）"
echo ""
echo "  【Phase 6: タイムライン・フォロー】"
echo "  src/app/api/timeline/route.ts                  ← タイムラインAPI"
echo "  src/app/api/follows/route.ts                   ← フォローAPI"
echo "  src/app/(main)/timeline/page.tsx               ← タイムラインページ"
echo "  src/app/(main)/users/[userId]/page.tsx         ← ユーザープロフィール"
echo "  src/components/social/TimelineFeed.tsx          ← タイムラインフィード"
echo "  src/components/social/TimelineItem.tsx          ← タイムラインアイテム"
echo "  src/components/social/FollowButton.tsx          ← フォローボタン"
echo "  src/components/layout/Header.tsx               ← ヘッダー更新"
echo ""
echo "🎮 テスト手順:"
echo "  1. pkill -f 'next dev'; rm -rf .next/dev/lock; npm run dev"
echo ""
echo "  【コメント機能】"
echo "  2. レース詳細ページ → 下にスクロール → 💬掲示板"
echo "  3. センチメント（🔥👍🤔⚠️）を選んでコメント投稿"
echo "  4. コメントに 🎯🧠👍 リアクションを付ける"
echo ""
echo "  【ユーザープロフィール】"
echo "  5. ヘッダーのユーザー名をクリック → マイページ"
echo "  6. ランク進捗バー・的中率・統計が表示される"
echo ""
echo "  【タイムライン】"
echo "  7. ヘッダー「TL」→ タイムライン"
echo "  8. 自分の投票結果・コメントが表示される"
echo "  9. 他ユーザーをフォローするとTLに表示される"
