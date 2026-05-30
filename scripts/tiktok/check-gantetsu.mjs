import { createClient } from "@supabase/supabase-js";
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const { data } = await s.from("ai_predictions")
  .select("horse_name, umaban, races(name, race_number, course_name, race_date)")
  .eq("predictor_id", "gantetsu");

const sun = (data || []).filter(d => d.races?.race_date === "2026-05-17");
console.log("=== ガンテツ 5/17予想 ===");
if (sun.length) {
  sun.forEach(d => console.log(`${d.races?.course_name} ${d.races?.race_number}R ${d.races?.name} ◎${d.umaban}${d.horse_name}`));
} else {
  console.log("予想なし（基準未達）");
}
