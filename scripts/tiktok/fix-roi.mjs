import { createClient } from "@supabase/supabase-js";
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const predictorIds = ['hayate','kazan','hakusen','hibari','gantetsu'];
const yearMonth = '2026-05';

for (const pid of predictorIds) {
  const { data: results } = await s
    .from("ai_prediction_results")
    .select("is_honmei_win, honmei_win_odds")
    .eq("predictor_id", pid);

  if (!results?.length) continue;

  const total = results.length;
  // 回収率 = 的中時オッズ合計 / 予想数 × 100
  const totalReturn = results.reduce((sum, r) => {
    if (r.is_honmei_win && r.honmei_win_odds) return sum + r.honmei_win_odds;
    return sum;
  }, 0);
  const roi = total > 0 ? Math.round((totalReturn / total) * 1000) / 10 : 0;

  const { error } = await s.from("ai_monthly_stats")
    .update({ roi_win: roi })
    .eq("predictor_id", pid)
    .eq("year_month", yearMonth);

  console.log(`${pid}: ${total}予想, 回収率 ${roi}%, error: ${error?.message ?? 'none'}`);
}
