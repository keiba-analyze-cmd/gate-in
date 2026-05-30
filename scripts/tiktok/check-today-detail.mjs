import { createClient } from "@supabase/supabase-js";
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const targetDate = process.argv[2] || "2026-05-16";

const { data } = await s.from("ai_prediction_results")
  .select("predictor_id, is_honmei_win, is_honmei_place, honmei_win_odds, honmei_place_odds, races(name, grade, race_number, course_name)")
  .eq("races.race_date", targetDate)
  .not("races", "is", null);

const byP = {};
for (const r of data || []) {
  const p = r.predictor_id;
  if (!byP[p]) byP[p] = { win: 0, place: 0, total: 0, winReturn: 0, placeReturn: 0, hits: [] };
  byP[p].total++;
  if (r.is_honmei_win) {
    byP[p].win++;
    byP[p].winReturn += (r.honmei_win_odds || 0);
    byP[p].hits.push(`✅ ${r.races?.course_name}${r.races?.race_number}R ${r.races?.name} 1着(${r.honmei_win_odds}倍)`);
  }
  if (r.is_honmei_place) {
    byP[p].place++;
    byP[p].placeReturn += (r.honmei_place_odds || 0);
  }
}

console.log(`=== ${targetDate} AI予想家 結果詳細 ===\n`);
const order = ['hayate','kazan','hakusen','hibari','gantetsu'];
for (const p of order) {
  const d = byP[p];
  if (!d) { console.log(`【${p}】 記録なし\n`); continue; }
  const winRate = (d.win / d.total * 100).toFixed(1);
  const placeRate = (d.place / d.total * 100).toFixed(1);
  const winROI = (d.winReturn / d.total * 100).toFixed(1);
  const placeROI = (d.placeReturn / d.total * 100).toFixed(1);
  console.log(`【${p}】 ${d.total}R`);
  console.log(`  1着: ${d.win}/${d.total} (${winRate}%) | 複勝: ${d.place}/${d.total} (${placeRate}%)`);
  console.log(`  単勝回収率: ${winROI}% | 複勝回収率: ${placeROI}%`);
  if (d.hits.length) d.hits.forEach(h => console.log(`  ${h}`));
  console.log('');
}
