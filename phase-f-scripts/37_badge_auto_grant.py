#!/usr/bin/env python3
"""
Task #37: バッジ自動付与ロジック
- badges テーブルにマスタデータ INSERT（SQL）
- バッジ判定ユーティリティ src/lib/badges.ts
- 投票精算APIからバッジ判定を呼び出す
- マイページ badges ページを強化
"""

import os, re

# ============================================================
# 1. バッジマスタ SQL マイグレーション
# ============================================================
BADGE_MIGRATION = """\
-- Badge master data + auto-grant function
-- Run in Supabase SQL Editor

-- Ensure badges table has required columns
ALTER TABLE badges ADD COLUMN IF NOT EXISTS condition_type TEXT;
ALTER TABLE badges ADD COLUMN IF NOT EXISTS condition_value INT DEFAULT 0;
ALTER TABLE badges ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'achievement';

-- Upsert badge master data
INSERT INTO badges (id, name, icon, description, condition_type, condition_value, category) VALUES
  ('first_vote',      '初投票',         '🎫', '初めての投票を行った',           'total_votes',    1,   'milestone'),
  ('vote_10',         '常連予想家',      '📋', '10回投票した',                  'total_votes',    10,  'milestone'),
  ('vote_50',         'ベテラン予想家',   '📚', '50回投票した',                  'total_votes',    50,  'milestone'),
  ('vote_100',        '百戦錬磨',        '💯', '100回投票した',                 'total_votes',    100, 'milestone'),
  ('first_win',       '初的中',         '🎯', '初めて1着を的中させた',          'win_hits',       1,   'achievement'),
  ('win_10',          'スナイパー',      '🔫', '1着を10回的中させた',            'win_hits',       10,  'achievement'),
  ('win_50',          '神の目',         '👁', '1着を50回的中させた',            'win_hits',       50,  'achievement'),
  ('perfect_1',       '完全的中',        '💎', '初めてパーフェクトを達成した',     'perfect_count',  1,   'achievement'),
  ('perfect_5',       'パーフェクトマスター','✨', 'パーフェクト5回達成',           'perfect_count',  5,   'achievement'),
  ('streak_3',        '3連続的中',       '🔥', '3連続で的中した',               'current_streak', 3,   'streak'),
  ('streak_5',        '5連続的中',       '🔥🔥', '5連続で的中した',             'best_streak',    5,   'streak'),
  ('streak_10',       '10連続的中',      '🔥🔥🔥', '10連続で的中した',          'best_streak',    10,  'streak'),
  ('rank_forecaster', '予想士昇格',      '⭐', '予想士ランクに到達した',          'rank_tier',      0,   'rank'),
  ('rank_advanced',   '上級予想士昇格',   '⭐⭐', '上級予想士ランクに到達した',    'rank_tier',      0,   'rank'),
  ('rank_master',     'マスター昇格',    '👑', '予想マスターランクに到達した',     'rank_tier',      0,   'rank'),
  ('rank_legend',     'レジェンド',      '🏆', 'レジェンドランクに到達した',       'rank_tier',      0,   'rank'),
  ('big_upset',       '大穴ハンター',    '🦄', '10番人気以下の馬の1着を的中',     'special',        0,   'special'),
  ('g1_winner',       'G1ハンター',     '🏅', 'G1レースで1着を的中した',         'special',        0,   'special'),
  ('monthly_top3',    '月間TOP3',       '🥇', '月間ランキングTOP3に入った',      'special',        0,   'special')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  icon = EXCLUDED.icon,
  description = EXCLUDED.description,
  condition_type = EXCLUDED.condition_type,
  condition_value = EXCLUDED.condition_value,
  category = EXCLUDED.category;
"""

os.makedirs("supabase/migrations", exist_ok=True)
with open("supabase/migrations/add_badge_master.sql", "w") as f:
    f.write(BADGE_MIGRATION)
print("✅ supabase/migrations/add_badge_master.sql")

# ============================================================
# 2. バッジ判定ユーティリティ src/lib/badges.ts
# ============================================================
BADGES_LIB = '''\
import { createAdminClient } from "@/lib/admin";

type ProfileStats = {
  user_id: string;
  total_votes: number;
  win_hits: number;
  place_hits: number;
  current_streak: number;
  best_streak: number;
  rank_id: string;
  cumulative_points: number;
};

/**
 * バッジ自動付与チェック
 * 投票精算後に呼び出し、条件を満たしたバッジを付与する
 */
export async function checkAndGrantBadges(
  userId: string,
  extra?: {
    isPerfect?: boolean;
    isUpset?: boolean;       // 10番人気以下的中
    isG1Win?: boolean;       // G1で1着的中
  }
): Promise<string[]> {
  const admin = createAdminClient();

  // プロフィール取得
  const { data: profile } = await admin
    .from("profiles")
    .select("total_votes, win_hits, place_hits, current_streak, best_streak, rank_id, cumulative_points")
    .eq("id", userId)
    .single();

  if (!profile) return [];

  // 既存バッジ取得
  const { data: existingBadges } = await admin
    .from("user_badges")
    .select("badge_id")
    .eq("user_id", userId);

  const owned = new Set((existingBadges ?? []).map((b) => b.badge_id));

  // パーフェクト回数を集計
  const { count: perfectCount } = await admin
    .from("votes")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_perfect", true);

  // 付与対象を判定
  const toGrant: string[] = [];

  const check = (badgeId: string, condition: boolean) => {
    if (!owned.has(badgeId) && condition) toGrant.push(badgeId);
  };

  // マイルストーン系
  check("first_vote",  profile.total_votes >= 1);
  check("vote_10",     profile.total_votes >= 10);
  check("vote_50",     profile.total_votes >= 50);
  check("vote_100",    profile.total_votes >= 100);

  // 的中系
  check("first_win",   profile.win_hits >= 1);
  check("win_10",      profile.win_hits >= 10);
  check("win_50",      profile.win_hits >= 50);

  // パーフェクト系
  check("perfect_1",   (perfectCount ?? 0) >= 1);
  check("perfect_5",   (perfectCount ?? 0) >= 5);

  // 連続的中系
  check("streak_3",    profile.current_streak >= 3 || profile.best_streak >= 3);
  check("streak_5",    profile.best_streak >= 5);
  check("streak_10",   profile.best_streak >= 10);

  // ランク系
  const rankId = profile.rank_id ?? "";
  check("rank_forecaster", rankId.startsWith("forecaster") || rankId.startsWith("advanced") || rankId.startsWith("master") || rankId === "legend");
  check("rank_advanced",   rankId.startsWith("advanced") || rankId.startsWith("master") || rankId === "legend");
  check("rank_master",     rankId.startsWith("master") || rankId === "legend");
  check("rank_legend",     rankId === "legend");

  // 特殊系
  if (extra?.isUpset)  check("big_upset",  true);
  if (extra?.isG1Win)  check("g1_winner",  true);

  // 一括挿入
  if (toGrant.length > 0) {
    const rows = toGrant.map((badge_id) => ({
      user_id: userId,
      badge_id,
      earned_at: new Date().toISOString(),
    }));
    await admin.from("user_badges").insert(rows);

    // 通知作成
    const { data: badges } = await admin
      .from("badges")
      .select("id, name, icon")
      .in("id", toGrant);

    for (const badge of badges ?? []) {
      await admin.from("notifications").insert({
        user_id: userId,
        type: "badge",
        title: "バッジ獲得！",
        body: `${badge.icon} ${badge.name} を獲得しました！`,
        is_read: false,
      });
    }
  }

  return toGrant;
}
'''

os.makedirs("src/lib", exist_ok=True)
with open("src/lib/badges.ts", "w") as f:
    f.write(BADGES_LIB)
print("✅ src/lib/badges.ts")

# ============================================================
# 3. 投票精算APIにバッジチェックを統合
# ============================================================
settle_path = "src/app/api/admin/races/settle/route.ts"
if os.path.exists(settle_path):
    with open(settle_path, "r") as f:
        content = f.read()

    # バッジチェック import を追加
    if "checkAndGrantBadges" not in content:
        # import 追加
        content = 'import { checkAndGrantBadges } from "@/lib/badges";\n' + content

        # 精算ループの末尾にバッジチェック挿入
        # 「earned_points」や「update」の後あたりを探す
        # points_transactions insert の後に追加
        patterns = [
            # パターン1: points_transactions の insert 後
            (r'(\.from\("points_transactions"\)\.insert\([^)]+\)[^;]*;)',
             lambda m: m.group(1) + """

    // バッジ自動付与チェック
    const isUpset = winEntry?.popularity != null && winEntry.popularity >= 10 && vote.status === "settled_hit";
    const isG1Win = race.grade === "G1" && vote.status === "settled_hit";
    await checkAndGrantBadges(vote.user_id, {
      isPerfect: vote.is_perfect ?? false,
      isUpset,
      isG1Win,
    });"""),
        ]

        applied = False
        for pattern, replacement in patterns:
            if re.search(pattern, content):
                content = re.sub(pattern, replacement, content, count=1)
                applied = True
                break

        if not applied:
            # フォールバック: ファイル末尾のexport前にコメントで注記
            print("⚠️  settle/route.ts: 自動挿入できませんでした。手動で以下を追加してください：")
            print("   import { checkAndGrantBadges } from '@/lib/badges';")
            print("   // 精算ループ内で: await checkAndGrantBadges(vote.user_id, { isPerfect, isUpset, isG1Win });")
        else:
            with open(settle_path, "w") as f:
                f.write(content)
            print(f"✅ {settle_path} にバッジチェック統合")
    else:
        print(f"⏭️  {settle_path}: 既にバッジチェック済み")
else:
    print(f"⚠️  {settle_path} が見つかりません。手動でバッジチェックを統合してください。")

# ============================================================
# 4. バッジ一覧ページ強化
# ============================================================
BADGE_PAGE = '''\
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function BadgesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 全バッジマスタ
  const { data: allBadges } = await supabase
    .from("badges")
    .select("*")
    .order("category")
    .order("condition_value", { ascending: true });

  // ユーザーの獲得済みバッジ
  const { data: userBadges } = await supabase
    .from("user_badges")
    .select("badge_id, earned_at")
    .eq("user_id", user.id);

  const earnedMap = new Map(
    (userBadges ?? []).map((ub) => [ub.badge_id, ub.earned_at])
  );

  const categories = [
    { key: "milestone", label: "🎫 マイルストーン", desc: "投票回数で獲得" },
    { key: "achievement", label: "🎯 アチーブメント", desc: "的中実績で獲得" },
    { key: "streak", label: "🔥 連続記録", desc: "連続的中で獲得" },
    { key: "rank", label: "👑 ランク", desc: "ランク到達で獲得" },
    { key: "special", label: "🦄 スペシャル", desc: "特別な条件で獲得" },
  ];

  const earned = (userBadges ?? []).length;
  const total = (allBadges ?? []).length;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="text-sm text-gray-400">
        <Link href="/mypage" className="hover:text-green-600">マイページ</Link>
        <span className="mx-2">›</span>
        <span className="text-gray-600">バッジコレクション</span>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5 text-center">
        <h1 className="text-xl font-bold text-gray-800 mb-2">🏅 バッジコレクション</h1>
        <div className="text-3xl font-black text-green-600">{earned} <span className="text-lg text-gray-400">/ {total}</span></div>
        <div className="mt-2 h-3 bg-gray-100 rounded-full overflow-hidden max-w-xs mx-auto">
          <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${total > 0 ? (earned / total) * 100 : 0}%` }} />
        </div>
      </div>

      {categories.map((cat) => {
        const badges = (allBadges ?? []).filter((b) => b.category === cat.key);
        if (badges.length === 0) return null;
        return (
          <div key={cat.key} className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="font-bold text-gray-800 mb-1">{cat.label}</h2>
            <p className="text-xs text-gray-400 mb-3">{cat.desc}</p>
            <div className="grid grid-cols-1 gap-2">
              {badges.map((badge) => {
                const isEarned = earnedMap.has(badge.id);
                const earnedAt = earnedMap.get(badge.id);
                return (
                  <div
                    key={badge.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border ${
                      isEarned ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-100 opacity-50"
                    }`}
                  >
                    <span className="text-2xl">{isEarned ? badge.icon : "🔒"}</span>
                    <div className="flex-1">
                      <div className="font-bold text-sm text-gray-800">{badge.name}</div>
                      <div className="text-xs text-gray-500">{badge.description}</div>
                    </div>
                    {isEarned && earnedAt && (
                      <span className="text-xs text-green-600 font-medium">
                        {new Date(earnedAt).toLocaleDateString("ja-JP")}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
'''

badge_dir = "src/app/(main)/mypage/badges"
os.makedirs(badge_dir, exist_ok=True)
with open(f"{badge_dir}/page.tsx", "w") as f:
    f.write(BADGE_PAGE)
print(f"✅ {badge_dir}/page.tsx")

print("\n🏁 Task #37 完了")
print("📌 次のステップ:")
print("   1. Supabase SQL Editor で supabase/migrations/add_badge_master.sql を実行")
print("   2. npx next build でビルド確認")
