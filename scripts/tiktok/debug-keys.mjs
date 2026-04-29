import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
const envFile = readFileSync(new URL('../../.env.local', import.meta.url), 'utf-8');
const env = Object.fromEntries(
  envFile.split('\n').filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0,i).trim(), l.slice(i+1).trim()]; })
);
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// racesのexternal_id
const { data: race } = await supabase.from('races')
  .select('id, external_id, name')
  .eq('id', '925869ca-7e0b-4792-ab7c-36562ea1ade5').single();
console.log('races.external_id:', race.external_id);

// jrdb_race_entriesのrace_keyサンプル
const { data: jrdb } = await supabase.from('jrdb_race_entries')
  .select('race_key, horse_name, base_odds, base_popularity, idm')
  .like('race_key', '%0211')
  .limit(5);
console.log('\njrdb_race_entries (race_key like %0211):');
jrdb?.forEach(e => console.log(`  ${e.race_key} | ${e.horse_name} | odds:${e.base_odds} pop:${e.base_popularity} idm:${e.idm}`));

// フローラSっぽいデータを探す
const { data: flora } = await supabase.from('jrdb_race_entries')
  .select('race_key, horse_name, base_odds')
  .eq('horse_name', 'ペンダント')
  .limit(3);
console.log('\nペンダントの出走記録:');
flora?.forEach(e => console.log(`  race_key: ${e.race_key} | odds: ${e.base_odds}`));
