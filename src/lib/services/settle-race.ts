import { SupabaseClient } from "@supabase/supabase-js";
import { checkAndGrantBadges } from "@/lib/badges";
import { checkRankUp } from "@/lib/rank-check";
import { getWinPoints, POINT_RULES } from "@/lib/constants/ranks";

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
    .from("races")
    .select("*")
    .eq("id", raceId)
    .single();

  if (raceErr || !race) {
    return { success: false, settled_votes: 0, total_points_awarded: 0, errors: ["レースが見つかりません"] };
  }

  // 2. レース結果を取得
  const { data: results, error: resultsErr } = await supabase
    .from("race_results")
    .select("*, race_entries(id, post_number, odds, popularity, horse_id, horses(name))")
    .eq("race_id", raceId)
    .order("finish_position", { ascending: true });

  if (resultsErr || !results || results.length === 0) {
    return { success: false, settled_votes: 0, total_points_awarded: 0, errors: ["レース結果が登録されていません"] };
  }

  // 1着・3着以内のエントリーID
  const winnerEntryId = results.find((r) => r.finish_position === 1)?.race_entry_id;
  const winnerPopularity = results.find((r) => r.finish_position === 1)?.race_entries?.popularity ?? 1;
  const top3EntryIds = results
    .filter((r) => r.finish_position <= 3)
    .map((r) => r.race_entry_id);

  if (!winnerEntryId) {
    return { success: false, settled_votes: 0, total_points_awarded: 0, errors: ["1着が見つかりません"] };
  }

  // 3. 全投票を取得（pending のみ）
  const { data: votes, error: votesErr } = await supabase
    .from("votes")
    .select("*, vote_picks(*)")
    .eq("race_id", raceId)
    .eq("status", "pending");

  if (votesErr) {
    return { success: false, settled_votes: 0, total_points_awarded: 0, errors: [votesErr.message] };
  }

  if (!votes || votes.length === 0) {
    // 投票がなくてもレースは確定する
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
          const pts = getWinPoints(winnerPopularity);
          votePoints += pts;
          winHit = true;
          anyHit = true;
          transactions.push({
            reason: "win_hit",
            amount: pts,
            description: `1着的中（${winnerPopularity}番人気）+${pts}P`,
          });

          // vote_picks を更新
          await supabase
            .from("vote_picks")
            .update({ is_hit: true, points_earned: pts })
            .eq("id", winPick.id);

          // G1/G2/G3 ボーナス
          if (race.grade === "G1") {
            votePoints += POINT_RULES.g1;
            transactions.push({
              reason: "g1_bonus",
              amount: POINT_RULES.g1,
              description: "G1的中ボーナス +100P",
            });
          }
        } else {
          await supabase
            .from("vote_picks")
            .update({ is_hit: false, points_earned: 0 })
            .eq("id", winPick.id);
        }
      }

      // --- 複勝的中判定 ---
      const placePicks = picks.filter((p: any) => p.pick_type === "place");
      for (const pp of placePicks) {
        if (top3EntryIds.includes(pp.race_entry_id)) {
          votePoints += POINT_RULES.place;
          anyHit = true;
          transactions.push({
            reason: "place_hit",
            amount: POINT_RULES.place,
            description: `複勝的中 +${POINT_RULES.place}P`,
          });
          await supabase
            .from("vote_picks")
            .update({ is_hit: true, points_earned: POINT_RULES.place })
            .eq("id", pp.id);
        } else {
          allPlaceHit = false;
          await supabase
            .from("vote_picks")
            .update({ is_hit: false, points_earned: 0 })
            .eq("id", pp.id);
        }
      }
      if (placePicks.length === 0) allPlaceHit = false;

      // --- 危険馬的中判定 ---
      const dangerPickItem = picks.find((p: any) => p.pick_type === "danger");
      if (dangerPickItem) {
        const dangerFinish = results.find(
          (r) => r.race_entry_id === dangerPickItem.race_entry_id
        );
        // 危険馬 = 4着以下（3着以内に入らなかった）
        if (dangerFinish && dangerFinish.finish_position > 3) {
          votePoints += POINT_RULES.danger;
          dangerHit = true;
          anyHit = true;
          transactions.push({
            reason: "danger_hit",
            amount: POINT_RULES.danger,
            description: `危険馬的中 +${POINT_RULES.danger}P`,
          });
          await supabase
            .from("vote_picks")
            .update({ is_hit: true, points_earned: POINT_RULES.danger })
            .eq("id", dangerPickItem.id);
        } else if (!dangerFinish) {
          // 結果にない（出走取消等）→ 的中扱いにしない
          await supabase
            .from("vote_picks")
            .update({ is_hit: false, points_earned: 0 })
            .eq("id", dangerPickItem.id);
        } else {
          await supabase
            .from("vote_picks")
            .update({ is_hit: false, points_earned: 0 })
            .eq("id", dangerPickItem.id);
        }
      }

      // --- 完全的中ボーナス ---
      const isPerfect = winHit && allPlaceHit && dangerHit;
      if (isPerfect) {
        votePoints += POINT_RULES.perfect;
        transactions.push({
          reason: "perfect_bonus",
          amount: POINT_RULES.perfect,
          description: "完全的中ボーナス +300P",
        });
      }

      // --- 連続的中ボーナス ---
      if (winHit) {
        // 現在のストリークを取得
        const { data: profile } = await supabase
          .from("profiles")
          .select("current_streak, best_streak")
          .eq("id", vote.user_id)
          .single();

        const newStreak = (profile?.current_streak ?? 0) + 1;

        // 3の倍数でボーナス
        if (newStreak > 0 && newStreak % 3 === 0) {
          votePoints += POINT_RULES.streak3;
          transactions.push({
            reason: "streak_bonus",
            amount: POINT_RULES.streak3,
            description: `${newStreak}連続的中ボーナス +${POINT_RULES.streak3}P`,
          });
        }

        // ストリーク更新
        await supabase
          .from("profiles")
          .update({
            current_streak: newStreak,
            best_streak: Math.max(newStreak, profile?.best_streak ?? 0),
          })
          .eq("id", vote.user_id);
      } else {
        // 1着ハズレ → ストリークリセット
        await supabase
          .from("profiles")
          .update({ current_streak: 0 })
          .eq("id", vote.user_id);
      }

      // 5. 投票ステータスを更新
      const status = anyHit ? "settled_hit" : "settled_miss";
      await supabase
        .from("votes")
        .update({
          status,
          earned_points: votePoints,
          is_perfect: isPerfect,
          settled_at: new Date().toISOString(),
        })
        .eq("id", vote.id);

      // 6. ポイント履歴を登録
      if (transactions.length > 0) {
        const txInserts = transactions.map((tx) => ({
          user_id: vote.user_id,
          vote_id: vote.id,
          race_id: raceId,
          amount: tx.amount,
          reason: tx.reason,
          description: tx.description,
        }));
        await supabase.from("points_transactions").insert(txInserts);
      }

      // 7. ユーザープロフィールのポイント・的中数を更新
      const { data: currentProfile } = await supabase
        .from("profiles")
        .select("cumulative_points, monthly_points, total_votes, win_hits, place_hits, danger_hits")
        .eq("id", vote.user_id)
        .single();

      if (currentProfile) {
        const placeHitCount = placePicks.filter((pp: any) =>
          top3EntryIds.includes(pp.race_entry_id)
        ).length;

        await supabase
          .from("profiles")
          .update({
            cumulative_points: currentProfile.cumulative_points + votePoints,
            monthly_points: currentProfile.monthly_points + votePoints,
            total_votes: currentProfile.total_votes + 1,
            win_hits: currentProfile.win_hits + (winHit ? 1 : 0),
            place_hits: currentProfile.place_hits + placeHitCount,
            danger_hits: currentProfile.danger_hits + (dangerHit ? 1 : 0),
          })
          .eq("id", vote.user_id);
      }

      // 8. 大会エントリーを更新
      const now = new Date();
      const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

      const { data: contest } = await supabase
        .from("contests")
        .select("id, min_votes")
        .eq("year_month", yearMonth)
        .eq("status", "active")
        .maybeSingle();

      if (contest) {
        // upsert
        const { data: existing } = await supabase
          .from("contest_entries")
          .select("id, total_points, vote_count")
          .eq("contest_id", contest.id)
          .eq("user_id", vote.user_id)
          .maybeSingle();

        if (existing) {
          const newVoteCount = existing.vote_count + 1;
          await supabase
            .from("contest_entries")
            .update({
              total_points: existing.total_points + votePoints,
              vote_count: newVoteCount,
              is_eligible: newVoteCount >= contest.min_votes,
            })
            .eq("id", existing.id);
        } else {
          await supabase.from("contest_entries").insert({
            contest_id: contest.id,
            user_id: vote.user_id,
            total_points: votePoints,
            vote_count: 1,
            is_eligible: 1 >= contest.min_votes,
          });
        }
      }

      // 8.5 バッジ自動付与チェック
      const isUpset = winHit && winnerPopularity >= 10;
      const isG1Win = winHit && race.grade === "G1";
      await checkAndGrantBadges(vote.user_id, {
        isPerfect,
        isUpset,
        isG1Win,
      });

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

  return {
    success: errors.length === 0,
    settled_votes: settledVotes,
    total_points_awarded: totalPointsAwarded,
    errors,
  };
}
