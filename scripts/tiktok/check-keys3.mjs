import { createClient } from "@supabase/supabase-js";
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// 正しい変換関数
function toRaceKeyFixed(externalId) {
  if (!externalId || externalId.length < 12) return externalId;
  const course = externalId.slice(4, 6);
  const year = externalId.slice(2, 4);
  const kai = externalId.slice(7, 8);
  const day = externalId.slice(9, 10);
  const race = externalId.slice(10, 12);
  return course + year + kai + day + race;
}

// 旧変換（buggy）
function toRaceKeyOld(externalId) {
  return externalId?.slice(2, 10);
}

// AI予想があるレースで検証
const { data: preds } = await s
  .from("ai_predictions")
  .select("race_id, predictor_id, races(name, race_date, course_name, grade, external_id)")
  .order("created_at", { ascending: false })
  .limit(30);

const seen = new Set();
console.log("=== race_key 変換テスト ===\n");
for (const d of preds || []) {
  const r = d.races;
  if (!r || seen.has(r.external_id)) continue;
  seen.add(r.external_id);

  const oldKey = toRaceKeyOld(r.external_id);
  const newKey = toRaceKeyFixed(r.external_id);

  const { count: oldCount } = await s.from("jrdb_race_entries").select("*", { count: "exact", head: true }).eq("race_key", oldKey);
  const { count: newCount } = await s.from("jrdb_race_entries").select("*", { count: "exact", head: true }).eq("race_key", newKey);
  const { count: resCount } = await s.from("jrdb_race_results").select("*", { count: "exact", head: true }).eq("race_key", newKey);

  const status = newCount > 0 && resCount > 0 ? "✅ ALL" : newCount > 0 ? "⚠️ entries only" : "❌ NONE";
  console.log(`${r.race_date} ${r.name.padEnd(15)} ext:${r.external_id} | old:"${oldKey}"→${oldCount} | new:"${newKey}"→entries:${newCount} results:${resCount} ${status}`);
}
