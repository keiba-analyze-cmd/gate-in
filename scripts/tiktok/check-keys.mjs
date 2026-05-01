import { createClient } from "@supabase/supabase-js";
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// 1. racesテーブルのexternal_id例
const { data: races } = await s.from("races").select("name, race_date, external_id, course_name").eq("race_date", "2026-04-26").limit(5);
console.log("=== races.external_id 例 ===");
races?.forEach(r => console.log(`  ${r.name} | ${r.course_name} | external_id: "${r.external_id}" (len:${r.external_id?.length})`));

// 2. jrdb_race_entriesのrace_key例（4/26付近）
const { data: entries } = await s.from("jrdb_race_entries").select("race_key, horse_name").like("race_key", "2605%").limit(5);
console.log("\n=== jrdb_race_entries race_key (2605%) ===");
entries?.forEach(e => console.log(`  race_key: "${e.race_key}" | ${e.horse_name}`));

// 3. jrdb_race_entriesのrace_key例（直近）
const { data: recent } = await s.from("jrdb_race_entries").select("race_key").order("race_key", { ascending: false }).limit(5);
console.log("\n=== jrdb_race_entries 最新 race_key ===");
recent?.forEach(e => console.log(`  "${e.race_key}"`));

// 4. jrdb_race_resultsの最新
const { data: recentRes } = await s.from("jrdb_race_results").select("race_key").order("race_key", { ascending: false }).limit(5);
console.log("\n=== jrdb_race_results 最新 race_key ===");
recentRes?.forEach(e => console.log(`  "${e.race_key}"`));

// 5. フローラSのexternal_idから手動変換テスト
const flora = races?.find(r => r.name?.includes("フローラ"));
if (flora) {
  const eid = flora.external_id;
  console.log(`\n=== フローラS external_id 変換テスト ===`);
  console.log(`  full: "${eid}"`);
  console.log(`  slice(0,8): "${eid?.slice(0,8)}"`);
  console.log(`  slice(2,10): "${eid?.slice(2,10)}"`);
  console.log(`  slice(2,12): "${eid?.slice(2,12)}"`);
}
