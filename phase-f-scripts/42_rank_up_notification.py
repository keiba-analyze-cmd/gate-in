#!/usr/bin/env python3
"""
Task #42: ランクアップ通知
- src/lib/rank-check.ts: ランク更新＋通知ユーティリティ
- 投票精算APIからランクチェックを呼び出す
"""

import os, re

# ============================================================
# 1. ランクチェック・通知ユーティリティ
# ============================================================
RANK_CHECK = '''\
import { createAdminClient } from "@/lib/admin";
import { RANKS } from "@/lib/constants/ranks";

/**
 * ランクアップチェック & 通知
 * ポイント加算後に呼び出す
 * @returns 新しい rank_id（変更があった場合）、なければ null
 */
export async function checkRankUp(userId: string): Promise<string | null> {
  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("rank_id, cumulative_points")
    .eq("id", userId)
    .single();

  if (!profile) return null;

  const currentRankIdx = RANKS.findIndex((r) => r.id === profile.rank_id);
  const points = profile.cumulative_points;

  // 現在のポイントで到達できる最高ランクを検索
  let newRankIdx = 0;
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (points >= RANKS[i].threshold) {
      newRankIdx = i;
      break;
    }
  }

  // ランクアップしていない場合
  if (newRankIdx <= currentRankIdx) return null;

  const newRank = RANKS[newRankIdx];
  const oldRank = currentRankIdx >= 0 ? RANKS[currentRankIdx] : RANKS[0];

  // ランク更新
  await admin
    .from("profiles")
    .update({ rank_id: newRank.id })
    .eq("id", userId);

  // 通知作成
  await admin.from("notifications").insert({
    user_id: userId,
    type: "rank_up",
    title: "ランクアップ！🎉",
    body: `${oldRank.icon} ${oldRank.name} → ${newRank.icon} ${newRank.name} にランクアップしました！`,
    is_read: false,
  });

  return newRank.id;
}
'''

os.makedirs("src/lib", exist_ok=True)
with open("src/lib/rank-check.ts", "w") as f:
    f.write(RANK_CHECK)
print("✅ src/lib/rank-check.ts")

# ============================================================
# 2. 投票精算APIにランクチェックを統合
# ============================================================
settle_path = "src/app/api/admin/races/settle/route.ts"
if os.path.exists(settle_path):
    with open(settle_path, "r") as f:
        content = f.read()

    if "checkRankUp" not in content:
        # import 追加
        content = 'import { checkRankUp } from "@/lib/rank-check";\n' + content

        # checkAndGrantBadges の後、もしくは points_transactions insert の後に追加
        badge_pattern = "await checkAndGrantBadges("
        pt_pattern = '.from("points_transactions").insert('

        if badge_pattern in content:
            # バッジチェックの後に挿入
            lines = content.split("\n")
            new_lines = []
            for line in lines:
                new_lines.append(line)
                if "await checkAndGrantBadges(" in line and ");" in line:
                    # 次の行にランクチェック追加
                    indent = "    "
                    new_lines.append(f"{indent}// ランクアップチェック & 通知")
                    new_lines.append(f"{indent}await checkRankUp(vote.user_id);")
            content = "\n".join(new_lines)
        elif pt_pattern in content:
            # points_transactions insert の後に挿入
            idx = content.index(pt_pattern)
            # その行の末尾（;）を探す
            end_idx = content.index(";", idx) + 1
            insert_code = "\n\n    // ランクアップチェック & 通知\n    await checkRankUp(vote.user_id);"
            content = content[:end_idx] + insert_code + content[end_idx:]
        else:
            print("⚠️  settle/route.ts: 自動挿入位置が見つかりません。手動で追加してください:")
            print("   await checkRankUp(vote.user_id);")

        with open(settle_path, "w") as f:
            f.write(content)
        print(f"✅ {settle_path} にランクチェック統合")
    else:
        print(f"⏭️  {settle_path}: 既にランクチェック済み")
else:
    print(f"⚠️  {settle_path} が見つかりません")

print("\n🏁 Task #42 完了")
