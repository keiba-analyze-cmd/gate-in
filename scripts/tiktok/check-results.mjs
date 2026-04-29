import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
const envFile = readFileSync(new URL('../../.env.local', import.meta.url), 'utf-8');
const env = Object.fromEntries(
  envFile.split('\n').filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => { const i=l.indexOf('='); return [l.slice(0,i).trim(), l.slice(i+1).trim()]; })
);
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const COURSES = {'01':'札幌','02':'函館','03':'福島','04':'新潟','05':'東京','06':'中山','07':'中京','08':'京都','09':'阪神','10':'小倉'};

// 4/25-26のレースをracesから取得してrace_keyに変換
function toRaceKey(eid) {
  return eid.slice(4,6) + eid.slice(2,4) + eid.slice(7,8) + eid.slice(9,10) + eid.slice(10,12);
}

const { data: races } = await supabase.from('races')
  .select('external_id, name, course_name, track_type, distance, race_date')
  .gte('race_date', '2026-04-25')
  .lte('race_date', '2026-04-26')
  .order('external_id');

console.log(`racesテーブル: ${races.length}R`);

// race_key変換してjrdb_race_resultsを確認
let hitCount = 0;
let missCount = 0;
for (const r of races.slice(0, 10)) {
  const rk = toRaceKey(r.external_id);
  const { count } = await supabase.from('jrdb_race_results')
    .select('*', { count: 'exact', head: true })
    .eq('race_key', rk);
  const status = count > 0 ? '✅' : '❌';
  if (count > 0) hitCount++; else missCount++;
  console.log(`  ${status} ${r.course_name} ${r.track_type}${r.distance}m ${r.name} | rk:${rk} | ${count}件`);
}

// 残りもカウント
for (const r of races.slice(10)) {
  const rk = toRaceKey(r.external_id);
  const { count } = await supabase.from('jrdb_race_results')
    .select('*', { count: 'exact', head: true })
    .eq('race_key', rk);
  if (count > 0) hitCount++; else missCount++;
}
console.log(`\n合計: ${hitCount}R データあり / ${missCount}R データなし (全${races.length}R)`);

// サンプル: 東京11Rの結合データ
const sampleRace = races.find(r => r.course_name === '東京' && r.name.includes('フローラ'));
if (sampleRace) {
  const rk = toRaceKey(sampleRace.external_id);
  console.log(`\n=== ${sampleRace.name} (${rk}) entries + results 結合 ===`);
  const { data: entries } = await supabase.from('jrdb_race_entries')
    .select('umaban, horse_name, idm, base_odds, jockey_name, sire_name, running_style')
    .eq('race_key', rk).order('umaban');
  const { data: results } = await supabase.from('jrdb_race_results')
    .select('umaban, finish_position, odds, popularity, weight, weight_diff')
    .eq('race_key', rk).order('finish_position');

  if (entries && results) {
    const merged = entries.map(e => {
      const r = results.find(r => r.umaban === e.umaban);
      return { ...e, ...(r || {}) };
    }).sort((a,b) => (a.finish_position||99)-(b.finish_position||99));
    merged.forEach(m => console.log(
      `  ${m.finish_position||'?'}着 ${m.umaban}番 ${m.horse_name} | IDM:${m.idm} | odds:${m.base_odds}→${m.odds} | ${m.jockey_name} | 父:${m.sire_name} | 脚質:${m.running_style} | 体重変動:${m.weight_diff}`
    ));
  }
}
