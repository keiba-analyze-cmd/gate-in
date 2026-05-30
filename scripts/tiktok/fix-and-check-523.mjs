import { createClient } from "@supabase/supabase-js";
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// 平安SのグレードをG3に修正
const { data: heian } = await s.from("races")
  .select("id, name, grade")
  .eq("race_date", "2026-05-23")
  .ilike("name", "%平安%");

for (const r of heian || []) {
  console.log(`平安S: 現在 grade=${r.grade}`);
  if (r.grade !== "G3") {
    await s.from("races").update({ grade: "G3" }).eq("id", r.id);
    console.log("→ G3に修正完了");
  }
}

// オークスのグレード確認
const { data: oaks } = await s.from("races")
  .select("id, name, grade")
  .eq("race_date", "2026-05-24")
  .ilike("name", "%オークス%");
for (const r of oaks || []) {
  console.log(`オークス: grade=${r.grade}`);
}

// 5/23-24 重賞・OP一覧
const { data: races } = await s.from("races")
  .select("id, name, grade, race_date, course_name, race_number")
  .in("race_date", ["2026-05-23", "2026-05-24"])
  .not("grade", "is", null)
  .order("race_date")
  .order("race_number", { ascending: false });

console.log("\n=== 5/23-24 重賞・OP ===");
for (const r of races || []) {
  console.log(`${r.race_date} ${r.course_name} ${r.race_number}R ${r.name} (${r.grade})`);
}

// ガンテツ 5/23-24
const { data: g } = await s.from("ai_predictions")
  .select("horse_name, umaban, races(name, race_number, course_name, race_date)")
  .eq("predictor_id", "gantetsu");

const weekend = (g || []).filter(d => ["2026-05-23","2026-05-24"].includes(d.races?.race_date));
console.log("\n=== ガンテツ 5/23-24予想 ===");
if (weekend.length) {
  weekend.forEach(d => console.log(`${d.races?.race_date} ${d.races?.course_name} ${d.races?.race_number}R ${d.races?.name} ◎${d.umaban}${d.horse_name}`));
} else {
  console.log("予想なし");
}

// 平安S AI予想
const heianRace = races?.find(r => r.name.includes("平安"));
if (heianRace) {
  const { data: preds } = await s.from("ai_predictions")
    .select("predictor_id, horse_name, umaban")
    .eq("race_id", heianRace.id);
  console.log(`\n=== ${heianRace.name} AI予想 ===`);
  for (const p of preds || []) {
    console.log(`${p.predictor_id}: ◎${p.umaban} ${p.horse_name}`);
  }
}

// オークス AI予想
const oaksRace = oaks?.[0];
if (oaksRace) {
  const { data: preds } = await s.from("ai_predictions")
    .select("predictor_id, horse_name, umaban")
    .eq("race_id", oaksRace.id);
  console.log(`\n=== オークス AI予想 ===`);
  for (const p of preds || []) {
    console.log(`${p.predictor_id}: ◎${p.umaban} ${p.horse_name}`);
  }
}
