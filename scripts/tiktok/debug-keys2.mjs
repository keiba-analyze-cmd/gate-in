import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
const envFile = readFileSync(new URL('../../.env.local', import.meta.url), 'utf-8');
const env = Object.fromEntries(
  envFile.split('\n').filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0,i).trim(), l.slice(i+1).trim()]; })
);
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// フローラSの条件で検索
const { data } = await supabase.from('jrdb_race_entries')
  .select('race_key, race_date, course_name, race_number, umaban, horse_name, base_odds, base_popularity, idm, jockey_name')
  .eq('race_date', '2026-04-26')
  .eq('course_name', '東京')
  .eq('race_number', 11)
  .order('umaban');

if (data?.length) {
  console.log(`フローラS（東京11R 4/26）: ${data.length}頭`);
  data.forEach(e => console.log(`  ${e.umaban}番 ${e.horse_name} | odds:${e.base_odds} pop:${e.base_popularity} IDM:${e.idm} | ${e.jockey_name}`));
} else {
  console.log('該当なし。jrdb_race_entriesのrace_dateフォーマットを確認:');
  const { data: sample } = await supabase.from('jrdb_race_entries')
    .select('race_date, course_name, race_number')
    .order('race_date', { ascending: false })
    .limit(3);
  sample?.forEach(e => console.log(`  ${e.race_date} ${e.course_name} ${e.race_number}R`));
}
