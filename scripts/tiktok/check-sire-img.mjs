import { createClient } from "@supabase/supabase-js";
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// 1. sire_name確認
const { data: entries } = await s.from("jrdb_race_entries")
  .select("race_key, umaban, horse_name, sire_name, horse_code")
  .eq("race_key", "05262211")  // フローラS
  .limit(5);
console.log("=== フローラS jrdb_race_entries ===");
entries?.forEach(e => console.log(`  ${e.umaban} ${e.horse_name} | sire: ${e.sire_name || "NULL"} | horse_code: ${e.horse_code}`));

// 2. UKCでsire_name取得テスト
if (entries?.[0]?.horse_code) {
  const { data: ukc } = await s.from("jrdb_ukc")
    .select("horse_code, horse_name, sire_name")
    .eq("horse_code", entries[0].horse_code)
    .limit(1);
  console.log("\n=== UKC lookup ===");
  console.log(ukc);
}
