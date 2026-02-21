import { SupabaseClient } from "@supabase/supabase-js";
import { checkAndGrantBadges } from "@/lib/badges";
import { checkRankUp } from "@/lib/rank-check";
import {
  getWinPointsByOdds,
  getPlacePointsByOdds,
  getQuinellaPointsByOdds,
  getWidePointsByOdds,
  getTrioPointsByOdds,
  getBackMultiplier,
  getDangerPoints,
  getGradeBonus,
  getExactaBonus,
  getTrifectaBonus,
  POINT_RULES,
} from "@/lib/constants/ranks";

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

  // 3. 払戻情報を取得
  const { data: payouts } = await supabase
    .from("payouts")
    .select("*")
    .eq("race_id", raceId);

  // 払戻情報をマップ化
  const payoutMap = new Map<string, { combination: string; payout_amount: number }[]>();
  for (const p of payouts ?? []) {
    if (!payoutMap.has(p.bet_type)) payoutMap.set(p.bet_type, []);
    payoutMap.get(p.bet_type)!.push({ combination: p.combination, payout_amount: p.payout_amount });
  }

  // 結果情報を整理
  const winner = results.find((r) => r.finish_position === 1);
  const winnerEntryId = winner?.race_entry_id;
  const winnerOdds = winner?.race_entries?.odds ?? 1;
  const winnerPopularity = winner?.race_entries?.popularity ?? 1;

  const top3 = results.filter((r) => r.finish_position <= 3);
  const top3EntryIds = top3.map((r) => r.race_entry_id);
  const top3PostNumbers = top3.map((r) => r.race_entries?.post_number).filter(Boolean).sort((a, b) => a - b);

  // 1着・2着の馬番（馬連用）
  const first = results.find((r) => r.finish_position === 1);
  const second = results.find((r) => r.finish_position === 2);
  const firstPostNum = first?.race_entries?.post_number;
  const secondPostNum = second?.race_entries?.post_number;

  if (!winnerEntryId) {
    return { success: false, settled_votes: 0, total_points_awarded: 0, errors: ["1着が見つかりません"] };
  }

  // エントリー情報をマップ化
  const entryMap = new Map<string, { post_number: number; odds: number | null; popularity: number | null }>();
  for (const r of results) {
    if (r.race_entries) {
      entryMap.set(r.race_entry_id, {
        post_number: r.race_entries.post_number,
        odds: r.race_entries.odds,
        popularity: r.race_entries.popularity,
      });
    }
  }

  // 4. 全投票を取得（pending のみ）
  const { data: votes, error: votesErr } = await supabase
    .from("votes").select("*, vote_picks(*)").eq("race_id", raceId).eq("status", "pending");

  if (votesErr) {
    return { success: false, settled_votes: 0, total_points_awarded: 0, errors: [votesErr.message] };
  }

  if (!votes || votes.length === 0) {
    await supabase.from("races").update({ status: "finished" }).eq("id", raceId);
    return { success: true, settled_votes: 0, total_points_awarded: 0, errors: [] };
  }

  // 5. 各投票のポイント計算
  for (const vote of votes) {
    try {
      let votePoints = 0;
      const transactions: { reason: string; amount: number; description: string }[] = [];
      let anyHit = false;
      let winHit = false;
      let allPlaceHit = true;
      let dangerHit = false;

      // 馬券バッジ用のオッズ記録
      let hitWinOdds: number | undefined;
      let hitQuinellaOdds: number | undefined;
      let hitWideCount = 0;
      let hitTrioOdds: number | undefined;

      const picks = vote.vote_picks ?? [];

      // 各タイプのpickを取得
      const winPick = picks.find((p: any) => p.pick_type === "win");
      const placePicks = picks.filter((p: any) => p.pick_type === "place");
      const backPicks = picks.filter((p: any) => p.pick_type === "back");
      const dangerPickItem = picks.find((p: any) => p.pick_type === "danger");

      const backCount = backPicks.length;

      // --- 単勝的中判定（オッズ連動）---
      if (winPick) {
        if (winPick.race_entry_id === winnerEntryId) {
          const basePts = getWinPointsByOdds(winnerOdds);
          const pts = basePts + gradeBonus;
          votePoints += pts;
          winHit = true;
          anyHit = true;
          hitWinOdds = winnerOdds; // バッジ用に記録

          const gradeLabel = gradeBonus > 0 ? `（${race.grade}+${gradeBonus}）` : "";
          transactions.push({
            reason: "win_hit",
            amount: pts,
            description: `単勝的中（${winnerOdds}倍）+${basePts}P${gradeLabel}`,
          });

          await supabase.from("vote_picks")
            .update({ is_hit: true, points_earned: pts }).eq("id", winPick.id);
        } else {
          await supabase.from("vote_picks")
            .update({ is_hit: false, points_earned: 0 }).eq("id", winPick.id);
        }
      }

      // --- 複勝的中判定（◎が3着以内）---
      if (winPick && top3EntryIds.includes(winPick.race_entry_id) && !winHit) {
        // ◎が3着以内だが1着ではない場合（単勝外れ、複勝的中）
        const winEntryInfo = entryMap.get(winPick.race_entry_id);
        const winPostNum = winEntryInfo?.post_number;
        const placePayout = payoutMap.get("place")?.find(p => p.combination === String(winPostNum));
        const placeOdds = placePayout ? placePayout.payout_amount / 100 : 1.5;

        const basePts = getPlacePointsByOdds(placeOdds);
        const pts = basePts + gradeBonus;
        votePoints += pts;
        anyHit = true;

        const gradeLabel = gradeBonus > 0 ? `（${race.grade}+${gradeBonus}）` : "";
        transactions.push({
          reason: "place_hit",
          amount: pts,
          description: `複勝的中（◎${winPostNum}番→3着以内、${placeOdds.toFixed(1)}倍）+${basePts}P${gradeLabel}`,
        });
      }

      // --- 対抗（○）の的中判定（ポイントなし、is_hitのみ更新）---
      for (const pp of placePicks) {
        const isPlaceHit = top3EntryIds.includes(pp.race_entry_id);
        if (!isPlaceHit) allPlaceHit = false;
        await supabase.from("vote_picks")
          .update({ is_hit: isPlaceHit, points_earned: 0 }).eq("id", pp.id);
      }
      if (placePicks.length === 0) allPlaceHit = false;

      // --- 馬連的中判定（◎○が1-2着）+ 馬単ボーナス ---
      if (winPick && placePicks.length > 0 && firstPostNum && secondPostNum) {
        const winPostNum = entryMap.get(winPick.race_entry_id)?.post_number;
        
        for (const pp of placePicks) {
          const placePostNum = entryMap.get(pp.race_entry_id)?.post_number;
          
          // ◎○が1-2着（順不同）
          const isQuinellaHit = 
            (winPostNum === firstPostNum && placePostNum === secondPostNum) ||
            (winPostNum === secondPostNum && placePostNum === firstPostNum);
          
          if (isQuinellaHit) {
            // 馬連払戻からオッズを取得
            const combo = [winPostNum, placePostNum].sort((a, b) => a! - b!).join("-");
            const quinellaPayout = payoutMap.get("quinella")?.find(p => 
              p.combination.replace(/[ー－]/g, "-") === combo
            );
            const quinellaOdds = quinellaPayout ? quinellaPayout.payout_amount / 100 : 10;

            let basePts = getQuinellaPointsByOdds(quinellaOdds);
            
            // 馬単ボーナス: 1着◎、2着○の順番通りなら2倍
            const isExactaHit = winPostNum === firstPostNum && placePostNum === secondPostNum;
            if (isExactaHit) {
              basePts = Math.floor(basePts * getExactaBonus());
            }
            
            const pts = basePts + gradeBonus;
            votePoints += pts;
            anyHit = true;
            hitQuinellaOdds = quinellaOdds; // バッジ用に記録

            const gradeLabel = gradeBonus > 0 ? `（${race.grade}+${gradeBonus}）` : "";
            const exactaLabel = isExactaHit ? `【馬単ボーナス×${getExactaBonus()}】` : "";
            transactions.push({
              reason: isExactaHit ? "exacta_hit" : "quinella_hit",
              amount: pts,
              description: `馬連的中（${quinellaOdds.toFixed(1)}倍）${exactaLabel}+${basePts}P${gradeLabel}`,
            });
            break; // 馬連は1回のみ
          }
        }
      }

      // --- ワイド的中判定（◎○が3着以内）---
      if (winPick && placePicks.length > 0) {
        const winInTop3 = top3EntryIds.includes(winPick.race_entry_id);
        const winPostNum = entryMap.get(winPick.race_entry_id)?.post_number;

        for (const pp of placePicks) {
          const placeInTop3 = top3EntryIds.includes(pp.race_entry_id);
          const placePostNum = entryMap.get(pp.race_entry_id)?.post_number;

          if (winInTop3 && placeInTop3 && winPostNum && placePostNum) {
            // ワイド払戻からオッズを取得
            const combo = [winPostNum, placePostNum].sort((a, b) => a - b).join("-");
            const widePayout = payoutMap.get("wide")?.find(p => 
              p.combination.replace(/[ー－]/g, "-") === combo
            );
            const wideOdds = widePayout ? widePayout.payout_amount / 100 : 3;

            const basePts = getWidePointsByOdds(wideOdds);
            const pts = basePts + gradeBonus;
            votePoints += pts;
            anyHit = true;
            hitWideCount++; // バッジ用にカウント

            const gradeLabel = gradeBonus > 0 ? `（${race.grade}+${gradeBonus}）` : "";
            transactions.push({
              reason: "wide_hit",
              amount: pts,
              description: `ワイド的中（${wideOdds.toFixed(1)}倍）+${basePts}P${gradeLabel}`,
            });
          }
        }
      }

      // --- 三連複的中判定（◎○○/◎○△/◎△△が1-2-3着）+ 3連単ボーナス ---
      if (winPick && top3PostNumbers.length === 3) {
        const winInTop3 = top3EntryIds.includes(winPick.race_entry_id);
        
        if (winInTop3) {
          // ◎以外の3着以内のエントリーを取得
          const otherTop3 = top3EntryIds.filter(id => id !== winPick.race_entry_id);
          
          // ○で的中した馬
          const placeHitsInTop3 = placePicks.filter((pp: any) => otherTop3.includes(pp.race_entry_id));
          // △で的中した馬
          const backHitsInTop3 = backPicks.filter((bp: any) => otherTop3.includes(bp.race_entry_id));

          // 三連複的中条件: ◎が3着以内 + 残り2頭が○または△で的中
          const totalHits = placeHitsInTop3.length + backHitsInTop3.length;
          
          if (totalHits >= 2) {
            // 三連複払戻からオッズを取得
            const trioCombination = top3PostNumbers.join("-");
            const trioPayout = payoutMap.get("trio")?.find(p => 
              p.combination.replace(/[ー－]/g, "-").split("-").sort().join("-") === trioCombination
            );
            const trioOdds = trioPayout ? trioPayout.payout_amount / 100 : 30;

            let basePts = getTrioPointsByOdds(trioOdds);
            
            // 3連単ボーナス判定: 1着◎、2着○、3着○or△の順番通り
            const winEntryId = winPick.race_entry_id;
            const secondEntryId = second?.race_entry_id;
            const thirdResult = results.find((r) => r.finish_position === 3);
            const thirdEntryId = thirdResult?.race_entry_id;
            
            const isWinFirst = winEntryId === first?.race_entry_id;
            const secondIsPlace = placePicks.some((pp: any) => pp.race_entry_id === secondEntryId);
            const thirdIsPlace = placePicks.some((pp: any) => pp.race_entry_id === thirdEntryId);
            const thirdIsBack = backPicks.some((bp: any) => bp.race_entry_id === thirdEntryId);
            
            let trifectaBonus = 1.0;
            let trifectaLabel = "";
            
            // 1着◎、2着○、3着○ → 5倍
            if (isWinFirst && secondIsPlace && thirdIsPlace) {
              trifectaBonus = getTrifectaBonus("place");
              trifectaLabel = `【3連単ボーナス×${trifectaBonus}】`;
            }
            // 1着◎、2着○、3着△ → 3倍
            else if (isWinFirst && secondIsPlace && thirdIsBack) {
              trifectaBonus = getTrifectaBonus("back");
              trifectaLabel = `【3連単ボーナス×${trifectaBonus}】`;
            }
            
            // 3連単ボーナス適用
            if (trifectaBonus > 1.0) {
              basePts = Math.floor(basePts * trifectaBonus);
            }
            // △が含まれる場合は倍率適用（3連単ボーナスがない場合のみ）
            else if (backHitsInTop3.length > 0) {
              const multiplier = getBackMultiplier(backCount);
              basePts = Math.floor(basePts * multiplier);
            }

            const pts = basePts + gradeBonus;
            votePoints += pts;
            anyHit = true;
            hitTrioOdds = trioOdds; // バッジ用に記録

            const gradeLabel = gradeBonus > 0 ? `（${race.grade}+${gradeBonus}）` : "";
            const backLabel = (backHitsInTop3.length > 0 && trifectaBonus === 1.0) ? `（△${backCount}頭×${getBackMultiplier(backCount)}）` : "";
            transactions.push({
              reason: trifectaBonus > 1.0 ? "trifecta_hit" : "trio_hit",
              amount: pts,
              description: `三連複的中（${trioOdds.toFixed(1)}倍）${trifectaLabel}+${basePts}P${backLabel}${gradeLabel}`,
            });
          }
        }
      }

      // --- △（抑え）のis_hit更新 ---
      for (const bp of backPicks) {
        const isHit = top3EntryIds.includes(bp.race_entry_id);
        await supabase.from("vote_picks")
          .update({ is_hit: isHit, points_earned: 0 }).eq("id", bp.id);
      }

      // --- 危険馬的中判定（人気別ポイント）---
      if (dangerPickItem) {
        const dangerFinish = results.find((r) => r.race_entry_id === dangerPickItem.race_entry_id);
        if (dangerFinish && dangerFinish.finish_position > 3) {
          const dangerPop = entryMap.get(dangerPickItem.race_entry_id)?.popularity ?? 99;
          const basePts = getDangerPoints(dangerPop);
          const pts = basePts + gradeBonus;
          votePoints += pts;
          dangerHit = true;
          anyHit = true;

          const gradeLabel = gradeBonus > 0 ? `（${race.grade}+${gradeBonus}）` : "";
          const popLabel = dangerPop !== 99 ? `${dangerPop}番人気` : "人気不明";
          transactions.push({
            reason: "danger_hit",
            amount: pts,
            description: `危険馬的中（${popLabel}）+${basePts}P${gradeLabel}`,
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

      // 6. 投票ステータスを更新
      const status = anyHit ? "settled_hit" : "settled_miss";
      await supabase.from("votes").update({
        status, earned_points: votePoints, is_perfect: isPerfect,
        settled_at: new Date().toISOString(),
      }).eq("id", vote.id);

      // 7. ポイント履歴を登録（エラーチェック追加）
      if (transactions.length > 0) {
        const { error: txError } = await supabase.from("points_transactions").insert(
          transactions.map((tx) => ({
            user_id: vote.user_id, vote_id: vote.id, race_id: raceId,
            amount: tx.amount, reason: tx.reason, description: tx.description,
          }))
        );
        
        if (txError) {
          console.error(`[settle-race] points_transactions insert error for vote ${vote.id}:`, txError);
          errors.push(`投票 ${vote.id} のトランザクション登録エラー: ${txError.message}`);
        }
      }

      // 8. プロフィールのポイント・的中数を更新
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

      // 9. 大会エントリーを更新
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

      // 9b. 週間大会エントリーを更新
      const { data: weeklyContestRace } = await supabase
        .from("contest_races")
        .select("contest_id, race_order")
        .eq("race_id", raceId)
        .maybeSingle();

      if (weeklyContestRace) {
        const { data: weeklyContest } = await supabase
          .from("contests")
          .select("id")
          .eq("id", weeklyContestRace.contest_id)
          .eq("type", "weekly")
          .eq("status", "active")
          .maybeSingle();

        if (weeklyContest) {
          const wcId = weeklyContest.id;
          const raceOrder = weeklyContestRace.race_order;

          // 連続的中ストリーク計算（現在のレースから逆順にチェック）
          let consecutiveHits = 0;
          if (anyHit) {
            consecutiveHits = 1;
            const { data: allContestRaces } = await supabase
              .from("contest_races")
              .select("race_id, race_order")
              .eq("contest_id", wcId)
              .lt("race_order", raceOrder)
              .order("race_order", { ascending: false });

            if (allContestRaces) {
              for (const cr of allContestRaces) {
                const { data: prevVote } = await supabase
                  .from("votes")
                  .select("status")
                  .eq("race_id", cr.race_id)
                  .eq("user_id", vote.user_id)
                  .in("status", ["settled_hit", "settled_miss"])
                  .maybeSingle();
                if (prevVote?.status === "settled_hit") {
                  consecutiveHits++;
                } else {
                  break;
                }
              }
            }
          }

          // ストリークボーナス（到達時のみ加算）
          let newStreakPts = 0;
          if (consecutiveHits === 2) newStreakPts = 20;
          else if (consecutiveHits === 3) newStreakPts = 50;
          else if (consecutiveHits === 4) newStreakPts = 100;
          else if (consecutiveHits === 5) newStreakPts = 200;

          const weeklyTotalPts = votePoints + newStreakPts;

          const { data: wcEntry } = await supabase
            .from("contest_entries")
            .select("id, total_points, vote_count, hit_race_count, streak_bonus, earliest_vote_at")
            .eq("contest_id", wcId)
            .eq("user_id", vote.user_id)
            .maybeSingle();

          if (wcEntry) {
            await supabase.from("contest_entries").update({
              total_points: wcEntry.total_points + weeklyTotalPts,
              vote_count: wcEntry.vote_count + 1,
              hit_race_count: (wcEntry.hit_race_count ?? 0) + (anyHit ? 1 : 0),
              streak_bonus: (wcEntry.streak_bonus ?? 0) + newStreakPts,
              earliest_vote_at: wcEntry.earliest_vote_at ?? vote.created_at,
              is_eligible: (wcEntry.vote_count + 1) >= 3, // 3レース以上で参加資格
            }).eq("id", wcEntry.id);
          } else {
            await supabase.from("contest_entries").insert({
              contest_id: wcId, user_id: vote.user_id,
              total_points: weeklyTotalPts, vote_count: 1,
              hit_race_count: anyHit ? 1 : 0,
              streak_bonus: newStreakPts,
              earliest_vote_at: vote.created_at,
              is_eligible: false, // 3レース以上で参加資格
            });
          }

          if (newStreakPts > 0) {
            const { error: streakTxError } = await supabase.from("points_transactions").insert({
              user_id: vote.user_id, vote_id: vote.id, race_id: raceId,
              amount: newStreakPts, reason: "weekly_streak_bonus",
              description: `週間大会 ${consecutiveHits}連続的中ボーナス +${newStreakPts}P`,
            });
            
            if (streakTxError) {
              console.error(`[settle-race] weekly streak bonus insert error for vote ${vote.id}:`, streakTxError);
            }
          }
        }
      }

      // 10. バッジ自動付与チェック
      const isUpset = winHit && winnerPopularity >= 10;
      const isG1Win = winHit && race.grade === "G1";
      await checkAndGrantBadges(vote.user_id, {
        isPerfect,
        isUpset,
        isG1Win,
        winOdds: hitWinOdds,
        quinellaOdds: hitQuinellaOdds,
        wideCount: hitWideCount,
        trioOdds: hitTrioOdds,
      });

      // 11. ランクアップチェック & 通知
      await checkRankUp(vote.user_id);

      settledVotes++;
      totalPointsAwarded += votePoints;
    } catch (err: any) {
      errors.push(`投票 ${vote.id} のエラー: ${err.message}`);
    }
  }

  // 12. レースステータスを finished に更新
  await supabase.from("races").update({ status: "finished" }).eq("id", raceId);

  return { success: errors.length === 0, settled_votes: settledVotes, total_points_awarded: totalPointsAwarded, errors };
}
