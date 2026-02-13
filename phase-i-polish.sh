#!/bin/bash
set -e

echo "=================================================="
echo "🏇 ゲートイン！ Phase I-polish: 4つの改善"
echo "  ① TL投票表示 ② 通知整理 ③ 大会停止 ④ KPIダッシュボード"
echo "=================================================="
echo ""

# ============================================================
# ① タイムラインに投票内容を表示
# ============================================================
echo "━━━ ① タイムラインに投票内容を表示 ━━━"

# Timeline API 全置換（pending含む + picks取得）
cat > src/app/api/timeline/route.ts << 'EOF'
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/admin";
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

  const admin = createAdminClient();

  let voteItems: any[] = [];
  if (filter === "all" || filter === "vote") {
    // settled votes（結果確定済み）
    let settledQ = admin.from("votes")
      .select("id, user_id, race_id, status, earned_points, is_perfect, settled_at, created_at, profiles(display_name, avatar_url, rank_id), races(name, grade, course_name), vote_picks(pick_type, race_entries(post_number, horses(name)))")
      .in("user_id", targetIds).neq("status", "pending")
      .order("settled_at", { ascending: false }).limit(limit);
    if (cursor) settledQ = settledQ.lt("settled_at", cursor);
    const { data: settled } = await settledQ;

    const settledItems = (settled ?? []).map((v: any) => ({
      type: "vote_result", id: `vote-${v.id}`, user: v.profiles, user_id: v.user_id,
      race: v.races, race_id: v.race_id, earned_points: v.earned_points,
      is_perfect: v.is_perfect, status: v.status,
      picks: formatPicks(v.vote_picks),
      timestamp: v.settled_at ?? v.created_at,
    }));

    // pending votes（投票直後）
    let pendingQ = admin.from("votes")
      .select("id, user_id, race_id, status, created_at, profiles(display_name, avatar_url, rank_id), races(name, grade, course_name), vote_picks(pick_type, race_entries(post_number, horses(name)))")
      .in("user_id", targetIds).eq("status", "pending")
      .order("created_at", { ascending: false }).limit(limit);
    if (cursor) pendingQ = pendingQ.lt("created_at", cursor);
    const { data: pending } = await pendingQ;

    const pendingItems = (pending ?? []).map((v: any) => ({
      type: "vote_submitted", id: `voted-${v.id}`, user: v.profiles, user_id: v.user_id,
      race: v.races, race_id: v.race_id,
      picks: formatPicks(v.vote_picks),
      timestamp: v.created_at,
    }));

    voteItems = [...settledItems, ...pendingItems];
  }

  let commentItems: any[] = [];
  if (filter === "all" || filter === "comment") {
    let q = supabase.from("comments")
      .select("id, user_id, race_id, body, sentiment, created_at, profiles(display_name, avatar_url, rank_id), races(name, grade, course_name)")
      .in("user_id", targetIds).is("parent_id", null).eq("is_deleted", false)
      .order("created_at", { ascending: false }).limit(limit);
    if (cursor) q = q.lt("created_at", cursor);
    const { data } = await q;
    commentItems = (data ?? []).map((c) => ({
      type: "comment", id: `comment-${c.id}`, comment_id: c.id, user: c.profiles,
      user_id: c.user_id, race: c.races, race_id: c.race_id, body: c.body,
      sentiment: c.sentiment, timestamp: c.created_at,
    }));
  }

  const allItems = [...voteItems, ...commentItems]
    .filter((item) => !blockedIds.has(item.user_id))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);

  const newCursor = allItems.length === limit ? allItems[allItems.length - 1].timestamp : null;
  return NextResponse.json({ items: allItems, next_cursor: newCursor });
}

function formatPicks(votePicks: any[]): { pick_type: string; post_number: number; horse_name: string }[] {
  if (!votePicks) return [];
  return votePicks
    .map((p: any) => ({
      pick_type: p.pick_type,
      post_number: (p.race_entries as any)?.post_number ?? 0,
      horse_name: (p.race_entries as any)?.horses?.name ?? "不明",
    }))
    .sort((a: any, b: any) => {
      const order: Record<string, number> = { win: 0, place: 1, danger: 2 };
      return (order[a.pick_type] ?? 9) - (order[b.pick_type] ?? 9);
    });
}
EOF
echo "  ✅ src/app/api/timeline/route.ts (投票内容表示対応)"

# TimelineItem 全置換（vote_submitted追加）
cat > src/components/social/TimelineItem.tsx << 'EOF'
"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { getRank } from "@/lib/constants/ranks";

type Pick = { pick_type: string; post_number: number; horse_name: string };

type Props = {
  item: {
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
  danger: { mark: "△", bg: "bg-gray-200", text: "text-gray-700" },
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
          </div>
          {item.picks && item.picks.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {item.picks.map((pick, i) => {
                const style = PICK_STYLE[pick.pick_type] ?? PICK_STYLE.win;
                return (
                  <span key={i} className={`${style.bg} ${style.text} text-xs px-2 py-1 rounded-full font-medium`}>
                    {style.mark} {pick.post_number} {pick.horse_name}
                  </span>
                );
              })}
            </div>
          )}
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
          </div>
          <div className="flex items-center gap-2 mb-2">
            {(item.earned_points ?? 0) > 0 && <span className="text-sm font-bold text-green-600">+{item.earned_points} P</span>}
            {item.is_perfect && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">💎 完全的中</span>}
            {!isHit && <span className="text-xs text-gray-400">ハズレ</span>}
          </div>
          {item.picks && item.picks.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {item.picks.map((pick, i) => {
                const style = PICK_STYLE[pick.pick_type] ?? PICK_STYLE.win;
                return (
                  <span key={i} className={`${style.bg} ${style.text} text-xs px-2 py-1 rounded-full font-medium`}>
                    {style.mark} {pick.post_number} {pick.horse_name}
                  </span>
                );
              })}
            </div>
          )}
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
EOF
echo "  ✅ src/components/social/TimelineItem.tsx (投票内容表示)"

# ============================================================
# ② 通知の整理（フォロー・リアクション・返信通知を追加）
# ============================================================
echo "━━━ ② 通知の整理 ━━━"

# 通知ヘルパー作成
cat > src/lib/notify.ts << 'EOF'
import { createAdminClient } from "@/lib/admin";

type NotifyParams = {
  userId: string;
  type: string;
  title: string;
  body: string;
  link?: string;
};

/**
 * 通知を作成（通知設定を尊重）
 */
export async function createNotification({ userId, type, title, body, link }: NotifyParams) {
  const admin = createAdminClient();

  // 通知設定を確認
  const { data: settings } = await admin
    .from("notification_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  // 設定が存在する場合、該当タイプがOFFなら通知しない
  if (settings) {
    const settingMap: Record<string, string> = {
      follow: "follow_notify",
      reaction: "reaction_notify",
      reply: "reply_notify",
      vote_result: "vote_result_notify",
      rank_up: "rank_up_notify",
      contest: "contest_notify",
      comment_reported: "system_notify",
      system: "system_notify",
    };
    const col = settingMap[type];
    if (col && settings[col] === false) return;
  }

  await admin.from("notifications").insert({
    user_id: userId,
    type,
    title,
    body,
    link: link ?? null,
    is_read: false,
  });
}
EOF
echo "  ✅ src/lib/notify.ts (通知ヘルパー)"

# フォローAPIにフォロー通知追加
if ! grep -q "createNotification" src/app/api/follows/route.ts; then
  # import追加
  sed -i '' '1s/^/import { createNotification } from "@\/lib\/notify";\n/' src/app/api/follows/route.ts

  # フォロー成功後に通知を追加（"success: true" の前に）
  sed -i '' '/return NextResponse.json({ success: true, action: "followed" })/i\
\
    // フォロー通知\
    await createNotification({\
      userId: following_id,\
      type: "follow",\
      title: "新しいフォロワー",\
      body: "あなたをフォローしました",\
      link: `/users/${user.id}`,\
    });
' src/app/api/follows/route.ts
  echo "  ✅ src/app/api/follows/route.ts (フォロー通知追加)"
else
  echo "  ⏭  follows/route.ts 既に通知有り"
fi

# リアクションAPIにリアクション通知追加
REACTION_FILE='src/app/api/comments/[commentId]/reactions/route.ts'
if ! grep -q "createNotification" "$REACTION_FILE"; then
  sed -i '' '1s/^/import { createNotification } from "@\/lib\/notify";\n/' "$REACTION_FILE"

  # "added" の処理後に通知追加
  sed -i '' '/return NextResponse.json({ action: "added" })/i\
\
    // リアクション通知（自分自身は除外）\
    if (comment.user_id !== user.id) {\
      const emojiLabel: Record<string, string> = { target: "🎯的中", brain: "🧠なるほど", thumbsup: "👍いいね" };\
      await createNotification({\
        userId: comment.user_id,\
        type: "reaction",\
        title: "リアクション",\
        body: `あなたのコメントに${emojiLabel[emoji_type] ?? emoji_type}がつきました`,\
        link: `/races/${comment.race_id}`,\
      });\
    }
' "$REACTION_FILE"
  echo "  ✅ reactions/route.ts (リアクション通知追加)"
else
  echo "  ⏭  reactions/route.ts 既に通知有り"
fi

# コメントAPI（返信通知追加）
COMMENT_FILE='src/app/api/races/[raceId]/comments/route.ts'
if ! grep -q "createNotification" "$COMMENT_FILE"; then
  sed -i '' '1s/^/import { createNotification } from "@\/lib\/notify";\n/' "$COMMENT_FILE"

  # POST関数の最後、returnの前に返信通知追加
  sed -i '' '/return NextResponse.json(data, { status: 201 });/i\
\
  // 返信通知（parent_idがある場合）\
  if (body.parent_id) {\
    const { data: parentComment } = await supabase\
      .from("comments")\
      .select("user_id, race_id")\
      .eq("id", body.parent_id)\
      .single();\
    if (parentComment && parentComment.user_id !== user.id) {\
      const { createNotification: notify } = await import("@/lib/notify");\
      await notify({\
        userId: parentComment.user_id,\
        type: "reply",\
        title: "コメントに返信",\
        body: `あなたのコメントに返信がありました: ${body.body.trim().slice(0, 50)}`,\
        link: `/races/${raceId}`,\
      });\
    }\
  }
' "$COMMENT_FILE"
  echo "  ✅ comments/route.ts (返信通知追加)"
else
  echo "  ⏭  comments/route.ts 既に通知有り"
fi

# ============================================================
# ③ 大会を「近日開催予定」に変更
# ============================================================
echo "━━━ ③ 大会を近日開催予定に変更 ━━━"

# vercel.json からCron削除
cat > vercel.json << 'EOF'
{
  "crons": []
}
EOF
echo "  ✅ vercel.json (Cron停止)"

# 大会ページ差し替え
cat > 'src/app/(main)/contest/page.tsx' << 'EOF'
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export const metadata = {
  title: "月間大会 | ゲートイン！",
  description: "毎月開催の予想バトル！上位入賞者にはAmazonギフト券をプレゼント",
};

export default async function ContestPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-gray-800">🎪 月間大会</h1>

      {/* メインビジュアル */}
      <div className="bg-gradient-to-br from-purple-600 to-purple-500 rounded-2xl p-8 text-white text-center">
        <div className="text-5xl mb-4">🏆</div>
        <h2 className="text-2xl font-black mb-2">近日開催予定！</h2>
        <p className="text-purple-100 text-sm leading-relaxed">
          毎月開催の予想バトル大会を準備中です。<br />
          上位入賞者にはAmazonギフト券をプレゼント！
        </p>
      </div>

      {/* 大会概要 */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        <h3 className="font-black text-gray-900">📋 大会概要（予定）</h3>
        <div className="grid grid-cols-1 gap-3">
          <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
            <div className="text-sm font-bold text-purple-700 mb-1">🗓 開催期間</div>
            <div className="text-sm text-gray-700">毎月1日 〜 月末</div>
          </div>
          <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
            <div className="text-sm font-bold text-purple-700 mb-1">📊 ルール</div>
            <div className="text-sm text-gray-700">月間の獲得ポイントで順位を競います。一定投票数以上で参加資格を獲得。</div>
          </div>
          <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
            <div className="text-sm font-bold text-yellow-700 mb-1">🎁 賞品（予定）</div>
            <div className="text-sm text-gray-700 space-y-1">
              <div>🥇 1位：Amazonギフト券 ¥10,000</div>
              <div>🥈 2位：Amazonギフト券 ¥5,000</div>
              <div>🥉 3位：Amazonギフト券 ¥3,000</div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="bg-green-50 rounded-2xl border border-green-200 p-6 text-center">
        <p className="text-sm text-gray-700 mb-3">
          大会開催まで、レースの予想で腕を磨いておきましょう！🏇
        </p>
        <Link href="/races"
          className="inline-block bg-green-600 text-white font-bold text-sm px-6 py-3 rounded-xl hover:bg-green-700 transition-colors">
          🗳 レース一覧へ
        </Link>
      </div>
    </div>
  );
}
EOF
echo "  ✅ src/app/(main)/contest/page.tsx (近日開催予定)"

# ============================================================
# ④ 管理者KPIダッシュボード
# ============================================================
echo "━━━ ④ KPIダッシュボード ━━━"

mkdir -p src/app/api/admin/dashboard
cat > src/app/api/admin/dashboard/route.ts << 'EOF'
import { createAdminClient, requireAdmin } from "@/lib/admin";
import { NextResponse } from "next/server";

export async function GET() {
  try { await requireAdmin(); } catch (res) { return res as Response; }
  const admin = createAdminClient();

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const thisMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const lastWeekStart = new Date(now.getTime() - 7 * 86400_000).toISOString();

  // 総ユーザー数
  const { count: totalUsers } = await admin.from("profiles").select("*", { count: "exact", head: true });

  // 今週の新規ユーザー
  const { count: newUsersWeek } = await admin.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", lastWeekStart);

  // 総投票数
  const { count: totalVotes } = await admin.from("votes").select("*", { count: "exact", head: true });

  // 今月の投票数
  const { count: monthlyVotes } = await admin.from("votes").select("*", { count: "exact", head: true }).gte("created_at", thisMonthStart);

  // 今日の投票数
  const { count: todayVotes } = await admin.from("votes").select("*", { count: "exact", head: true }).gte("created_at", todayStart);

  // 今日のアクティブユーザー（投票 or コメントした人）
  const { data: todayVoters } = await admin.from("votes").select("user_id").gte("created_at", todayStart);
  const { data: todayCommenters } = await admin.from("comments").select("user_id").gte("created_at", todayStart).eq("is_deleted", false);
  const activeToday = new Set([
    ...(todayVoters ?? []).map((v) => v.user_id),
    ...(todayCommenters ?? []).map((c) => c.user_id),
  ]).size;

  // 総コメント数
  const { count: totalComments } = await admin.from("comments").select("*", { count: "exact", head: true }).eq("is_deleted", false);

  // 今月のコメント数
  const { count: monthlyComments } = await admin.from("comments").select("*", { count: "exact", head: true }).eq("is_deleted", false).gte("created_at", thisMonthStart);

  // アクティブレース（投票受付中）
  const { count: activeRaces } = await admin.from("races").select("*", { count: "exact", head: true }).eq("status", "voting_open");

  // 総レース数
  const { count: totalRaces } = await admin.from("races").select("*", { count: "exact", head: true });

  // 未対応通報
  const { count: pendingReports } = await admin.from("comment_reports").select("*", { count: "exact", head: true }).eq("status", "pending");

  // 未対応お問い合わせ
  const { count: pendingInquiries } = await admin.from("inquiries").select("*", { count: "exact", head: true }).eq("status", "new");

  // フォロー総数
  const { count: totalFollows } = await admin.from("follows").select("*", { count: "exact", head: true });

  // 日別投票数（直近7日）
  const { data: recentVotes } = await admin.from("votes").select("created_at").gte("created_at", lastWeekStart).order("created_at");
  const dailyVotes: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400_000);
    const key = d.toISOString().split("T")[0];
    dailyVotes[key] = 0;
  }
  (recentVotes ?? []).forEach((v) => {
    const key = v.created_at.split("T")[0];
    if (dailyVotes[key] !== undefined) dailyVotes[key]++;
  });

  return NextResponse.json({
    total_users: totalUsers ?? 0,
    new_users_week: newUsersWeek ?? 0,
    total_votes: totalVotes ?? 0,
    monthly_votes: monthlyVotes ?? 0,
    today_votes: todayVotes ?? 0,
    active_today: activeToday,
    total_comments: totalComments ?? 0,
    monthly_comments: monthlyComments ?? 0,
    active_races: activeRaces ?? 0,
    total_races: totalRaces ?? 0,
    pending_reports: pendingReports ?? 0,
    pending_inquiries: pendingInquiries ?? 0,
    total_follows: totalFollows ?? 0,
    daily_votes: dailyVotes,
  });
}
EOF
echo "  ✅ src/app/api/admin/dashboard/route.ts"

cat > src/components/admin/AdminDashboard.tsx << 'EOF'
"use client";

import { useEffect, useState } from "react";

type DashboardData = {
  total_users: number; new_users_week: number;
  total_votes: number; monthly_votes: number; today_votes: number;
  active_today: number;
  total_comments: number; monthly_comments: number;
  active_races: number; total_races: number;
  pending_reports: number; pending_inquiries: number;
  total_follows: number;
  daily_votes: Record<string, number>;
};

function KPICard({ label, value, sub, icon, color }: {
  label: string; value: number | string; sub?: string; icon: string; color: string;
}) {
  return (
    <div className={`${color} rounded-xl p-4 border`}>
      <div className="text-xs text-gray-500 mb-1">{icon} {label}</div>
      <div className="text-2xl font-black text-gray-900">{typeof value === "number" ? value.toLocaleString() : value}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/dashboard").then((r) => r.json()).then((d) => { setData(d); setLoading(false); });
  }, []);

  if (loading) return <div className="text-center py-12 text-gray-400">読み込み中...</div>;
  if (!data) return <div className="text-center py-12 text-red-400">データ取得に失敗しました</div>;

  const maxDaily = Math.max(...Object.values(data.daily_votes), 1);

  return (
    <div className="space-y-6">
      {/* アラート */}
      {(data.pending_reports > 0 || data.pending_inquiries > 0) && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <span className="text-xl">🚨</span>
          <div className="text-sm">
            {data.pending_reports > 0 && <span className="font-bold text-red-700">未対応通報 {data.pending_reports}件</span>}
            {data.pending_reports > 0 && data.pending_inquiries > 0 && <span className="text-gray-400 mx-2">|</span>}
            {data.pending_inquiries > 0 && <span className="font-bold text-red-700">未対応お問い合わせ {data.pending_inquiries}件</span>}
          </div>
        </div>
      )}

      {/* KPIグリッド */}
      <div>
        <h3 className="font-bold text-gray-800 mb-3">📊 主要KPI</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KPICard icon="👥" label="総ユーザー" value={data.total_users} sub={`今週 +${data.new_users_week}`} color="bg-blue-50 border-blue-200" />
          <KPICard icon="📱" label="今日のDAU" value={data.active_today} color="bg-green-50 border-green-200" />
          <KPICard icon="🗳" label="今日の投票" value={data.today_votes} sub={`今月 ${data.monthly_votes}`} color="bg-purple-50 border-purple-200" />
          <KPICard icon="💬" label="今月コメント" value={data.monthly_comments} sub={`累計 ${data.total_comments.toLocaleString()}`} color="bg-orange-50 border-orange-200" />
        </div>
      </div>

      <div>
        <h3 className="font-bold text-gray-800 mb-3">📈 運用指標</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KPICard icon="🏇" label="受付中レース" value={data.active_races} sub={`全${data.total_races}レース`} color="bg-yellow-50 border-yellow-200" />
          <KPICard icon="🗳" label="累計投票" value={data.total_votes} color="bg-gray-50 border-gray-200" />
          <KPICard icon="🤝" label="フォロー総数" value={data.total_follows} color="bg-pink-50 border-pink-200" />
          <KPICard icon="⚠️" label="未対応タスク" value={data.pending_reports + data.pending_inquiries} color={data.pending_reports + data.pending_inquiries > 0 ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200"} />
        </div>
      </div>

      {/* 直近7日の投票推移 */}
      <div>
        <h3 className="font-bold text-gray-800 mb-3">📅 直近7日間の投票数</h3>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-end gap-2 h-32">
            {Object.entries(data.daily_votes).map(([date, count]) => {
              const height = Math.max((count / maxDaily) * 100, 4);
              const label = new Date(date + "T00:00:00+09:00").toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" });
              const isToday = date === new Date().toISOString().split("T")[0];
              return (
                <div key={date} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-bold text-gray-700">{count}</span>
                  <div className={`w-full rounded-t-lg transition-all ${isToday ? "bg-green-500" : "bg-green-200"}`} style={{ height: `${height}%` }} />
                  <span className={`text-[10px] ${isToday ? "font-bold text-green-600" : "text-gray-400"}`}>{label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
EOF
echo "  ✅ src/components/admin/AdminDashboard.tsx"

# AdminTabs にダッシュボードタブ追加（先頭に）
cat > src/components/admin/AdminTabs.tsx << 'EOF'
"use client";
import { useRouter, useSearchParams } from "next/navigation";

const TABS = [
  { key: "dashboard", label: "📊 ダッシュボード", description: "KPI・運用状況" },
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
  const currentTab = searchParams.get("tab") || "dashboard";
  return (
    <div className="flex border-b border-gray-200 bg-white rounded-t-xl overflow-x-auto">
      {TABS.map((tab) => (
        <button key={tab.key} onClick={() => router.push(`/admin?tab=${tab.key}`)}
          className={`flex-1 min-w-[100px] py-3 px-3 text-sm font-bold transition-colors relative whitespace-nowrap ${currentTab === tab.key ? "text-green-600 bg-green-50" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"}`}>
          <div>{tab.label}</div>
          <div className="text-[10px] font-normal text-gray-400 mt-0.5">{tab.description}</div>
          {currentTab === tab.key && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-600" />}
        </button>
      ))}
    </div>
  );
}
EOF
echo "  ✅ src/components/admin/AdminTabs.tsx (ダッシュボードタブ追加)"

# admin/page.tsx にダッシュボード追加
if ! grep -q "AdminDashboard" 'src/app/(main)/admin/page.tsx'; then
  sed -i '' 's|import AdminComments from "@/components/admin/AdminComments";|import AdminComments from "@/components/admin/AdminComments";\nimport AdminDashboard from "@/components/admin/AdminDashboard";|' 'src/app/(main)/admin/page.tsx'

  # デフォルトタブをdashboardに変更
  sed -i '' 's|const currentTab = searchParams.get("tab") || "scrape"|const currentTab = searchParams.get("tab") || "dashboard"|' 'src/app/(main)/admin/page.tsx'

  # ダッシュボードタブのレンダリング追加
  sed -i '' '/{currentTab === "comments" && <AdminComments \/>}/a\
\
        {/* 📊 ダッシュボードタブ */}\
        {currentTab === "dashboard" && <AdminDashboard />}
' 'src/app/(main)/admin/page.tsx'
  echo "  ✅ src/app/(main)/admin/page.tsx (ダッシュボード追加)"
else
  echo "  ⏭  admin/page.tsx 既にAdminDashboard有り"
fi

# ============================================================
echo ""
echo "=================================================="
echo "🏁 Phase I-polish 全4改善 完了!"
echo "=================================================="
echo ""
echo "📋 次のステップ:"
echo "  1. npm run build"
echo "  2. エラーがあれば貼ってください"
echo "  3. ビルド成功後:"
echo "     git add -A && git commit -m 'feat: TL投票表示・通知整理・大会停止・KPIダッシュボード' && git push"
echo ""
echo "📝 補足:"
echo "  - レース結果自動化（netkeiba結果スクレイピング→ワンクリック承認）は"
echo "    次のステップで実装予定です。"
echo "  - 通知設定テーブルの列名が異なる場合、src/lib/notify.ts の settingMap を調整してください。"
