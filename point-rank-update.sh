#!/bin/bash
set -e

echo "=================================================="
echo "🏇 ポイント・ランクシステム改定"
echo "=================================================="
echo ""

# ============================================================
# 1. ranks.ts 全置換（ポイントルール + ランク閾値）
# ============================================================
echo "━━━ 1. ポイントルール＆ランク閾値 改定 ━━━"

cat > src/lib/constants/ranks.ts << 'EOF'
// ====================================================
// ランク定義（累計ポイント基準）
// 目安: 週10投票 x 月4週 = 40投票/月
// 上級者で月3000-4000P → レジェンドまで約6ヶ月
// ====================================================
export const RANKS = [
  { id: "beginner_1", name: "ビギナー Ⅰ", icon: "🔰", tier: "ビギナー", threshold: 0 },
  { id: "beginner_2", name: "ビギナー Ⅱ", icon: "🔰", tier: "ビギナー", threshold: 30 },
  { id: "beginner_3", name: "ビギナー Ⅲ", icon: "🔰", tier: "ビギナー", threshold: 80 },
  { id: "beginner_4", name: "ビギナー Ⅳ", icon: "🔰", tier: "ビギナー", threshold: 200 },
  { id: "beginner_5", name: "ビギナー Ⅴ", icon: "🔰", tier: "ビギナー", threshold: 400 },
  { id: "forecaster_1", name: "予想士 Ⅰ", icon: "⭐", tier: "予想士", threshold: 700 },
  { id: "forecaster_2", name: "予想士 Ⅱ", icon: "⭐", tier: "予想士", threshold: 1100 },
  { id: "forecaster_3", name: "予想士 Ⅲ", icon: "⭐", tier: "予想士", threshold: 1600 },
  { id: "forecaster_4", name: "予想士 Ⅳ", icon: "⭐", tier: "予想士", threshold: 2200 },
  { id: "forecaster_5", name: "予想士 Ⅴ", icon: "⭐", tier: "予想士", threshold: 3000 },
  { id: "advanced_1", name: "上級予想士 Ⅰ", icon: "⭐⭐", tier: "上級予想士", threshold: 4000 },
  { id: "advanced_2", name: "上級予想士 Ⅱ", icon: "⭐⭐", tier: "上級予想士", threshold: 5500 },
  { id: "advanced_3", name: "上級予想士 Ⅲ", icon: "⭐⭐", tier: "上級予想士", threshold: 7500 },
  { id: "advanced_4", name: "上級予想士 Ⅳ", icon: "⭐⭐", tier: "上級予想士", threshold: 10000 },
  { id: "advanced_5", name: "上級予想士 Ⅴ", icon: "⭐⭐", tier: "上級予想士", threshold: 13000 },
  { id: "master_1", name: "予想マスター Ⅰ", icon: "👑", tier: "予想マスター", threshold: 16500 },
  { id: "master_2", name: "予想マスター Ⅱ", icon: "👑", tier: "予想マスター", threshold: 20500 },
  { id: "master_3", name: "予想マスター Ⅲ", icon: "👑", tier: "予想マスター", threshold: 25000 },
  { id: "master_4", name: "予想マスター Ⅳ", icon: "👑", tier: "予想マスター", threshold: 30000 },
  { id: "master_5", name: "予想マスター Ⅴ", icon: "👑", tier: "予想マスター", threshold: 36000 },
  { id: "legend", name: "レジェンド", icon: "🏆", tier: "レジェンド", threshold: 45000 },
] as const;

export function getRank(rankId: string) {
  return RANKS.find((r) => r.id === rankId) ?? RANKS[0];
}

export function getNextRank(rankId: string) {
  const idx = RANKS.findIndex((r) => r.id === rankId);
  if (idx < 0 || idx >= RANKS.length - 1) return null;
  return RANKS[idx + 1];
}

// ====================================================
// ポイントルール
// ====================================================

// 1着的中: 人気別ポイント（大穴ほど高い）
export const POINT_RULES = {
  win: {
    1: 30, 2: 50, 3: 50,
    4: 80, 5: 80,
    6: 120, 7: 120,
    8: 200, 9: 200,
    default: 300,
  } as Record<number | string, number>,

  // 複勝的中: 固定
  place: 20,

  // 危険馬的中: 人気別ポイント（人気馬を危険視→着外ほど評価高い）
  danger: {
    1: 50, 2: 40, 3: 30,
    4: 20, 5: 15,
    default: 10,
  } as Record<number | string, number>,

  // グレード別ボーナス（各的中に加算）
  grade_bonus: {
    G1: 30,
    G2: 15,
    G3: 10,
    L: 5,
    OP: 5,
  } as Record<string, number>,

  // 完全的中ボーナス（◎○△全的中）
  perfect: 200,

  // 連続的中ボーナス（3の倍数ごと）
  streak3: 50,
} as const;

// 1着的中ポイントを取得
export function getWinPoints(popularity: number): number {
  return POINT_RULES.win[popularity] ?? POINT_RULES.win.default;
}

// 危険馬的中ポイントを取得（人気馬ほど高い）
export function getDangerPoints(popularity: number): number {
  return POINT_RULES.danger[popularity] ?? POINT_RULES.danger.default;
}

// グレードボーナスを取得
export function getGradeBonus(grade: string | null): number {
  if (!grade) return 0;
  return (POINT_RULES.grade_bonus as Record<string, number>)[grade] ?? 0;
}
EOF
echo "  ✅ src/lib/constants/ranks.ts"

# ============================================================
# 2. settle-race.ts 全置換（グレード＆危険馬 人気反映）
# ============================================================
echo "━━━ 2. 清算ロジック改定 ━━━"

cat > src/lib/services/settle-race.ts << 'EOF'
import { SupabaseClient } from "@supabase/supabase-js";
import { checkAndGrantBadges } from "@/lib/badges";
import { checkRankUp } from "@/lib/rank-check";
import { getWinPoints, getDangerPoints, getGradeBonus, POINT_RULES } from "@/lib/constants/ranks";

type SettleResult = {
  success: boolean;
  settled_votes: number;
  total_points_awarded: number;
  errors: string[];
};

export async function settleRace(
  supabase: SupabaseClient,
  raceId: string
): Promise<SettleResult> {
  const errors: string[] = [];
  let settledVotes = 0;
  let totalPointsAwarded = 0;

  // 1. レース情報を取得
  const { data: race, error: raceErr } = await supabase
    .from("races").select("*").eq("id", raceId).single();

  if (raceErr || !race) {
    return { success: false, settled_votes: 0, total_points_awarded: 0, errors: ["レースが見つかりません"] };
  }

  // グレードボーナス（このレースの全的中に加算）
  const gradeBonus = getGradeBonus(race.grade);

  // 2. レース結果を取得
  const { data: results, error: resultsErr } = await supabase
    .from("race_results")
    .select("*, race_entries(id, post_number, odds, popularity, horse_id, horses(name))")
    .eq("race_id", raceId)
    .order("finish_position", { ascending: true });

  if (resultsErr || !results || results.length === 0) {
    return { success: false, settled_votes: 0, total_points_awarded: 0, errors: ["レース結果が登録されていません"] };
  }

  const winnerEntryId = results.find((r) => r.finish_position === 1)?.race_entry_id;
  const winnerPopularity = results.find((r) => r.finish_position === 1)?.race_entries?.popularity ?? 1;
  const top3EntryIds = results.filter((r) => r.finish_position <= 3).map((r) => r.race_entry_id);

  if (!winnerEntryId) {
    return { success: false, settled_votes: 0, total_points_awarded: 0, errors: ["1着が見つかりません"] };
  }

  // 危険馬の人気をマップ化
  const entryPopularityMap = new Map<string, number>();
  for (const r of results) {
    if (r.race_entries?.popularity) {
      entryPopularityMap.set(r.race_entry_id, r.race_entries.popularity);
    }
  }

  // 3. 全投票を取得（pending のみ）
  const { data: votes, error: votesErr } = await supabase
    .from("votes").select("*, vote_picks(*)").eq("race_id", raceId).eq("status", "pending");

  if (votesErr) {
    return { success: false, settled_votes: 0, total_points_awarded: 0, errors: [votesErr.message] };
  }

  if (!votes || votes.length === 0) {
    await supabase.from("races").update({ status: "finished" }).eq("id", raceId);
    return { success: true, settled_votes: 0, total_points_awarded: 0, errors: [] };
  }

  // 4. 各投票のポイント計算
  for (const vote of votes) {
    try {
      let votePoints = 0;
      const transactions: { reason: string; amount: number; description: string }[] = [];
      let anyHit = false;
      let winHit = false;
      let allPlaceHit = true;
      let dangerHit = false;

      const picks = vote.vote_picks ?? [];

      // --- 1着的中判定 ---
      const winPick = picks.find((p: any) => p.pick_type === "win");
      if (winPick) {
        if (winPick.race_entry_id === winnerEntryId) {
          const basePts = getWinPoints(winnerPopularity);
          const pts = basePts + gradeBonus;
          votePoints += pts;
          winHit = true;
          anyHit = true;

          const gradeLabel = gradeBonus > 0 ? `（${race.grade}+${gradeBonus}）` : "";
          transactions.push({
            reason: "win_hit",
            amount: pts,
            description: `1着的中（${winnerPopularity}番人気）+${basePts}P${gradeLabel}`,
          });

          await supabase.from("vote_picks")
            .update({ is_hit: true, points_earned: pts }).eq("id", winPick.id);
        } else {
          await supabase.from("vote_picks")
            .update({ is_hit: false, points_earned: 0 }).eq("id", winPick.id);
        }
      }

      // --- 複勝的中判定 ---
      const placePicks = picks.filter((p: any) => p.pick_type === "place");
      for (const pp of placePicks) {
        if (top3EntryIds.includes(pp.race_entry_id)) {
          const pts = POINT_RULES.place + gradeBonus;
          votePoints += pts;
          anyHit = true;

          const gradeLabel = gradeBonus > 0 ? `（${race.grade}+${gradeBonus}）` : "";
          transactions.push({
            reason: "place_hit",
            amount: pts,
            description: `複勝的中 +${POINT_RULES.place}P${gradeLabel}`,
          });
          await supabase.from("vote_picks")
            .update({ is_hit: true, points_earned: pts }).eq("id", pp.id);
        } else {
          allPlaceHit = false;
          await supabase.from("vote_picks")
            .update({ is_hit: false, points_earned: 0 }).eq("id", pp.id);
        }
      }
      if (placePicks.length === 0) allPlaceHit = false;

      // --- 危険馬的中判定（人気別ポイント）---
      const dangerPickItem = picks.find((p: any) => p.pick_type === "danger");
      if (dangerPickItem) {
        const dangerFinish = results.find((r) => r.race_entry_id === dangerPickItem.race_entry_id);
        if (dangerFinish && dangerFinish.finish_position > 3) {
          const dangerPop = entryPopularityMap.get(dangerPickItem.race_entry_id) ?? 99;
          const basePts = getDangerPoints(dangerPop);
          const pts = basePts + gradeBonus;
          votePoints += pts;
          dangerHit = true;
          anyHit = true;

          const gradeLabel = gradeBonus > 0 ? `（${race.grade}+${gradeBonus}）` : "";
          transactions.push({
            reason: "danger_hit",
            amount: pts,
            description: `危険馬的中（${dangerPop}番人気）+${basePts}P${gradeLabel}`,
          });
          await supabase.from("vote_picks")
            .update({ is_hit: true, points_earned: pts }).eq("id", dangerPickItem.id);
        } else {
          await supabase.from("vote_picks")
            .update({ is_hit: false, points_earned: 0 }).eq("id", dangerPickItem.id);
        }
      }

      // --- 完全的中ボーナス ---
      const isPerfect = winHit && allPlaceHit && dangerHit;
      if (isPerfect) {
        votePoints += POINT_RULES.perfect;
        transactions.push({
          reason: "perfect_bonus",
          amount: POINT_RULES.perfect,
          description: `完全的中ボーナス +${POINT_RULES.perfect}P`,
        });
      }

      // --- 連続的中ボーナス ---
      if (winHit) {
        const { data: profile } = await supabase
          .from("profiles").select("current_streak, best_streak")
          .eq("id", vote.user_id).single();

        const newStreak = (profile?.current_streak ?? 0) + 1;

        if (newStreak > 0 && newStreak % 3 === 0) {
          votePoints += POINT_RULES.streak3;
          transactions.push({
            reason: "streak_bonus",
            amount: POINT_RULES.streak3,
            description: `${newStreak}連続的中ボーナス +${POINT_RULES.streak3}P`,
          });
        }

        await supabase.from("profiles").update({
          current_streak: newStreak,
          best_streak: Math.max(newStreak, profile?.best_streak ?? 0),
        }).eq("id", vote.user_id);
      } else {
        await supabase.from("profiles").update({ current_streak: 0 }).eq("id", vote.user_id);
      }

      // 5. 投票ステータスを更新
      const status = anyHit ? "settled_hit" : "settled_miss";
      await supabase.from("votes").update({
        status, earned_points: votePoints, is_perfect: isPerfect,
        settled_at: new Date().toISOString(),
      }).eq("id", vote.id);

      // 6. ポイント履歴を登録
      if (transactions.length > 0) {
        await supabase.from("points_transactions").insert(
          transactions.map((tx) => ({
            user_id: vote.user_id, vote_id: vote.id, race_id: raceId,
            amount: tx.amount, reason: tx.reason, description: tx.description,
          }))
        );
      }

      // 7. プロフィールのポイント・的中数を更新
      const { data: currentProfile } = await supabase
        .from("profiles")
        .select("cumulative_points, monthly_points, total_votes, win_hits, place_hits, danger_hits")
        .eq("id", vote.user_id).single();

      if (currentProfile) {
        const placeHitCount = placePicks.filter((pp: any) => top3EntryIds.includes(pp.race_entry_id)).length;

        await supabase.from("profiles").update({
          cumulative_points: currentProfile.cumulative_points + votePoints,
          monthly_points: currentProfile.monthly_points + votePoints,
          total_votes: currentProfile.total_votes + 1,
          win_hits: currentProfile.win_hits + (winHit ? 1 : 0),
          place_hits: currentProfile.place_hits + placeHitCount,
          danger_hits: currentProfile.danger_hits + (dangerHit ? 1 : 0),
        }).eq("id", vote.user_id);
      }

      // 8. 大会エントリーを更新
      const now = new Date();
      const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

      const { data: contest } = await supabase
        .from("contests").select("id, min_votes")
        .eq("year_month", yearMonth).eq("status", "active").maybeSingle();

      if (contest) {
        const { data: existing } = await supabase
          .from("contest_entries").select("id, total_points, vote_count")
          .eq("contest_id", contest.id).eq("user_id", vote.user_id).maybeSingle();

        if (existing) {
          const newVoteCount = existing.vote_count + 1;
          await supabase.from("contest_entries").update({
            total_points: existing.total_points + votePoints,
            vote_count: newVoteCount,
            is_eligible: newVoteCount >= contest.min_votes,
          }).eq("id", existing.id);
        } else {
          await supabase.from("contest_entries").insert({
            contest_id: contest.id, user_id: vote.user_id,
            total_points: votePoints, vote_count: 1,
            is_eligible: 1 >= contest.min_votes,
          });
        }
      }

      // 8.5 バッジ自動付与チェック
      const isUpset = winHit && winnerPopularity >= 10;
      const isG1Win = winHit && race.grade === "G1";
      await checkAndGrantBadges(vote.user_id, { isPerfect, isUpset, isG1Win });

      // 8.6 ランクアップチェック & 通知
      await checkRankUp(vote.user_id);

      settledVotes++;
      totalPointsAwarded += votePoints;
    } catch (err: any) {
      errors.push(`投票 ${vote.id} のエラー: ${err.message}`);
    }
  }

  // 9. レースステータスを finished に更新
  await supabase.from("races").update({ status: "finished" }).eq("id", raceId);

  return { success: errors.length === 0, settled_votes: settledVotes, total_points_awarded: totalPointsAwarded, errors };
}
EOF
echo "  ✅ src/lib/services/settle-race.ts"

# ============================================================
# 3. ポイント説明ページの更新
# ============================================================
echo "━━━ 3. ポイント説明ページ更新確認 ━━━"

# getWinPointsとgetDangerPointsのimportが必要な箇所を確認
grep -rn "getWinPoints\|POINT_RULES\|getDangerPoints" src/ --include="*.ts" --include="*.tsx" | grep -v "node_modules" | grep -v "ranks.ts" | grep -v "settle-race.ts"

echo ""
echo "=================================================="
echo "🏁 ポイント・ランクシステム改定 完了!"
echo "=================================================="
echo ""
echo "📊 ポイントルール変更点:"
echo ""
echo "  【1着的中（人気別）】旧 → 新"
echo "  1番人気: 50P → 30P"
echo "  2-3番人気: 100P → 50P"
echo "  4-5番人気: 200P → 80P"
echo "  6-7番人気: 350P → 120P"
echo "  8-9番人気: 350P → 200P"
echo "  10番人気〜: 500P → 300P"
echo ""
echo "  【危険馬的中（人気別 ★NEW）】"
echo "  1番人気着外: 50P（最も評価）"
echo "  2番人気着外: 40P"
echo "  3番人気着外: 30P"
echo "  4番人気着外: 20P"
echo "  5番人気着外: 15P"
echo "  6番人気〜:   10P"
echo ""
echo "  【グレード別ボーナス ★NEW】"
echo "  G1: +30P（各的中に加算）"
echo "  G2: +15P"
echo "  G3: +10P"
echo "  OP/L: +5P"
echo "  平場: +0P"
echo ""
echo "  【その他】"
echo "  複勝: 30P → 20P（+グレード加算）"
echo "  完全的中: 300P → 200P"
echo "  連続的中: 50P（変更なし）"
echo ""
echo "  【ランク閾値】"
echo "  レジェンド: 100,000P → 45,000P"
echo "  想定到達: 上級者(月3500P) → 約12ヶ月"
echo "           トッププレイヤー(月5000P) → 約9ヶ月"
echo ""
echo "📋 次のステップ:"
echo "  1. npm run build"
echo "  2. ビルド成功後:"
echo "     git add -A && git commit -m 'feat: ポイント・ランク改定（グレード加算・危険馬人気傾斜）' && git push"
echo "  3. ポイント説明ページ（/guide/points）の文言も更新推奨"
