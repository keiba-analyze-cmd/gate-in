import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
const envFile = readFileSync(new URL('../../.env.local', import.meta.url), 'utf-8');
const env = Object.fromEntries(
  envFile.split('\n').filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => { const i=l.indexOf('='); return [l.slice(0,i).trim(), l.slice(i+1).trim()]; })
);
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// 東京(05), 京都(08), 福島(03)の2026年データを探す
const targets = ['05', '08', '03'];
for (const code of targets) {
  const names = {'05':'東京','08':'京都','03':'福島'};
  const { data, count } = await supabase.from('jrdb_race_entries')
    .select('race_key, umaban, horse_name, finish_order, surface_code, idm', { count: 'exact' })
    .like('race_key', `${code}26%`)
    .limit(5);

  console.log(`\n=== ${names[code]}(${code}) 2026年データ ===`);
  console.log(`件数: ${count}`);
  if (data?.length) {
    data.forEach(e => console.log(`  ${e.race_key} | ${e.umaban}番 ${e.horse_name} | 着順:${e.finish_order} | surface:${e.surface_code} | IDM:${e.idm}`));
    const raceKeys = [...new Set(data.map(e => e.race_key))];
    console.log(`race_keys: ${raceKeys.join(', ')}`);
  }
}

// racesテーブルで4/25-26のレースを確認
console.log('\n=== racesテーブル 4/25-26 ===');
const { data: races } = await supabase.from('races')
  .select('external_id, name, course_name, track_type, distance, race_date, status')
  .gte('race_date', '2026-04-25')
  .lte('race_date', '2026-04-26')
  .order('race_date')
  .order('external_id')
  .limit(100);

const byCourseSurf = {};
races?.forEach(r => {
  const key = `${r.course_name}_${r.track_type}`;
  byCourseSurf[key] = (byCourseSurf[key] || 0) + 1;
});
console.log('場×馬場:');
Object.entries(byCourseSurf).forEach(([k,v]) => console.log(`  ${k}: ${v}R`));
console.log(`合計: ${races?.length}R`);

// 確定状況
const statusDist = {};
races?.forEach(r => { statusDist[r.status] = (statusDist[r.status]||0)+1; });
console.log('status分布:', statusDist);
