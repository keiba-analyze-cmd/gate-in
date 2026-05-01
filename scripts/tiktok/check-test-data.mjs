import { createClient } from "@supabase/supabase-js";
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const { data: preds } = await s
  .from("ai_predictions")
  .select("race_id, predictor_id, umaban, races(name, race_date, course_name, grade, external_id)")
  .order("created_at", { ascending: false })
  .limit(50);

const byRace = {};
for (const d of preds || []) {
  const r = d.races;
  if (!r) continue;
  const k = r.name;
  if (!byRace[k]) byRace[k] = { name: r.name, date: r.race_date, venue: r.course_name, grade: r.grade, ext: r.external_id, chars: new Set() };
  byRace[k].chars.add(d.predictor_id);
}

console.log("\n=== AI予想があるレース ===");
for (const r of Object.values(byRace).slice(0, 10)) {
  const raceKey = r.ext ? r.ext.slice(2, 10) : "?";
  const { count: entryCount } = await s.from("jrdb_race_entries").select("*", { count: "exact", head: true }).eq("race_key", raceKey);
  const { count: resultCount } = await s.from("jrdb_race_results").select("*", { count: "exact", head: true }).eq("race_key", raceKey);
  console.log(`${r.date} | ${r.name} | ${r.venue} | ${r.grade || "OP"} | raceKey:${raceKey} | chars:${[...r.chars].join(",")} | entries:${entryCount} | results:${resultCount}`);
}
