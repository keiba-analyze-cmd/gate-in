import { createClient } from "@supabase/supabase-js";
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// JRDBのrace_keyサンプル
const { data: jrdbSample } = await s.from("jrdb_race_entries").select("race_key").limit(5);
console.log("JRDB race_keys:", jrdbSample?.map(e => e.race_key));

// racesのexternal_idサンプル
const { data: raceSample } = await s.from("races").select("id, external_id, name").not("external_id","is",null).limit(5);
console.log("\nRaces:");
raceSample?.forEach(r => {
  const eid = r.external_id;
  const rk = eid.slice(4,6) + eid.slice(2,4) + eid.slice(7,8) + eid.slice(9,10) + eid.slice(10,12);
  console.log(`  ${r.name} | external_id: ${eid} | converted: ${rk}`);
});

// race_resultsのサンプル
const { data: rrSample } = await s.from("race_results").select("race_id, finish_position").limit(3);
console.log("\nrace_results sample:", rrSample);

// マッチする数を確認
const { data: races } = await s.from("races").select("id, external_id").not("external_id","is",null);
const { data: jrdbKeys } = await s.from("jrdb_race_entries").select("race_key");
const jrdbKeySet = new Set(jrdbKeys?.map(e => e.race_key));

let matched = 0;
for (const race of races || []) {
  const eid = race.external_id;
  const rk = eid.slice(4,6) + eid.slice(2,4) + eid.slice(7,8) + eid.slice(9,10) + eid.slice(10,12);
  if (jrdbKeySet.has(rk)) matched++;
}
console.log(`\nマッチ: ${matched}/${races?.length} | JRDBキー数: ${jrdbKeySet.size}`);
