#!/bin/bash
set -e
cd ~/gate-in

echo "=========================================="
echo "🔧 Phase F: ⚠️修正パッチ適用"
echo "=========================================="

# ============================================================
# 1. settle-race.ts にバッジ自動付与 + ランクアップチェック追加
# ============================================================
echo ""
echo "--- 1. settle-race.ts にバッジ&ランクチェック統合 ---"

python3 -c '
import re

path = "src/lib/services/settle-race.ts"
with open(path, "r") as f:
    content = f.read()

# import追加
if "checkAndGrantBadges" not in content:
    content = content.replace(
        "import { getWinPoints, POINT_RULES }",
        "import { getWinPoints, POINT_RULES }"
        + "\nimport { checkAndGrantBadges } from \"@/lib/badges\";"
        + "\nimport { checkRankUp } from \"@/lib/rank-check\";"
    )

    # ステップ8（大会エントリー更新）の後、catch の前にバッジ＆ランクチェック挿入
    old_block = "      settledVotes++;\n      totalPointsAwarded += votePoints;"
    new_block = """      // 8.5 バッジ自動付与チェック
      const isUpset = winHit && winnerPopularity >= 10;
      const isG1Win = winHit && race.grade === \"G1\";
      await checkAndGrantBadges(vote.user_id, {
        isPerfect,
        isUpset,
        isG1Win,
      });

      // 8.6 ランクアップチェック & 通知
      await checkRankUp(vote.user_id);

      settledVotes++;
      totalPointsAwarded += votePoints;"""

    if old_block in content:
        content = content.replace(old_block, new_block)
        with open(path, "w") as f:
            f.write(content)
        print("  ✅ settle-race.ts にバッジ&ランクチェック統合完了")
    else:
        print("  ❌ パターン不一致: settle-race.ts")
else:
    print("  ⏭️  既に統合済み")
'

# ============================================================
# 2. settle/route.ts から不要な import を削除
# ============================================================
echo ""
echo "--- 2. settle/route.ts クリーンアップ ---"

python3 -c '
path = "src/app/api/admin/races/settle/route.ts"
with open(path, "r") as f:
    content = f.read()

# 不要なimportを削除（settle-race.ts側に移動したため）
lines = content.split("\n")
cleaned = [l for l in lines if "checkRankUp" not in l and "checkAndGrantBadges" not in l]
new_content = "\n".join(cleaned)

if new_content != content:
    with open(path, "w") as f:
        f.write(new_content)
    print("  ✅ settle/route.ts から不要なimport削除")
else:
    print("  ⏭️  変更不要")
'

# ============================================================
# 3. HorseList.tsx に馬カルテリンク追加
# ============================================================
echo ""
echo "--- 3. HorseList.tsx に馬カルテリンク追加 ---"

python3 -c '
path = "src/components/races/HorseList.tsx"
with open(path, "r") as f:
    content = f.read()

if "/horses/" not in content:
    # import Link 追加
    content = "import Link from \"next/link\";\n\n" + content

    # 馬名部分をLinkで囲む
    old = """              <div className=\"font-bold text-gray-800 truncate\">
                {entry.horses?.name ?? \"不明\"}
              </div>"""

    new = """              <div className=\"font-bold text-gray-800 truncate\">
                {entry.horses?.id ? (
                  <Link href={\`/horses/\${entry.horses.id}\`} className=\"hover:text-green-600 hover:underline\">
                    {entry.horses.name}
                  </Link>
                ) : (
                  \"不明\"
                )}
              </div>"""

    if old in content:
        content = content.replace(old, new)
        with open(path, "w") as f:
            f.write(content)
        print("  ✅ HorseList.tsx に馬カルテリンク追加")
    else:
        print("  ❌ パターン不一致")
else:
    print("  ⏭️  既にリンクあり")
'

# ============================================================
# 確認
# ============================================================
echo ""
echo "--- 確認 ---"
grep -n "checkAndGrantBadges\|checkRankUp" src/lib/services/settle-race.ts | head -5
grep -n "Link\|/horses/" src/components/races/HorseList.tsx | head -5
grep -c "checkRankUp" src/app/api/admin/races/settle/route.ts && echo "  (route.tsに残っていたら要確認)" || echo "  ✅ route.tsクリーン"

echo ""
echo "=========================================="
echo "✅ パッチ適用完了！"
echo "次: npx next build"
echo "=========================================="
