import { createClient } from "@supabase/supabase-js";
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const { data } = await s.from("ai_predictions")
  .select("predictor_id, horse_name, umaban")
  .eq("race_id", "1a47e983-130e-49cb-bc38-c5f1ee3d809e");

console.log("=== NHKマイルC AI予想 ===");
for (const p of (data || [])) {
  console.log(`${p.predictor_id}: ◎${p.umaban} ${p.horse_name}`);
}

const { data: g } = await s.from("ai_predictions")
  .select("predictor_id, horse_name, umaban, races(name, race_number, course_name, race_date)")
  .eq("predictor_id", "gantetsu");

const sun = (g || []).filter(d => d.races?.race_date === "2026-05-10");
console.log("\n=== ガンテツ 5/10予想 ===");
if (sun.length) {
  sun.forEach(d => console.log(`${d.races?.course_name} ${d.races?.race_number}R ${d.races?.name} ◎${d.umaban}${d.horse_name}`));
} else {
  console.log("予想なし");
}
