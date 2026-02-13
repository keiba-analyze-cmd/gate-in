#!/usr/bin/env python3
"""
Task #99: TASKLIST.md 更新
"""

import os
from datetime import date

def run():
    path = "TASKLIST.md"
    if not os.path.exists(path):
        print("  ⚠️  TASKLIST.md が見つかりません")
        return

    with open(path, "r") as f:
        content = f.read()

    today = date.today().strftime("%Y-%m-%d")

    # Phase E タスク状態更新
    replacements = {
        "| ✅ 完了 | 32 |": "| ✅ 完了 | 45 |",
        "| 🔴 未着手 | 40 |": "| 🔴 未着手 | 27 |",
        "| **合計** | **72** |": "| **合計** | **72** |",
        "Phase E      → UX改善・パフォーマンス ← 次はここ": "Phase E      → ✅ 完了（" + today + "）",
        "Phase H       → コンプライアンス・アカウント管理（必須）": "Phase H       → ✅ 完了（" + today + "）",
    }

    for old, new in replacements.items():
        if old in content:
            content = content.replace(old, new)

    # 更新履歴追加
    history_entry = f"| {today} | Phase E残り完了（スケルトン、キャッシュ拡充、画像最適化、エラー監視、バリデーション強化）+ Phase H完了（退会機能、お問い合わせ、Cookie同意、通知設定、予想履歴） |"
    content = content.replace(
        "| 日付 | 内容 |\n|------|------|\n",
        "| 日付 | 内容 |\n|------|------|\n" + history_entry + "\n"
    )

    with open(path, "w") as f:
        f.write(content)
    print(f"  ✅ TASKLIST.md 更新")

if __name__ == "__main__":
    run()
