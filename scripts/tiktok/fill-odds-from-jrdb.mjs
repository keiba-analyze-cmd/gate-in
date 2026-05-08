import { createClient } from "@supabase/supabase-js";
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// 5/2のレースでoddsがnullのエントリーにJRDBのbase_oddsを反映
const { data: races } = await s.from("races").select("id, name, external_id, race_number, course_name").in("race_date", [new Date(Date.now()+9*3600000).toISOString().slice(0,10), new Date(Date.now()+9*3600000+86400000).toISOString().slice(0,10), new Date(Date.now()+9*3600000-86400000).toISOString().slice(0,10)]);

function toRaceKey(externalId) {
  if (!externalId || externalId.length < 12) return externalId;
  const course = externalId.slice(4, 6);
  const year = externalId.slice(2, 4);
  const kai = externalId.slice(7, 8);
  const day = externalId.slice(9, 10);
  const race = externalId.slice(10, 12);
  return course + year + kai + day + race;
}

let totalUpdated = 0;

for (const race of races || []) {
  const raceKey = toRaceKey(race.external_id);
  
  // JRDBのbase_odds取得
  const { data: jrdbEntries } = await s.from("jrdb_race_entries")
    .select("umaban, base_odds, base_popularity")
    .eq("race_key", raceKey);
  
  if (!jrdbEntries?.length) continue;

  // race_entriesのoddsがnullのものを更新
  const { data: raceEntries } = await s.from("race_entries")
    .select("id, post_number, odds")
    .eq("race_id", race.id)
    .is("odds", null);

  let updated = 0;
  for (const entry of raceEntries || []) {
    const jrdb = jrdbEntries.find(j => j.umaban === entry.post_number);
    if (jrdb?.base_odds) {
      await s.from("race_entries").update({ 
        odds: jrdb.base_odds,
        popularity: jrdb.base_popularity || null
      }).eq("id", entry.id);
      updated++;
    }
  }
  if (updated > 0) {
    console.log(`${race.name}: ${updated}頭のオッズ更新`);
    totalUpdated += updated;
  }
}

console.log(`\n合計: ${totalUpdated}頭更新`);
