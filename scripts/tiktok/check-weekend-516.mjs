import { createClient } from "@supabase/supabase-js";
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// 重賞・OP
const { data: races } = await s.from("races")
  .select("id, name, grade, race_date, course_name, race_number")
  .in("race_date", ["2026-05-16", "2026-05-17"])
  .not("grade", "is", null)
  .order("race_date")
  .order("race_number", { ascending: false });

console.log("=== 5/16-17 重賞・OP ===");
for (const r of races || []) {
  console.log(`${r.race_date} ${r.course_name} ${r.race_number}R ${r.name} (${r.grade})`);
}

// ガンテツ
const { data: g } = await s.from("ai_predictions")
  .select("predictor_id, horse_name, umaban, races(name, race_number, course_name, race_date)")
  .eq("predictor_id", "gantetsu");

const weekend = (g || []).filter(d => ["2026-05-16","2026-05-17"].includes(d.races?.race_date));
console.log("\n=== ガンテツ予想 ===");
if (weekend.length) {
  weekend.forEach(d => console.log(`${d.races?.race_date} ${d.races?.course_name} ${d.races?.race_number}R ${d.races?.name} ◎${d.umaban}${d.horse_name}`));
} else {
  console.log("予想なし");
}

// NHKマイルC級の注目レース AI予想
const bigRace = races?.find(r => r.grade === "G1" || r.grade === "G2");
if (bigRace) {
  const { data: preds } = await s.from("ai_predictions")
    .select("predictor_id, horse_name, umaban")
    .eq("race_id", bigRace.id);
  console.log(`\n=== ${bigRace.name} AI予想 ===`);
  for (const p of preds || []) {
    console.log(`${p.predictor_id}: ◎${p.umaban} ${p.horse_name}`);
  }
}
