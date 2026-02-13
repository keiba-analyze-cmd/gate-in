#!/bin/bash
set -e

cd ~/gate-in

echo "=========================================="
echo "🏇 Phase F: ファイル配置 & スクリプト実行"
echo "=========================================="

mkdir -p phase-f-scripts

echo ""
echo "--- 1. ダウンロードからファイル配置 ---"
for f in \
  37_badge_auto_grant.py \
  38_points_guide_page.py \
  39_vote_edit_cancel.py \
  40_horse_profile.py \
  41_race_search_filter.py \
  42_rank_up_notification.py \
  43_json_ld.py \
  44_monthly_contest.py \
  45_monthly_point_reset.py \
  99_update_tasklist.py \
  run_all.py
do
  if [ -f ~/Downloads/"$f" ]; then
    cp ~/Downloads/"$f" phase-f-scripts/
    echo "  ✅ $f"
  else
    echo "  ❌ $f が見つかりません"
  fi
done

echo ""
echo "--- 2. スクリプト一括実行 ---"
python3 phase-f-scripts/run_all.py

echo ""
echo "--- 3. 生成ファイル確認 ---"
for p in \
  "src/lib/badges.ts" \
  "src/lib/rank-check.ts" \
  "src/components/seo/JsonLd.tsx" \
  "src/components/races/VoteEditForm.tsx" \
  "src/components/races/GradeFilter.tsx" \
  "src/components/races/RaceSearchBar.tsx" \
  "src/app/(main)/guide/points/page.tsx" \
  "src/app/(main)/horses/[horseId]/page.tsx" \
  "src/app/(main)/mypage/badges/page.tsx" \
  "src/app/api/cron/monthly-contest/route.ts" \
  "src/app/api/cron/monthly-reset/route.ts" \
  "supabase/migrations/add_badge_master.sql" \
  "supabase/migrations/add_contest_unique_and_pt_reason.sql" \
  "vercel.json"
do
  if [ -f "$p" ]; then
    echo "  ✅ $p"
  else
    echo "  ❌ $p"
  fi
done

echo ""
echo "--- 4. TASKLIST.md 先頭20行 ---"
head -20 TASKLIST.md

echo ""
echo "=========================================="
echo "✅ 完了！結果を確認してください"
echo "=========================================="
