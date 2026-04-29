import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
const envFile = readFileSync(new URL('../../.env.local', import.meta.url), 'utf-8');
const env = Object.fromEntries(
  envFile.split('\n').filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0,i).trim(), l.slice(i+1).trim()]; })
);
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// 直近のjrdb_race_entries 1件を全カラム表示
const { data } = await supabase.from('jrdb_race_entries')
  .select('*')
  .not('horse_name', 'is', null)
  .order('created_at', { ascending: false })
  .limit(1);

if (data?.[0]) {
  const row = data[0];
  console.log('=== 最新レコードの全フィールド ===');
  for (const [k, v] of Object.entries(row)) {
    if (v !== null) console.log(`  ${k}: ${v}`);
  }
  console.log('\n=== NULLのフィールド ===');
  for (const [k, v] of Object.entries(row)) {
    if (v === null) process.stdout.write(k + ', ');
  }
  console.log('');
}

// ペンダントのrace_keyでそのレースの全馬を取得
const { data: pend } = await supabase.from('jrdb_race_entries')
  .select('race_key')
  .eq('horse_name', 'ペンダント')
  .order('created_at', { ascending: false })
  .limit(1);

if (pend?.[0]) {
  const rk = pend[0].race_key;
  console.log('\n=== ペンダントのレース (race_key: ' + rk + ') ===');
  const { data: entries } = await supabase.from('jrdb_race_entries')
    .select('umaban, horse_name, idm, base_odds, base_popularity, jockey_name, race_name')
    .eq('race_key', rk)
    .order('umaban');
  entries?.forEach(e => console.log(`  ${e.umaban}番 ${e.horse_name} IDM:${e.idm} odds:${e.base_odds} pop:${e.base_popularity} ${e.jockey_name || ''} ${e.race_name || ''}`));
}
