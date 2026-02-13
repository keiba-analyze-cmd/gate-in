#!/bin/bash
set -e

echo "=================================================="
echo "🏇 ゲートイン！ Phase I: コミュニティ安全性・運用品質"
echo "  全9タスク (#64-#72) を一括セットアップ"
echo "=================================================="
echo ""

# ============================================================
# #64: コメント通報API
# ============================================================
echo "━━━ #64 コメント通報機能 ━━━"

mkdir -p 'src/app/api/comments/[commentId]/report'
cat > 'src/app/api/comments/[commentId]/report/route.ts' << 'EOF'
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/admin";
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

  const rl = rateLimit(`report:${user.id}`, { limit: 10, windowMs: 3600_000 });
  if (!rl.ok) return rateLimitResponse();

  const body = await request.json();
  const { reason, detail } = body;

  const validReasons = ["spam", "harassment", "inappropriate", "misinformation", "other"];
  if (!reason || !validReasons.includes(reason)) {
    return NextResponse.json({ error: "通報理由を選択してください" }, { status: 400 });
  }

  if (detail && detail.length > 500) {
    return NextResponse.json({ error: "詳細は500文字以内で入力してください" }, { status: 400 });
  }

  const adminClient = createAdminClient();
  const { data: comment } = await adminClient
    .from("comments")
    .select("user_id")
    .eq("id", commentId)
    .single();

  if (!comment) {
    return NextResponse.json({ error: "コメントが見つかりません" }, { status: 404 });
  }

  if (comment.user_id === user.id) {
    return NextResponse.json({ error: "自分のコメントは通報できません" }, { status: 400 });
  }

  const { data: existing } = await adminClient
    .from("comment_reports")
    .select("id")
    .eq("comment_id", commentId)
    .eq("reporter_id", user.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "このコメントは既に通報済みです" }, { status: 409 });
  }

  const { error: insertError } = await adminClient
    .from("comment_reports")
    .insert({
      comment_id: commentId,
      reporter_id: user.id,
      reason,
      detail: detail?.trim() || null,
    });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  const { data: admins } = await adminClient
    .from("profiles")
    .select("id")
    .eq("is_admin", true);

  if (admins && admins.length > 0) {
    const notifications = admins.map((admin) => ({
      user_id: admin.id,
      type: "comment_reported",
      title: "コメント通報",
      body: `コメントが通報されました（理由: ${reason}）`,
      link: "/admin?tab=comments",
      is_read: false,
    }));
    await adminClient.from("notifications").insert(notifications);
  }

  return NextResponse.json({ success: true, message: "通報を受け付けました" }, { status: 201 });
}
EOF
echo "  ✅ src/app/api/comments/[commentId]/report/route.ts"

# ReportModal
cat > src/components/comments/ReportModal.tsx << 'EOF'
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
EOF
echo "  ✅ src/components/comments/ReportModal.tsx"

# ============================================================
# #65: コメント編集・削除 API
# ============================================================
echo "━━━ #65 コメント編集・削除 ━━━"

cat > 'src/app/api/comments/[commentId]/route.ts' << 'EOF'
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { validateComment } from "@/lib/validation";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type Props = { params: Promise<{ commentId: string }>; };

export async function PATCH(request: Request, { params }: Props) {
  const { commentId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });

  const rl = rateLimit(`comment-edit:${user.id}`, { limit: 20, windowMs: 60_000 });
  if (!rl.ok) return rateLimitResponse();

  const body = await request.json();
  const validation = validateComment(body.body);
  if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 });

  const { data: comment } = await supabase.from("comments").select("id, user_id, is_deleted").eq("id", commentId).single();
  if (!comment) return NextResponse.json({ error: "コメントが見つかりません" }, { status: 404 });
  if (comment.user_id !== user.id) return NextResponse.json({ error: "自分のコメントのみ編集できます" }, { status: 403 });
  if (comment.is_deleted) return NextResponse.json({ error: "削除済みのコメントは編集できません" }, { status: 400 });

  const { data: updated, error: updateError } = await supabase.from("comments")
    .update({ body: body.body.trim(), edited_at: new Date().toISOString() })
    .eq("id", commentId).eq("user_id", user.id)
    .select("*, profiles(display_name, avatar_url, rank_id)").single();

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
  return NextResponse.json(updated);
}

export async function DELETE(request: Request, { params }: Props) {
  const { commentId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });

  const rl = rateLimit(`comment-delete:${user.id}`, { limit: 20, windowMs: 60_000 });
  if (!rl.ok) return rateLimitResponse();

  const { data: comment } = await supabase.from("comments").select("id, user_id").eq("id", commentId).single();
  if (!comment) return NextResponse.json({ error: "コメントが見つかりません" }, { status: 404 });
  if (comment.user_id !== user.id) return NextResponse.json({ error: "自分のコメントのみ削除できます" }, { status: 403 });

  const { error } = await supabase.from("comments")
    .update({ is_deleted: true, body: "（このコメントは削除されました）" })
    .eq("id", commentId).eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
EOF
echo "  ✅ src/app/api/comments/[commentId]/route.ts"

# ============================================================
# #64+#65: CommentItem.tsx 全置換
# ============================================================
echo "━━━ #64+#65 CommentItem.tsx 全置換 ━━━"

cat > src/components/comments/CommentItem.tsx << 'EOF'
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

  const handleReply = () => { setShowReply(false); setReplyCount((c) => c + 1); };

  return (
    <div className="px-5 py-4">
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

      {sentimentBadge && (<span className={`inline-block text-xs px-2 py-0.5 rounded-full mb-2 ${sentimentBadge.bg} ${sentimentBadge.text}`}>{sentimentBadge.label}</span>)}

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

      <div className="flex items-center gap-2">
        {Object.entries(EMOJI_MAP).map(([type, { icon }]) => {
          const count = reactions.filter((r) => r.emoji_type === type).length;
          const isReacted = reactions.some((r) => r.emoji_type === type && r.user_id === currentUserId);
          return (<button key={type} onClick={() => toggleReaction(type)} className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs transition-all ${isReacted ? "bg-green-100 text-green-700 ring-1 ring-green-300" : "bg-gray-50 text-gray-500 hover:bg-gray-100"}`}><span>{icon}</span>{count > 0 && <span className="font-medium">{count}</span>}</button>);
        })}
        <button onClick={() => setShowReply(!showReply)} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-gray-50 text-gray-500 hover:bg-gray-100 ml-auto">💬 {replyCount > 0 ? replyCount : "返信"}</button>
        {comment.user_id !== currentUserId && !reported && (<button onClick={() => setShowReport(true)} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-gray-50 text-gray-500 hover:bg-red-50 hover:text-red-600" title="通報">🚨</button>)}
        {reported && <span className="text-xs text-red-400 px-2">通報済み</span>}
      </div>

      {showReply && (<div className="mt-3 ml-6 pl-4 border-l-2 border-gray-100"><CommentForm raceId={raceId} parentId={comment.id} onSubmit={handleReply} onCancel={() => setShowReply(false)} placeholder="返信を書く..." /></div>)}
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
EOF
echo "  ✅ src/components/comments/CommentItem.tsx (全置換)"

# ============================================================
# #66: ユーザーブロック
# ============================================================
echo "━━━ #66 ユーザーブロック機能 ━━━"

mkdir -p src/app/api/blocks
cat > src/app/api/blocks/route.ts << 'EOF'
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { validateUUID } from "@/lib/validation";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  const { data: blocks } = await supabase.from("blocks").select("blocked_id, created_at").eq("blocker_id", user.id).order("created_at", { ascending: false });
  return NextResponse.json({ blocks: blocks ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  const rl = rateLimit(`block:${user.id}`, { limit: 30, windowMs: 60_000 });
  if (!rl.ok) return rateLimitResponse();
  const body = await request.json();
  const { blocked_id } = body;
  if (!validateUUID(blocked_id).ok) return NextResponse.json({ error: "無効なIDです" }, { status: 400 });
  if (blocked_id === user.id) return NextResponse.json({ error: "自分自身をブロックできません" }, { status: 400 });
  const { error } = await supabase.from("blocks").upsert({ blocker_id: user.id, blocked_id }, { onConflict: "blocker_id,blocked_id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", blocked_id);
  await supabase.from("follows").delete().eq("follower_id", blocked_id).eq("following_id", user.id);
  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  const body = await request.json();
  if (!validateUUID(body.blocked_id).ok) return NextResponse.json({ error: "無効なIDです" }, { status: 400 });
  await supabase.from("blocks").delete().eq("blocker_id", user.id).eq("blocked_id", body.blocked_id);
  return NextResponse.json({ success: true });
}
EOF
echo "  ✅ src/app/api/blocks/route.ts"

cat > src/components/social/BlockButton.tsx << 'EOF'
"use client";
import { useState } from "react";

export default function BlockButton({ targetUserId, initialBlocked }: { targetUserId: string; initialBlocked: boolean }) {
  const [blocked, setBlocked] = useState(initialBlocked);
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    const msg = blocked ? "ブロックを解除しますか？" : "このユーザーをブロックしますか？\nブロックすると相互フォローが解除され、相手のコメントがタイムラインに表示されなくなります。";
    if (!confirm(msg)) return;
    setLoading(true);
    try {
      const res = await fetch("/api/blocks", { method: blocked ? "DELETE" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ blocked_id: targetUserId }) });
      if (res.ok) { setBlocked(!blocked); if (!blocked) window.location.reload(); }
    } catch {}
    setLoading(false);
  };

  return (
    <button onClick={handleToggle} disabled={loading}
      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${blocked ? "bg-gray-200 text-gray-600 hover:bg-gray-300" : "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"} disabled:opacity-50`}>
      {loading ? "..." : blocked ? "ブロック解除" : "🚫 ブロック"}
    </button>
  );
}
EOF
echo "  ✅ src/components/social/BlockButton.tsx"

# タイムラインAPI全置換（ブロック除外）
cat > src/app/api/timeline/route.ts << 'EOF'
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });

  const rl = rateLimit(`timeline:${user.id}`, { limit: 60, windowMs: 60_000 });
  if (!rl.ok) return rateLimitResponse();

  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor");
  const filter = searchParams.get("filter") ?? "all";
  const limit = 20;

  const { data: follows } = await supabase.from("follows").select("following_id").eq("follower_id", user.id);
  const followingIds = follows?.map((f) => f.following_id) ?? [];

  const { data: blockedUsers } = await supabase.from("blocks").select("blocked_id").eq("blocker_id", user.id);
  const blockedIds = new Set(blockedUsers?.map((b) => b.blocked_id) ?? []);
  const targetIds = [user.id, ...followingIds.filter((id) => !blockedIds.has(id))];

  let voteItems: any[] = [];
  if (filter === "all" || filter === "vote") {
    let q = supabase.from("votes")
      .select("id, user_id, race_id, status, earned_points, is_perfect, settled_at, created_at, profiles(display_name, avatar_url, rank_id), races(name, grade, course_name)")
      .in("user_id", targetIds).neq("status", "pending").order("settled_at", { ascending: false }).limit(limit);
    if (cursor) q = q.lt("settled_at", cursor);
    const { data } = await q;
    voteItems = (data ?? []).map((v) => ({ type: "vote_result", id: `vote-${v.id}`, user: v.profiles, user_id: v.user_id, race: v.races, race_id: v.race_id, earned_points: v.earned_points, is_perfect: v.is_perfect, status: v.status, timestamp: v.settled_at ?? v.created_at }));
  }

  let commentItems: any[] = [];
  if (filter === "all" || filter === "comment") {
    let q = supabase.from("comments")
      .select("id, user_id, race_id, body, sentiment, created_at, profiles(display_name, avatar_url, rank_id), races(name, grade, course_name)")
      .in("user_id", targetIds).is("parent_id", null).eq("is_deleted", false).order("created_at", { ascending: false }).limit(limit);
    if (cursor) q = q.lt("created_at", cursor);
    const { data } = await q;
    commentItems = (data ?? []).map((c) => ({ type: "comment", id: `comment-${c.id}`, comment_id: c.id, user: c.profiles, user_id: c.user_id, race: c.races, race_id: c.race_id, body: c.body, sentiment: c.sentiment, timestamp: c.created_at }));
  }

  const allItems = [...voteItems, ...commentItems].filter((item) => !blockedIds.has(item.user_id))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, limit);
  const newCursor = allItems.length === limit ? allItems[allItems.length - 1].timestamp : null;
  return NextResponse.json({ items: allItems, next_cursor: newCursor });
}
EOF
echo "  ✅ src/app/api/timeline/route.ts (ブロック除外追加)"

# コメントAPI全置換（ブロック+is_hidden追加）
cat > 'src/app/api/races/[raceId]/comments/route.ts' << 'EOF'
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { validateComment } from "@/lib/validation";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type Props = { params: Promise<{ raceId: string }>; };

export async function GET(request: Request, { params }: Props) {
  const { raceId } = await params;
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor");
  const limit = 20;

  const { data: { user: currentUser } } = await supabase.auth.getUser();
  let blockedIds: string[] = [];
  if (currentUser) {
    const { data: bk } = await supabase.from("blocks").select("blocked_id").eq("blocker_id", currentUser.id);
    blockedIds = bk?.map((b) => b.blocked_id) ?? [];
  }

  let query = supabase.from("comments")
    .select("*, profiles(display_name, avatar_url, rank_id), comment_reactions(emoji_type, user_id)")
    .eq("race_id", raceId).is("parent_id", null).eq("is_deleted", false).eq("is_hidden", false)
    .order("created_at", { ascending: false }).limit(limit);
  if (cursor) query = query.lt("created_at", cursor);

  const { data: comments, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const withReplies = await Promise.all((comments ?? []).map(async (c) => {
    const { count } = await supabase.from("comments").select("*", { count: "exact", head: true }).eq("parent_id", c.id).eq("is_deleted", false);
    return { ...c, reply_count: count ?? 0 };
  }));

  const filtered = blockedIds.length > 0 ? withReplies.filter((c) => !blockedIds.includes(c.user_id)) : withReplies;
  const nextCursor = comments && comments.length === limit ? comments[comments.length - 1].created_at : null;
  return NextResponse.json({ comments: filtered, next_cursor: nextCursor });
}

export async function POST(request: Request, { params }: Props) {
  const { raceId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });

  const rl = rateLimit(`comments:${user.id}`, { limit: 10, windowMs: 60_000 });
  if (!rl.ok) return rateLimitResponse();

  const body = await request.json();
  const validation = validateComment(body.body);
  if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 });

  const { data, error } = await supabase.from("comments")
    .insert({ user_id: user.id, race_id: raceId, parent_id: body.parent_id ?? null, body: body.body.trim(), sentiment: body.sentiment ?? null })
    .select("*, profiles(display_name, avatar_url, rank_id)").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
EOF
echo "  ✅ src/app/api/races/[raceId]/comments/route.ts (ブロック+is_hidden)"

# ユーザープロフィール全置換（ブロックボタン追加）— 長いので別ファイルで対処
# sedでimportとブロック取得とボタンを追加
cp 'src/app/(main)/users/[userId]/page.tsx' 'src/app/(main)/users/[userId]/page.tsx.bak'

# BlockButton importを追加
if ! grep -q "BlockButton" 'src/app/(main)/users/[userId]/page.tsx'; then
  sed -i '' 's|import FollowButton from "@/components/social/FollowButton";|import FollowButton from "@/components/social/FollowButton";\nimport BlockButton from "@/components/social/BlockButton";|' 'src/app/(main)/users/[userId]/page.tsx'

  # isFollowing の後にisBlocked追加
  sed -i '' 's|let isFollowing = false;|let isFollowing = false;\n  let isBlocked = false;|' 'src/app/(main)/users/[userId]/page.tsx'

  # isFollowing取得の後にブロック取得追加
  sed -i '' 's|isFollowing = !!data;|isFollowing = !!data;\n\n    const { data: blockData } = await supabase\n      .from("blocks")\n      .select("id")\n      .eq("blocker_id", user.id)\n      .eq("blocked_id", userId)\n      .maybeSingle();\n    isBlocked = !!blockData;|' 'src/app/(main)/users/[userId]/page.tsx'

  # FollowButtonの横にBlockButton追加
  sed -i '' 's|<FollowButton targetUserId={userId} initialFollowing={isFollowing} />|<div className="flex items-center gap-2"><FollowButton targetUserId={userId} initialFollowing={isFollowing} /><BlockButton targetUserId={userId} initialBlocked={isBlocked} /></div>|' 'src/app/(main)/users/[userId]/page.tsx'

  echo "  ✅ src/app/(main)/users/[userId]/page.tsx (ブロックボタン追加)"
else
  echo "  ⏭  users/[userId]/page.tsx 既にBlockButton有り"
fi

# ============================================================
# #67: 管理者コメント管理画面
# ============================================================
echo "━━━ #67 管理者コメント管理画面 ━━━"

mkdir -p src/app/api/admin/comments
cat > src/app/api/admin/comments/route.ts << 'EOF'
import { createAdminClient, requireAdmin } from "@/lib/admin";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try { await requireAdmin(); } catch (res) { return res as Response; }
  const { searchParams } = new URL(request.url);
  const filter = searchParams.get("filter") ?? "all";
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = 30;
  const offset = (page - 1) * limit;
  const adminClient = createAdminClient();

  let query = adminClient.from("comments")
    .select("id, user_id, race_id, body, sentiment, is_deleted, is_hidden, edited_at, created_at, profiles(display_name, avatar_url), races(name, grade)", { count: "exact" })
    .order("created_at", { ascending: false }).range(offset, offset + limit - 1);

  if (filter === "reported") {
    const { data: rIds } = await adminClient.from("comment_reports").select("comment_id").eq("status", "pending");
    const ids = rIds?.map((r) => r.comment_id) ?? [];
    if (ids.length === 0) return NextResponse.json({ comments: [], total: 0, reports: {} });
    query = query.in("id", ids);
  } else if (filter === "hidden") { query = query.eq("is_hidden", true); }
  else if (filter === "deleted") { query = query.eq("is_deleted", true); }

  const { data: comments, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const cIds = comments?.map((c) => c.id) ?? [];
  let reportMap: Record<string, any[]> = {};
  if (cIds.length > 0) {
    const { data: reports } = await adminClient.from("comment_reports")
      .select("comment_id, reason, detail, status, created_at").in("comment_id", cIds).order("created_at", { ascending: false });
    (reports ?? []).forEach((r) => { if (!reportMap[r.comment_id]) reportMap[r.comment_id] = []; reportMap[r.comment_id].push(r); });
  }
  return NextResponse.json({ comments: comments ?? [], total: count ?? 0, reports: reportMap });
}

export async function PATCH(request: Request) {
  try { await requireAdmin(); } catch (res) { return res as Response; }
  const { comment_id, action, admin_note } = await request.json();
  if (!comment_id || !action) return NextResponse.json({ error: "パラメータ不足" }, { status: 400 });
  const ac = createAdminClient();
  if (action === "hide") await ac.from("comments").update({ is_hidden: true }).eq("id", comment_id);
  else if (action === "unhide") await ac.from("comments").update({ is_hidden: false }).eq("id", comment_id);
  else if (action === "delete") await ac.from("comments").update({ is_deleted: true, body: "（管理者により削除されました）" }).eq("id", comment_id);
  else if (action === "resolve_reports") await ac.from("comment_reports").update({ status: "resolved", admin_note: admin_note ?? null, resolved_at: new Date().toISOString() }).eq("comment_id", comment_id).eq("status", "pending");
  else if (action === "dismiss_reports") await ac.from("comment_reports").update({ status: "dismissed", admin_note: admin_note ?? null, resolved_at: new Date().toISOString() }).eq("comment_id", comment_id).eq("status", "pending");
  else return NextResponse.json({ error: "不正なアクション" }, { status: 400 });
  return NextResponse.json({ success: true });
}
EOF
echo "  ✅ src/app/api/admin/comments/route.ts"

cat > src/components/admin/AdminComments.tsx << 'EOF'
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type Comment = { id: string; user_id: string; race_id: string; body: string; is_deleted: boolean; is_hidden: boolean; edited_at: string | null; created_at: string; profiles: { display_name: string } | null; races: { name: string; grade: string | null } | null; };
type Report = { reason: string; detail: string | null; status: string; };
const RL: Record<string, string> = { spam: "🚫スパム", harassment: "😠誹謗中傷", inappropriate: "⚠️不適切", misinformation: "❌誤情報", other: "📝その他" };

export default function AdminComments() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [reports, setReports] = useState<Record<string, Report[]>>({});
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState("reported");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => { setLoading(true); const r = await fetch(`/api/admin/comments?filter=${filter}&page=${page}`); if(r.ok){const d=await r.json();setComments(d.comments);setReports(d.reports);setTotal(d.total);} setLoading(false); };
  useEffect(() => { load(); }, [filter, page]);

  const act = async (id: string, action: string) => { setBusy(id); await fetch("/api/admin/comments", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ comment_id: id, action }) }); await load(); setBusy(null); };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {[{k:"all",l:"全て"},{k:"reported",l:"🚨 通報あり"},{k:"hidden",l:"👁 非表示"},{k:"deleted",l:"🗑 削除済み"}].map(f=>(
          <button key={f.k} onClick={()=>{setFilter(f.k);setPage(1);}} className={`px-3 py-1.5 text-xs font-bold rounded-lg ${filter===f.k?"bg-green-600 text-white":"bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>{f.l}</button>
        ))}
        <span className="text-xs text-gray-400 self-center ml-2">{total}件</span>
      </div>
      {loading?<div className="text-center py-8 text-gray-400">読み込み中...</div>:comments.length===0?<div className="text-center py-8 text-gray-400">該当なし</div>:(
        <div className="space-y-3">{comments.map(c=>{const cr=reports[c.id]??[];const isL=busy===c.id;return(
          <div key={c.id} className={`border rounded-xl p-4 ${c.is_deleted?"bg-red-50 border-red-200":c.is_hidden?"bg-yellow-50 border-yellow-200":cr.length>0?"bg-orange-50 border-orange-200":"bg-white border-gray-200"}`}>
            <div className="flex items-center gap-2 mb-2 text-xs text-gray-500">
              <Link href={`/users/${c.user_id}`} className="font-bold text-gray-800 hover:text-green-600">{c.profiles?.display_name??"匿名"}</Link>
              <span>→</span>
              <Link href={`/races/${c.race_id}`} className="hover:text-green-600">{c.races?.name??"不明"}</Link>
              <span className="ml-auto">{new Date(c.created_at).toLocaleString("ja-JP")}</span>
            </div>
            <p className="text-sm text-gray-700 mb-2 whitespace-pre-wrap">{c.body}</p>
            <div className="flex items-center gap-2 mb-2">
              {c.is_deleted&&<span className="text-xs bg-red-200 text-red-700 px-2 py-0.5 rounded">削除済</span>}
              {c.is_hidden&&<span className="text-xs bg-yellow-200 text-yellow-700 px-2 py-0.5 rounded">非表示</span>}
              {cr.length>0&&<span className="text-xs bg-orange-200 text-orange-700 px-2 py-0.5 rounded">通報{cr.length}件</span>}
            </div>
            {cr.length>0&&<div className="bg-white/50 rounded-lg p-3 mb-3 space-y-1">{cr.map((r,i)=>(<div key={i} className="flex gap-2 text-xs"><span>{RL[r.reason]??r.reason}</span>{r.detail&&<span className="text-gray-400 truncate">「{r.detail}」</span>}<span className={`ml-auto ${r.status==="pending"?"text-orange-600":"text-gray-400"}`}>{r.status==="pending"?"未対応":"済"}</span></div>))}</div>}
            <div className="flex gap-2 flex-wrap">
              {!c.is_hidden&&!c.is_deleted&&<button onClick={()=>act(c.id,"hide")} disabled={isL} className="px-3 py-1 text-xs font-bold bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 disabled:opacity-50">👁非表示</button>}
              {c.is_hidden&&<button onClick={()=>act(c.id,"unhide")} disabled={isL} className="px-3 py-1 text-xs font-bold bg-green-100 text-green-700 rounded-lg hover:bg-green-200 disabled:opacity-50">✅復元</button>}
              {!c.is_deleted&&<button onClick={()=>{if(confirm("削除しますか？"))act(c.id,"delete")}} disabled={isL} className="px-3 py-1 text-xs font-bold bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50">🗑削除</button>}
              {cr.some(r=>r.status==="pending")&&<><button onClick={()=>act(c.id,"resolve_reports")} disabled={isL} className="px-3 py-1 text-xs font-bold bg-blue-100 text-blue-700 rounded-lg disabled:opacity-50">✅対応済</button><button onClick={()=>act(c.id,"dismiss_reports")} disabled={isL} className="px-3 py-1 text-xs font-bold bg-gray-100 text-gray-600 rounded-lg disabled:opacity-50">❌却下</button></>}
            </div>
          </div>);})}</div>
      )}
      {total>30&&<div className="flex justify-center gap-2"><button onClick={()=>setPage(Math.max(1,page-1))} disabled={page===1} className="px-3 py-1.5 text-xs bg-gray-100 rounded-lg disabled:opacity-50">←前</button><span className="text-xs text-gray-500 self-center">{page}/{Math.ceil(total/30)}</span><button onClick={()=>setPage(page+1)} disabled={page*30>=total} className="px-3 py-1.5 text-xs bg-gray-100 rounded-lg disabled:opacity-50">次→</button></div>}
    </div>
  );
}
EOF
echo "  ✅ src/components/admin/AdminComments.tsx"

# AdminTabs全置換
cat > src/components/admin/AdminTabs.tsx << 'EOF'
"use client";
import { useRouter, useSearchParams } from "next/navigation";

const TABS = [
  { key: "scrape", label: "📥 レース取得", description: "netkeibaから一括取得" },
  { key: "create", label: "➕ レース登録", description: "手動で登録" },
  { key: "results", label: "🏁 結果入力", description: "レース結果を入力" },
  { key: "list", label: "📋 レース一覧", description: "登録済みレース" },
  { key: "inquiries", label: "📩 お問い合わせ", description: "問い合わせ管理" },
  { key: "comments", label: "💬 コメント管理", description: "通報・非表示対応" },
];

export default function AdminTabs() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab") || "scrape";
  return (
    <div className="flex border-b border-gray-200 bg-white rounded-t-xl overflow-x-auto">
      {TABS.map((tab) => (
        <button key={tab.key} onClick={() => router.push(`/admin?tab=${tab.key}`)}
          className={`flex-1 min-w-[120px] py-3 px-4 text-sm font-bold transition-colors relative whitespace-nowrap ${currentTab === tab.key ? "text-green-600 bg-green-50" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"}`}>
          <div>{tab.label}</div>
          <div className="text-[10px] font-normal text-gray-400 mt-0.5">{tab.description}</div>
          {currentTab === tab.key && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-600" />}
        </button>
      ))}
    </div>
  );
}
EOF
echo "  ✅ src/components/admin/AdminTabs.tsx"

# admin/page.tsx にコメント管理タブ追加
if ! grep -q "AdminComments" 'src/app/(main)/admin/page.tsx'; then
  sed -i '' 's|import AdminInquiries from "@/components/admin/AdminInquiries";|import AdminInquiries from "@/components/admin/AdminInquiries";\nimport AdminComments from "@/components/admin/AdminComments";|' 'src/app/(main)/admin/page.tsx'
  sed -i '' '/currentTab === "inquiries"/a\
\
        {/* 💬 コメント管理タブ */}\
        {currentTab === "comments" \&\& <AdminComments />}
' 'src/app/(main)/admin/page.tsx'
  echo "  ✅ src/app/(main)/admin/page.tsx (コメント管理タブ追加)"
else
  echo "  ⏭  admin/page.tsx 既にAdminComments有り"
fi

# ============================================================
# #68: ユーザー検索
# ============================================================
echo "━━━ #68 ユーザー検索 ━━━"

mkdir -p src/app/api/users/search
cat > src/app/api/users/search/route.ts << 'EOF'
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/admin";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  const rl = rateLimit(`user-search:${user.id}`, { limit: 30, windowMs: 60_000 });
  if (!rl.ok) return rateLimitResponse();
  const q = new URL(request.url).searchParams.get("q")?.trim();
  if (!q || q.length < 1) return NextResponse.json({ users: [] });
  if (q.length > 50) return NextResponse.json({ error: "検索文字列が長すぎます" }, { status: 400 });
  const { data: users, error } = await createAdminClient().from("profiles")
    .select("id, display_name, avatar_url, rank_id, cumulative_points, total_votes")
    .ilike("display_name", `%${q}%`).order("cumulative_points", { ascending: false }).limit(20);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ users: users ?? [] });
}
EOF
echo "  ✅ src/app/api/users/search/route.ts"

mkdir -p 'src/app/(main)/users'
cat > 'src/app/(main)/users/page.tsx' << 'EOF'
"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { getRank } from "@/lib/constants/ranks";

type User = { id: string; display_name: string; avatar_url: string | null; rank_id: string; cumulative_points: number; total_votes: number; };

export default function UserSearchPage() {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setUsers([]); setSearched(false); return; }
    setLoading(true); setSearched(true);
    try { const r = await fetch(`/api/users/search?q=${encodeURIComponent(q.trim())}`); if(r.ok){setUsers((await r.json()).users);} } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { const t = setTimeout(() => search(query), 300); return () => clearTimeout(t); }, [query, search]);

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h1 className="text-xl font-bold text-gray-800">🔍 ユーザー検索</h1>
      <div className="relative">
        <input type="text" value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="ユーザー名で検索..." autoFocus
          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent" />
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
      </div>
      {loading?<div className="text-center py-8 text-gray-400 text-sm">検索中...</div>
      :users.length>0?(
        <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
          {users.map(u=>{const rank=getRank(u.rank_id);return(
            <Link key={u.id} href={`/users/${u.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
              {u.avatar_url?<Image width={40} height={40} src={u.avatar_url} alt="" className="w-10 h-10 rounded-full" unoptimized/>:<div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-lg">🏇</div>}
              <div className="flex-1 min-w-0"><div className="text-sm font-bold text-gray-800 truncate">{u.display_name}</div><div className="flex items-center gap-2 text-xs text-gray-500"><span>{rank.icon} {rank.name}</span><span className="font-bold text-green-600">{u.cumulative_points.toLocaleString()} P</span></div></div>
              <span className="text-gray-300 text-sm">›</span>
            </Link>);})}
        </div>
      ):searched&&!loading?<div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-400 text-sm"><div className="text-3xl mb-2">🔍</div>該当するユーザーが見つかりません</div>
      :<div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-400 text-sm"><div className="text-3xl mb-2">👥</div>ユーザー名を入力して検索してください</div>}
    </div>
  );
}
EOF
echo "  ✅ src/app/(main)/users/page.tsx"

if ! grep -q '"/users"' src/components/layout/Header.tsx; then
  sed -i '' 's|<NavLink href="/timeline">TL</NavLink>|<NavLink href="/timeline">TL</NavLink>\
          <NavLink href="/users">検索</NavLink>|' src/components/layout/Header.tsx
  echo "  ✅ src/components/layout/Header.tsx (検索リンク追加)"
else
  echo "  ⏭  Header.tsx 既に/usersリンク有り"
fi

# ============================================================
# #69: レースカレンダー
# ============================================================
echo "━━━ #69 レースカレンダー ━━━"

mkdir -p src/app/api/races/calendar
cat > src/app/api/races/calendar/route.ts << 'EOF'
import { createAdminClient } from "@/lib/admin";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const year = parseInt(searchParams.get("year") ?? new Date().getFullYear().toString());
  const month = parseInt(searchParams.get("month") ?? (new Date().getMonth() + 1).toString());
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, "0")}-01`;

  const { data: races, error } = await createAdminClient().from("races")
    .select("id, name, race_date, post_time, course_name, grade, race_number, status, head_count")
    .gte("race_date", startDate).lt("race_date", endDate).order("race_date").order("race_number");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const grouped: Record<string, any[]> = {};
  (races ?? []).forEach((r) => { if (!grouped[r.race_date]) grouped[r.race_date] = []; grouped[r.race_date].push(r); });
  return NextResponse.json({ races: grouped, year, month });
}
EOF
echo "  ✅ src/app/api/races/calendar/route.ts"

cat > src/components/races/RaceCalendar.tsx << 'EOF'
"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

type Race = { id: string; name: string; race_date: string; course_name: string; grade: string | null; race_number: number; status: string; };
const WD = ["日","月","火","水","木","金","土"];
const GS: Record<string, string> = { G1: "bg-yellow-100 text-yellow-800 border-yellow-300", G2: "bg-red-100 text-red-700 border-red-300", G3: "bg-green-100 text-green-700 border-green-300" };

export default function RaceCalendar() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [rbd, setRbd] = useState<Record<string, Race[]>>({});
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState<string | null>(null);

  useEffect(() => { (async () => { setLoading(true); const r = await fetch(`/api/races/calendar?year=${year}&month=${month}`); if(r.ok) setRbd((await r.json()).races); setLoading(false); })(); }, [year, month]);

  const prev = () => { if(month===1){setYear(year-1);setMonth(12);}else setMonth(month-1); setSel(null); };
  const next = () => { if(month===12){setYear(year+1);setMonth(1);}else setMonth(month+1); setSel(null); };
  const fd = new Date(year, month-1, 1).getDay();
  const dim = new Date(year, month, 0).getDate();
  const cells: (number|null)[] = []; for(let i=0;i<fd;i++) cells.push(null); for(let i=1;i<=dim;i++) cells.push(i);
  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-4 py-3">
        <button onClick={prev} className="text-gray-500 hover:text-green-600 font-bold text-lg px-2">←</button>
        <h2 className="text-lg font-black text-gray-800">{year}年{month}月</h2>
        <button onClick={next} className="text-gray-500 hover:text-green-600 font-bold text-lg px-2">→</button>
      </div>
      {loading?<div className="text-center py-12 text-gray-400">読み込み中...</div>:<>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="grid grid-cols-7 border-b border-gray-200">{WD.map((w,i)=>(<div key={w} className={`py-2 text-center text-xs font-bold ${i===0?"text-red-500":i===6?"text-blue-500":"text-gray-500"}`}>{w}</div>))}</div>
          <div className="grid grid-cols-7">{cells.map((day,i)=>{
            if(day===null) return <div key={`e-${i}`} className="min-h-[72px] border-b border-r border-gray-50"/>;
            const ds=`${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
            const dr=rbd[ds]??[];const isT=ds===today;const isS=ds===sel;const dow=new Date(year,month-1,day).getDay();
            return(<button key={day} onClick={()=>setSel(isS?null:ds)} className={`min-h-[72px] p-1 border-b border-r border-gray-50 text-left transition-colors ${isS?"bg-green-50 ring-2 ring-green-400 ring-inset":isT?"bg-blue-50":"hover:bg-gray-50"}`}>
              <div className={`text-xs font-bold mb-1 ${dow===0?"text-red-500":dow===6?"text-blue-500":"text-gray-600"} ${isT?"bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center":""}`}>{day}</div>
              {dr.length>0&&<div className="space-y-0.5">
                {dr.filter(r=>r.grade).map(r=>(<div key={r.id} className={`text-[9px] font-bold px-1 py-0.5 rounded truncate border ${GS[r.grade!]??"bg-gray-100 text-gray-600 border-gray-200"}`}>{r.grade} {r.name}</div>))}
                <div className="text-[9px] text-gray-400">{[...new Set(dr.map(r=>r.course_name))].join("・")}（{dr.length}R）</div>
              </div>}
            </button>);
          })}</div>
        </div>
        {sel&&<div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-bold text-gray-800 mb-3">📅 {new Date(sel+"T00:00:00+09:00").toLocaleDateString("ja-JP",{month:"long",day:"numeric",weekday:"short"})}</h3>
          {(rbd[sel]??[]).length===0?<p className="text-sm text-gray-400">この日のレースはありません</p>:
          <div className="space-y-2">{(rbd[sel]??[]).map(r=>(
            <Link key={r.id} href={`/races/${r.id}`} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors border border-gray-100">
              <span className="text-xs text-gray-500 w-8 shrink-0">{r.race_number}R</span>
              {r.grade&&<span className={`text-xs font-bold px-1.5 py-0.5 rounded shrink-0 ${r.grade==="G1"?"bg-yellow-100 text-yellow-800":r.grade==="G2"?"bg-red-100 text-red-700":"bg-green-100 text-green-700"}`}>{r.grade}</span>}
              <span className="text-sm font-bold text-gray-800 flex-1 truncate">{r.name}</span>
              <span className="text-xs text-gray-500 shrink-0">{r.course_name}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${r.status==="voting_open"?"bg-green-100 text-green-700":r.status==="finished"?"bg-gray-100 text-gray-500":"bg-yellow-100 text-yellow-700"}`}>{r.status==="voting_open"?"投票受付中":r.status==="finished"?"確定":r.status}</span>
            </Link>))}</div>}
        </div>}
      </>}
    </div>
  );
}
EOF
echo "  ✅ src/components/races/RaceCalendar.tsx"

mkdir -p 'src/app/(main)/races/calendar'
cat > 'src/app/(main)/races/calendar/page.tsx' << 'EOF'
import RaceCalendar from "@/components/races/RaceCalendar";
import Link from "next/link";

export const metadata = { title: "レースカレンダー | ゲートイン！", description: "月間のレーススケジュールを一覧表示" };

export default function RaceCalendarPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">📅 レースカレンダー</h1>
        <Link href="/races" className="text-sm text-green-600 hover:text-green-700 font-bold">一覧に戻る →</Link>
      </div>
      <RaceCalendar />
    </div>
  );
}
EOF
echo "  ✅ src/app/(main)/races/calendar/page.tsx"

if ! grep -q '"/races/calendar"' 'src/app/(main)/races/page.tsx'; then
  sed -i '' 's|<h1 className="text-xl font-bold text-gray-800">🏇 レース一覧</h1>|<div className="flex items-center justify-between"><h1 className="text-xl font-bold text-gray-800">🏇 レース一覧</h1><a href="/races/calendar" className="text-sm text-green-600 hover:text-green-700 font-bold bg-green-50 px-3 py-1.5 rounded-lg border border-green-200">📅 カレンダー</a></div>|' 'src/app/(main)/races/page.tsx'
  echo "  ✅ src/app/(main)/races/page.tsx (カレンダーリンク追加)"
else
  echo "  ⏭  races/page.tsx 既にカレンダーリンク有り"
fi

# ============================================================
# #70: ヘルスチェックAPI
# ============================================================
echo "━━━ #70 ヘルスチェックAPI ━━━"

mkdir -p src/app/api/health
cat > src/app/api/health/route.ts << 'EOF'
import { createAdminClient } from "@/lib/admin";
import { NextResponse } from "next/server";

export async function GET() {
  const timestamp = new Date().toISOString();
  const checks: Record<string, { status: string; latency_ms?: number; error?: string }> = {};
  try {
    const start = Date.now();
    const { error } = await createAdminClient().from("races").select("id", { count: "exact", head: true }).limit(1);
    const latency = Date.now() - start;
    checks.database = error ? { status: "error", error: error.message, latency_ms: latency } : { status: "ok", latency_ms: latency };
  } catch (e) { checks.database = { status: "error", error: String(e) }; }
  checks.app = { status: "ok" };
  const allOk = Object.values(checks).every((c) => c.status === "ok");
  return NextResponse.json({ status: allOk ? "ok" : "degraded", timestamp, checks }, { status: allOk ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
EOF
echo "  ✅ src/app/api/health/route.ts"

# ============================================================
# #71: DBバックアップ戦略ドキュメント
# ============================================================
echo "━━━ #71 DBバックアップ戦略 ━━━"
mkdir -p docs
cat > docs/DB_BACKUP.md << 'EOF'
# DBバックアップ戦略

## Supabase Pro プラン: 毎日自動バックアップ / 7日保持 / PITR対応
## 手動: pg_dump "$SUPABASE_DB_URL" --format=custom --file=backup_$(date +%Y%m%d).dump
## 復元: pg_restore --dbname="$TARGET_DB_URL" --no-owner --clean backup.dump

## チェックリスト
- [ ] Pro プラン有効化
- [ ] PITR 有効化確認
- [ ] 復元テスト実施
EOF
echo "  ✅ docs/DB_BACKUP.md"

# ============================================================
# #72: ステージング環境
# ============================================================
echo "━━━ #72 ステージング環境 ━━━"
cat > docs/STAGING_ENVIRONMENT.md << 'EOF'
# ステージング環境

## ブランチ: main→本番 / develop→Preview / feature/*→PR Preview
## Vercel環境変数: Production と Preview で SUPABASE接続先を分離
## NEXT_PUBLIC_ENV=preview をPreview環境に設定

## チェックリスト
- [ ] develop ブランチ作成
- [ ] ステージング用 Supabase プロジェクト作成
- [ ] Vercel Preview 環境変数設定
- [ ] main Branch Protection 設定
EOF
echo "  ✅ docs/STAGING_ENVIRONMENT.md"

cat > src/components/layout/StagingBanner.tsx << 'EOF'
"use client";
export default function StagingBanner() {
  const env = process.env.NEXT_PUBLIC_ENV;
  if (env === "production" || !env) return null;
  return (<div className="bg-orange-500 text-white text-center text-xs font-bold py-1 px-4 z-[100] relative">⚠️ ステージング環境 — 本番ではありません</div>);
}
EOF
echo "  ✅ src/components/layout/StagingBanner.tsx"

if ! grep -q "StagingBanner" src/app/layout.tsx; then
  sed -i '' '1,/^import/{/^import/a\
import StagingBanner from "@/components/layout/StagingBanner";
}' src/app/layout.tsx
  sed -i '' '/<body/a\
        <StagingBanner />
' src/app/layout.tsx
  echo "  ✅ src/app/layout.tsx (StagingBanner追加)"
else
  echo "  ⏭  layout.tsx 既にStagingBanner有り"
fi

# ============================================================
echo ""
echo "=================================================="
echo "🏁 Phase I 全ファイル配置完了!"
echo "=================================================="
echo ""
echo "📋 次のステップ:"
echo "  1. npm run build"
echo "  2. エラーがあれば貼ってください"
echo "  3. ビルド成功後:"
echo "     git add -A && git commit -m 'feat: Phase I コミュニティ安全性・運用品質' && git push"
