import { createClient } from "@supabase/supabase-js";
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// 5/30-31 重賞・OP
const { data: races } = await s.from("races")
  .select("id, name, grade, race_date, course_name, race_number")
  .in("race_date", ["2026-05-30", "2026-05-31"])
  .not("grade", "is", null)
  .order("race_date")
  .order("race_number", { ascending: false });

console.log("=== 5/30-31 重賞・OP ===");
for (const r of races || []) {
  console.log(`${r.race_date} ${r.course_name} ${r.race_number}R ${r.name} (${r.grade})`);
}

// ガンテツ
const { data: g } = await s.from("ai_predictions")
  .select("horse_name, umaban, races(name, race_number, course_name, race_date)")
  .eq("predictor_id", "gantetsu");

const weekend = (g || []).filter(d => ["2026-05-30","2026-05-31"].includes(d.races?.race_date));
console.log("\n=== ガンテツ 5/30-31予想 ===");
if (weekend.length) {
  weekend.forEach(d => console.log(`${d.races?.race_date} ${d.races?.course_name} ${d.races?.race_number}R ${d.races?.name} ◎${d.umaban}${d.horse_name}`));
} else {
  console.log("予想なし");
}

// ダービー・目黒記念のAI予想
for (const keyword of ["ダービー", "目黒記念", "葵S"]) {
  const race = races?.find(r => r.name.includes(keyword));
  if (race) {
    const { data: preds } = await s.from("ai_predictions")
      .select("predictor_id, horse_name, umaban")
      .eq("race_id", race.id);
    console.log(`\n=== ${race.name} AI予想 ===`);
    for (const p of preds || []) {
      console.log(`${p.predictor_id}: ◎${p.umaban} ${p.horse_name}`);
    }
  }
}
