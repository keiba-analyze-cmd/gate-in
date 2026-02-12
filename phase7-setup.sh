#!/bin/bash
# ============================================
# ゲートイン！ Phase 7 セットアップスクリプト
# プロフィール編集・ポイント履歴・通知
# gate-in フォルダ内で実行してください
# ============================================

echo "🏇 ゲートイン！ Phase 7（マイページ強化）セットアップを開始します..."
echo ""

# ディレクトリ作成
echo "📁 フォルダを作成中..."
mkdir -p src/app/api/profile
mkdir -p src/app/api/notifications
mkdir -p src/app/\(main\)/mypage
mkdir -p src/app/\(main\)/mypage/points
mkdir -p src/app/\(main\)/mypage/edit
mkdir -p src/app/\(main\)/mypage/badges
mkdir -p src/app/\(main\)/notifications
mkdir -p src/components/mypage

# ====== プロフィール更新API ======
echo "📝 src/app/api/profile/route.ts"
cat << 'FILEOF' > src/app/api/profile/route.ts
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const body = await request.json();
  const allowedFields = ["display_name", "bio"];
  const updates: Record<string, any> = {};

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates[field] = body[field];
    }
  }

  if (updates.display_name !== undefined) {
    if (!updates.display_name || updates.display_name.trim().length === 0) {
      return NextResponse.json({ error: "表示名は必須です" }, { status: 400 });
    }
    if (updates.display_name.length > 20) {
      return NextResponse.json({ error: "表示名は20文字以内です" }, { status: 400 });
    }
    updates.display_name = updates.display_name.trim();
  }

  if (updates.bio !== undefined && updates.bio.length > 200) {
    return NextResponse.json({ error: "自己紹介は200文字以内です" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
FILEOF

# ====== 通知API ======
echo "📝 src/app/api/notifications/route.ts"
cat << 'FILEOF' > src/app/api/notifications/route.ts
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const { count: unreadCount } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_read", false);

  return NextResponse.json({
    notifications: notifications ?? [],
    unread_count: unreadCount ?? 0,
  });
}

// 既読にする
export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const body = await request.json();

  if (body.mark_all_read) {
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);
  } else if (body.notification_id) {
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", body.notification_id)
      .eq("user_id", user.id);
  }

  return NextResponse.json({ success: true });
}
FILEOF

# ====== マイページ（トップ）======
echo "📝 src/app/(main)/mypage/page.tsx"
cat << 'FILEOF' > src/app/\(main\)/mypage/page.tsx
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getRank, getNextRank, RANKS } from "@/lib/constants/ranks";
import Link from "next/link";

export default async function MyPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  const rank = getRank(profile.rank_id);
  const nextRank = getNextRank(profile.rank_id);

  const hitRate = profile.total_votes > 0
    ? Math.round((profile.win_hits / profile.total_votes) * 1000) / 10
    : 0;

  const progressToNext = nextRank
    ? Math.min(Math.round(((profile.cumulative_points - rank.threshold) / (nextRank.threshold - rank.threshold)) * 100), 100)
    : 100;

  // フォロー数・フォロワー数
  const { count: followingCount } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("follower_id", user.id);

  const { count: followerCount } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("following_id", user.id);

  // バッジ数
  const { count: badgeCount } = await supabase
    .from("user_badges")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  // 直近のポイント履歴（5件）
  const { data: recentTx } = await supabase
    .from("points_transactions")
    .select("id, amount, description, created_at, races(name, grade)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5);

  // 今月のポイント
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

  const { data: monthlyTx } = await supabase
    .from("points_transactions")
    .select("amount")
    .eq("user_id", user.id)
    .gte("created_at", monthStart);

  const monthlyTotal = monthlyTx?.reduce((sum, t) => sum + t.amount, 0) ?? 0;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* プロフィールカード */}
      <div className="bg-gradient-to-br from-green-600 to-green-500 rounded-2xl p-6 text-white">
        <div className="flex items-start gap-4 mb-4">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-16 h-16 rounded-full border-2 border-white/30" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-2xl">🏇</div>
          )}
          <div className="flex-1">
            <h1 className="text-xl font-bold">{profile.display_name}</h1>
            <div className="flex items-center gap-2 mt-1 text-green-100">
              <span className="text-sm">{rank.icon} {rank.name}</span>
            </div>
            {profile.bio && (
              <p className="text-sm text-green-100 mt-1">{profile.bio}</p>
            )}
          </div>
          <Link
            href="/mypage/edit"
            className="bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
          >
            編集
          </Link>
        </div>

        {/* ランク進捗 */}
        <div className="bg-white/10 rounded-xl p-3 mb-4">
          <div className="flex justify-between text-xs text-green-100 mb-1.5">
            <span>{rank.icon} {rank.name}</span>
            {nextRank ? (
              <span>次: {nextRank.icon} {nextRank.name}（あと{nextRank.threshold - profile.cumulative_points}P）</span>
            ) : (
              <span>🏆 最高ランク達成！</span>
            )}
          </div>
          <div className="h-3 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-500"
              style={{ width: `${progressToNext}%` }}
            />
          </div>
        </div>

        {/* ポイント表示 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold">{profile.cumulative_points.toLocaleString()}</div>
            <div className="text-xs text-green-100">累計ポイント</div>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold">{monthlyTotal.toLocaleString()}</div>
            <div className="text-xs text-green-100">今月のポイント</div>
          </div>
        </div>
      </div>

      {/* 統計グリッド */}
      <div className="grid grid-cols-4 gap-2">
        <StatCard label="投票数" value={profile.total_votes} />
        <StatCard label="的中率" value={`${hitRate}%`} color="text-green-600" />
        <StatCard label="連続的中" value={`🔥${profile.current_streak}`} />
        <StatCard label="最長記録" value={`${profile.best_streak}`} />
      </div>
      <div className="grid grid-cols-4 gap-2">
        <StatCard label="1着的中" value={profile.win_hits} color="text-red-600" />
        <StatCard label="複勝的中" value={profile.place_hits} color="text-blue-600" />
        <StatCard label="フォロー" value={followingCount ?? 0} />
        <StatCard label="フォロワー" value={followerCount ?? 0} />
      </div>

      {/* メニュー */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <MenuItem href="/mypage/points" icon="💰" label="ポイント履歴" desc="獲得ポイントの詳細" />
        <MenuItem href="/mypage/badges" icon="🏅" label="バッジコレクション" desc={`${badgeCount ?? 0}個獲得`} />
        <MenuItem href="/notifications" icon="🔔" label="通知" desc="お知らせ一覧" />
        <MenuItem href="/timeline" icon="📰" label="タイムライン" desc="フォロー中のアクティビティ" />
        <MenuItem href={`/users/${user.id}`} icon="👤" label="公開プロフィール" desc="他の人から見えるページ" />
      </div>

      {/* 最近のポイント履歴 */}
      {recentTx && recentTx.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-800">💰 最近のポイント</h2>
            <Link href="/mypage/points" className="text-xs text-green-600 hover:underline">すべて見る →</Link>
          </div>
          <div className="space-y-2">
            {recentTx.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <span className="text-sm text-gray-700">{tx.description}</span>
                  {(tx.races as any)?.name && (
                    <span className="text-xs text-gray-400 ml-2">{(tx.races as any).name}</span>
                  )}
                </div>
                <span className={`text-sm font-bold ${tx.amount > 0 ? "text-green-600" : "text-red-600"}`}>
                  {tx.amount > 0 ? "+" : ""}{tx.amount}P
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-3 text-center">
      <div className={`text-lg font-bold ${color ?? "text-gray-800"}`}>{value}</div>
      <div className="text-xs text-gray-400">{label}</div>
    </div>
  );
}

function MenuItem({ href, icon, label, desc }: { href: string; icon: string; label: string; desc: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0">
      <span className="text-xl">{icon}</span>
      <div className="flex-1">
        <div className="text-sm font-bold text-gray-800">{label}</div>
        <div className="text-xs text-gray-400">{desc}</div>
      </div>
      <span className="text-gray-300">›</span>
    </Link>
  );
}
FILEOF

# ====== プロフィール編集ページ ======
echo "📝 src/app/(main)/mypage/edit/page.tsx"
cat << 'FILEOF' > src/app/\(main\)/mypage/edit/page.tsx
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ProfileEditForm from "@/components/mypage/ProfileEditForm";

export default async function ProfileEditPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, bio, avatar_url")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <h1 className="text-xl font-bold text-gray-800">✏️ プロフィール編集</h1>
      <ProfileEditForm
        initialName={profile.display_name}
        initialBio={profile.bio ?? ""}
        avatarUrl={profile.avatar_url}
      />
    </div>
  );
}
FILEOF

# ====== ProfileEditForm.tsx ======
echo "📝 src/components/mypage/ProfileEditForm.tsx"
cat << 'FILEOF' > src/components/mypage/ProfileEditForm.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  initialName: string;
  initialBio: string;
  avatarUrl: string | null;
};

export default function ProfileEditForm({ initialName, initialBio, avatarUrl }: Props) {
  const [name, setName] = useState(initialName);
  const [bio, setBio] = useState(initialBio);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

  const handleSave = async () => {
    if (!name.trim()) {
      setMessage("表示名は必須です");
      return;
    }
    setLoading(true);
    setMessage("");

    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ display_name: name.trim(), bio: bio.trim() }),
    });

    if (res.ok) {
      setMessage("✅ 保存しました！");
      setTimeout(() => {
        router.push("/mypage");
        router.refresh();
      }, 1000);
    } else {
      const data = await res.json();
      setMessage("❌ " + (data.error ?? "保存に失敗しました"));
    }
    setLoading(false);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
      {/* アバター */}
      <div className="flex items-center gap-4">
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="w-20 h-20 rounded-full" />
        ) : (
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center text-3xl">🏇</div>
        )}
        <p className="text-xs text-gray-400">
          アバターはログインサービス（Google/X）の画像が使われます
        </p>
      </div>

      {/* 表示名 */}
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-1">表示名 *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={20}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
        />
        <p className="text-xs text-gray-400 mt-1">{name.length}/20文字</p>
      </div>

      {/* 自己紹介 */}
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-1">自己紹介</label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={200}
          rows={3}
          placeholder="自己紹介を書いてみよう..."
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
        />
        <p className="text-xs text-gray-400 mt-1">{bio.length}/200文字</p>
      </div>

      {message && (
        <div className={`text-sm p-3 rounded-lg ${
          message.startsWith("✅") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
        }`}>
          {message}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={() => router.back()}
          className="flex-1 py-3 bg-gray-100 text-gray-600 font-medium rounded-xl hover:bg-gray-200 transition-colors"
        >
          キャンセル
        </button>
        <button
          onClick={handleSave}
          disabled={loading || !name.trim()}
          className="flex-1 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 disabled:opacity-40 transition-colors"
        >
          {loading ? "保存中..." : "保存する"}
        </button>
      </div>
    </div>
  );
}
FILEOF

# ====== ポイント履歴ページ ======
echo "📝 src/app/(main)/mypage/points/page.tsx"
cat << 'FILEOF' > src/app/\(main\)/mypage/points/page.tsx
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function PointsHistoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("cumulative_points, monthly_points")
    .eq("id", user.id)
    .single();

  // 全ポイント履歴
  const { data: transactions } = await supabase
    .from("points_transactions")
    .select("*, races(name, grade, course_name)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  // 月別集計
  const monthlyMap = new Map<string, number>();
  for (const tx of transactions ?? []) {
    const month = new Date(tx.created_at).toLocaleDateString("ja-JP", { year: "numeric", month: "long" });
    monthlyMap.set(month, (monthlyMap.get(month) ?? 0) + tx.amount);
  }

  // 理由別のアイコン
  const reasonIcon = (reason: string): string => {
    if (reason.includes("win")) return "🎯";
    if (reason.includes("place")) return "○";
    if (reason.includes("danger")) return "△";
    if (reason.includes("perfect")) return "💎";
    if (reason.includes("streak")) return "🔥";
    if (reason.includes("g1")) return "🏆";
    return "💰";
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/mypage" className="text-gray-400 hover:text-green-600">← 戻る</Link>
        <h1 className="text-xl font-bold text-gray-800">💰 ポイント履歴</h1>
      </div>

      {/* サマリー */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <div className="text-2xl font-bold text-green-600">
            {profile?.cumulative_points.toLocaleString() ?? 0}
          </div>
          <div className="text-xs text-gray-400">累計ポイント</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">
            {transactions?.length ?? 0}
          </div>
          <div className="text-xs text-gray-400">獲得回数</div>
        </div>
      </div>

      {/* 月別サマリー */}
      {monthlyMap.size > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-bold text-gray-800 mb-3">📅 月別サマリー</h2>
          <div className="space-y-2">
            {[...monthlyMap.entries()].map(([month, total]) => (
              <div key={month} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <span className="text-sm text-gray-600">{month}</span>
                <span className="text-sm font-bold text-green-600">+{total.toLocaleString()} P</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 詳細履歴 */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h2 className="font-bold text-gray-800 mb-3">📋 詳細履歴</h2>
        {transactions && transactions.length > 0 ? (
          <div className="space-y-1">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0">
                <span className="text-lg w-8 text-center">{reasonIcon(tx.reason)}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-700">{tx.description}</div>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    {(tx.races as any)?.name && (
                      <span>{(tx.races as any).grade && `[${(tx.races as any).grade}] `}{(tx.races as any).name}</span>
                    )}
                    <span>{new Date(tx.created_at).toLocaleDateString("ja-JP", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                </div>
                <span className={`text-sm font-bold shrink-0 ${tx.amount > 0 ? "text-green-600" : "text-red-600"}`}>
                  {tx.amount > 0 ? "+" : ""}{tx.amount} P
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400 text-sm">
            まだポイント履歴がありません
          </div>
        )}
      </div>
    </div>
  );
}
FILEOF

# ====== バッジコレクションページ ======
echo "📝 src/app/(main)/mypage/badges/page.tsx"
cat << 'FILEOF' > src/app/\(main\)/mypage/badges/page.tsx
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function BadgesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // 全バッジ
  const { data: allBadges } = await supabase
    .from("badges")
    .select("*")
    .order("id");

  // ユーザーが獲得したバッジ
  const { data: earnedBadges } = await supabase
    .from("user_badges")
    .select("badge_id, earned_at")
    .eq("user_id", user.id);

  const earnedMap = new Map(earnedBadges?.map((b) => [b.badge_id, b.earned_at]) ?? []);

  // カテゴリ別に分類
  const categories: Record<string, typeof allBadges> = {};
  for (const badge of allBadges ?? []) {
    const cat = badge.category ?? "その他";
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(badge);
  }

  const categoryLabels: Record<string, string> = {
    accuracy: "🎯 的中系",
    streak: "🔥 連続系",
    volume: "📊 投票数系",
    grade: "🏆 重賞系",
    social: "💬 ソーシャル系",
    special: "✨ 特別",
  };

  const earnedCount = earnedBadges?.length ?? 0;
  const totalCount = allBadges?.length ?? 0;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/mypage" className="text-gray-400 hover:text-green-600">← 戻る</Link>
        <h1 className="text-xl font-bold text-gray-800">🏅 バッジコレクション</h1>
      </div>

      {/* 進捗 */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold text-gray-700">コンプリート進捗</span>
          <span className="text-sm font-bold text-green-600">{earnedCount} / {totalCount}</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full transition-all"
            style={{ width: `${totalCount > 0 ? (earnedCount / totalCount) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* バッジ一覧 */}
      {Object.entries(categories).map(([category, badges]) => (
        <div key={category} className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-bold text-gray-800 mb-3">
            {categoryLabels[category] ?? category}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {badges?.map((badge) => {
              const isEarned = earnedMap.has(badge.id);
              const earnedAt = earnedMap.get(badge.id);
              return (
                <div
                  key={badge.id}
                  className={`rounded-xl p-4 text-center transition-all ${
                    isEarned
                      ? "bg-yellow-50 border-2 border-yellow-200"
                      : "bg-gray-50 border-2 border-transparent opacity-50"
                  }`}
                >
                  <div className={`text-3xl mb-2 ${isEarned ? "" : "grayscale"}`}>
                    {badge.icon}
                  </div>
                  <div className="text-sm font-bold text-gray-800">{badge.name}</div>
                  <div className="text-xs text-gray-500 mt-1">{badge.description}</div>
                  {isEarned && earnedAt && (
                    <div className="text-xs text-yellow-600 mt-2">
                      ✓ {new Date(earnedAt).toLocaleDateString("ja-JP", { month: "short", day: "numeric" })}獲得
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
FILEOF

# ====== 通知ページ ======
echo "📝 src/app/(main)/notifications/page.tsx"
cat << 'FILEOF' > src/app/\(main\)/notifications/page.tsx
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import NotificationList from "@/components/mypage/NotificationList";

export default async function NotificationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h1 className="text-xl font-bold text-gray-800">🔔 通知</h1>
      <NotificationList />
    </div>
  );
}
FILEOF

# ====== NotificationList.tsx ======
echo "📝 src/components/mypage/NotificationList.tsx"
cat << 'FILEOF' > src/components/mypage/NotificationList.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link_url: string | null;
  is_read: boolean;
  created_at: string;
};

export default function NotificationList() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications);
        setUnreadCount(data.unread_count);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const markAllRead = async () => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mark_all_read: true }),
    });
    setNotifications(notifications.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const typeIcon: Record<string, string> = {
    race_result: "🏇",
    points_earned: "💰",
    badge_earned: "🏅",
    follow: "👤",
    rank_up: "⬆️",
    contest: "🏆",
    system: "📢",
  };

  if (loading) {
    return <div className="bg-white rounded-xl p-8 text-center text-gray-400 text-sm">読み込み中...</div>;
  }

  return (
    <div>
      {unreadCount > 0 && (
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-gray-500">{unreadCount}件の未読</span>
          <button
            onClick={markAllRead}
            className="text-xs text-green-600 hover:underline"
          >
            すべて既読にする
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            通知はまだありません
          </div>
        ) : (
          notifications.map((notif) => {
            const content = (
              <div className={`flex items-start gap-3 px-5 py-4 border-b border-gray-50 last:border-0 transition-colors ${
                !notif.is_read ? "bg-green-50/50" : "hover:bg-gray-50"
              }`}>
                <span className="text-xl mt-0.5">{typeIcon[notif.type] ?? "📌"}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-800">{notif.title}</span>
                    {!notif.is_read && (
                      <span className="w-2 h-2 bg-green-500 rounded-full shrink-0" />
                    )}
                  </div>
                  {notif.body && (
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notif.body}</p>
                  )}
                  <span className="text-xs text-gray-300 mt-1 block">
                    {new Date(notif.created_at).toLocaleDateString("ja-JP", {
                      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            );

            return notif.link_url ? (
              <Link key={notif.id} href={notif.link_url}>{content}</Link>
            ) : (
              <div key={notif.id}>{content}</div>
            );
          })
        )}
      </div>
    </div>
  );
}
FILEOF

# ====== ヘッダー更新（マイページ + 通知） ======
echo "📝 ヘッダーを更新（マイページリンク）"
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

  // 未読通知数
  let unreadCount = 0;
  if (user) {
    const { count } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_read", false);
    unreadCount = count ?? 0;
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

        <div className="flex items-center gap-2">
          {profile && user ? (
            <>
              {/* 通知 */}
              <Link
                href="/notifications"
                className="relative p-2 text-gray-500 hover:text-green-600 transition-colors"
              >
                🔔
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>

              {/* ポイント */}
              <Link
                href="/mypage"
                className="hidden sm:flex items-center gap-2 bg-green-50 px-3 py-1.5 rounded-full hover:bg-green-100 transition-colors"
              >
                <span className="text-xs">{rank?.icon}</span>
                <span className="text-sm font-bold text-green-700">
                  {profile.cumulative_points} P
                </span>
              </Link>

              {/* ユーザー名 */}
              <Link
                href="/mypage"
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

      {/* モバイルナビ */}
      {user && (
        <nav className="md:hidden flex border-t border-gray-100">
          <MobileNavLink href="/">トップ</MobileNavLink>
          <MobileNavLink href="/races">レース</MobileNavLink>
          <MobileNavLink href="/timeline">TL</MobileNavLink>
          <MobileNavLink href="/mypage">マイ</MobileNavLink>
        </nav>
      )}
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
echo "✅ Phase 7 セットアップ完了！"
echo ""
echo "📂 作成されたファイル（10ファイル）:"
echo "  src/app/api/profile/route.ts               ← プロフィール更新API"
echo "  src/app/api/notifications/route.ts          ← 通知API"
echo "  src/app/(main)/mypage/page.tsx              ← マイページトップ"
echo "  src/app/(main)/mypage/edit/page.tsx         ← プロフィール編集"
echo "  src/app/(main)/mypage/points/page.tsx       ← ポイント履歴"
echo "  src/app/(main)/mypage/badges/page.tsx       ← バッジコレクション"
echo "  src/app/(main)/notifications/page.tsx       ← 通知ページ"
echo "  src/components/mypage/ProfileEditForm.tsx    ← 編集フォーム"
echo "  src/components/mypage/NotificationList.tsx   ← 通知リスト"
echo "  src/components/layout/Header.tsx            ← ヘッダー更新"
echo ""
echo "🎮 テスト手順:"
echo "  1. pkill -f 'next dev'; rm -rf .next/dev/lock; npm run dev"
echo ""
echo "  【マイページ】"
echo "  2. ヘッダーのユーザー名/ポイント → マイページ"
echo "  3. ランク進捗バー・統計・メニュー一覧が表示"
echo ""
echo "  【プロフィール編集】"
echo "  4. マイページ「編集」→ 表示名・自己紹介を変更して保存"
echo ""
echo "  【ポイント履歴】"
echo "  5. マイページ → 💰ポイント履歴 → 月別サマリー＋詳細"
echo ""
echo "  【バッジ】"
echo "  6. マイページ → 🏅バッジコレクション"
echo ""
echo "  【通知】"
echo "  7. ヘッダーの🔔 → 通知一覧"
