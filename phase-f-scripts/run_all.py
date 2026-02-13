#!/usr/bin/env python3
"""
Phase F 全タスク一括実行スクリプト
プロジェクトルート (~/gate-in/) で実行してください

使い方:
  python3 phase-f-scripts/run_all.py
"""

import subprocess
import sys
import os

SCRIPTS = [
    ("37", "37_badge_auto_grant.py",     "バッジ自動付与ロジック"),
    ("38", "38_points_guide_page.py",    "ポイントシステム説明ページ"),
    ("39", "39_vote_edit_cancel.py",     "投票変更・取り消し機能"),
    ("40", "40_horse_profile.py",        "馬カルテページ"),
    ("41", "41_race_search_filter.py",   "レース検索・フィルター"),
    ("42", "42_rank_up_notification.py", "ランクアップ通知"),
    ("43", "43_json_ld.py",             "構造化データ（JSON-LD）"),
    ("44", "44_monthly_contest.py",      "月次大会の自動作成"),
    ("45", "45_monthly_point_reset.py",  "月次ポイントリセット"),
    ("--", "99_update_tasklist.py",      "TASKLIST.md 更新"),
]

script_dir = os.path.dirname(os.path.abspath(__file__))

print("=" * 60)
print("🏇 ゲートイン！ Phase F 全タスク一括実行")
print("=" * 60)

failed = []
for num, filename, desc in SCRIPTS:
    print(f"\n{'─' * 60}")
    print(f"▶ #{num} {desc}")
    print(f"{'─' * 60}")

    script_path = os.path.join(script_dir, filename)
    result = subprocess.run(
        [sys.executable, script_path],
        cwd=os.getcwd(),
        capture_output=False
    )

    if result.returncode != 0:
        failed.append((num, desc))
        print(f"❌ #{num} 失敗（エラーコード: {result.returncode}）")
    else:
        print(f"✅ #{num} 完了")

print(f"\n{'=' * 60}")
if failed:
    print(f"⚠️  {len(failed)}件失敗:")
    for num, desc in failed:
        print(f"   #{num} {desc}")
else:
    print("🎉 Phase F 全9件 + TASKLIST更新 完了！")

print(f"\n📌 残りの手動作業:")
print("   1. Supabase SQL Editor で以下を実行:")
print("      - supabase/migrations/add_badge_master.sql")
print("      - supabase/migrations/add_contest_unique_and_pt_reason.sql")
print("   2. Vercel に CRON_SECRET 環境変数を設定")
print("   3. npx next build でビルド確認")
print("   4. git add -A && git commit -m 'Phase F: 機能追加 全9件完了' && git push")
print(f"{'=' * 60}")
