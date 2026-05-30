import { createClient } from "@supabase/supabase-js";
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// オークス AI予想
const { data: oaks } = await s.from("races")
  .select("id, name")
  .eq("race_date", "2026-05-24")
  .ilike("name", "%優駿牝馬%");

if (oaks?.[0]) {
  const { data: preds } = await s.from("ai_predictions")
    .select("predictor_id, horse_name, umaban")
    .eq("race_id", oaks[0].id);
  console.log("=== オークス AI予想 ===");
  for (const p of preds || []) {
    console.log(`${p.predictor_id}: ◎${p.umaban} ${p.horse_name}`);
  }
}

// ガンテツ 5/24
const { data: g } = await s.from("ai_predictions")
  .select("horse_name, umaban, races(name, race_number, course_name, race_date)")
  .eq("predictor_id", "gantetsu");

const sun = (g || []).filter(d => d.races?.race_date === "2026-05-24");
console.log("\n=== ガンテツ 5/24予想 ===");
if (sun.length) {
  sun.forEach(d => console.log(`${d.races?.course_name} ${d.races?.race_number}R ${d.races?.name} ◎${d.umaban}${d.horse_name}`));
} else {
  console.log("予想なし");
}
