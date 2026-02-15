import { createAdminClient } from "@/lib/admin";

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
    // 馬券系（オッズ）
    winOdds?: number;        // 単勝オッズ（的中時）
    quinellaOdds?: number;   // 馬連オッズ（的中時）
    wideCount?: number;      // 今回のワイド的中回数
    trioOdds?: number;       // 三連複オッズ（的中時）
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

  // ワイド的中回数を集計（points_transactionsから）
  const { count: wideHitCount } = await admin
    .from("points_transactions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("reason", "wide_hit");

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

  // === 馬券バッジ ===
  // 単勝30倍以上
  if (extra?.winOdds && extra.winOdds >= 30) {
    check("odds_30", true);
  }

  // 馬連100倍以上
  if (extra?.quinellaOdds && extra.quinellaOdds >= 100) {
    check("quinella_100", true);
  }

  // 馬連300倍以上
  if (extra?.quinellaOdds && extra.quinellaOdds >= 300) {
    check("quinella_300", true);
  }

  // 三連複100倍以上
  if (extra?.trioOdds && extra.trioOdds >= 100) {
    check("trio_100", true);
  }

  // 三連複1000倍以上
  if (extra?.trioOdds && extra.trioOdds >= 1000) {
    check("trio_1000", true);
  }

  // ワイド10回的中
  const totalWideHits = (wideHitCount ?? 0) + (extra?.wideCount ?? 0);
  check("wide_10", totalWideHits >= 10);

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
