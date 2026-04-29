import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
const envFile = readFileSync(new URL('../../.env.local', import.meta.url), 'utf-8');
const env = Object.fromEntries(
  envFile.split('\n').filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => { const i=l.indexOf('='); return [l.slice(0,i).trim(), l.slice(i+1).trim()]; })
);
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const COURSES = {'01':'札幌','02':'函館','03':'福島','04':'新潟','05':'東京','06':'中山','07':'中京','08':'京都','09':'阪神','10':'小倉'};

// 1. finish_orderがある全race_key
const { data: finished } = await supabase.from('jrdb_race_entries')
  .select('race_key').not('finish_order', 'is', null).limit(20000);
const finishedKeys = [...new Set(finished?.map(e => e.race_key) || [])];

// 2. 全race_key（finish_orderがないものも含む）
const { data: all } = await supabase.from('jrdb_race_entries')
  .select('race_key').limit(20000);
const allKeys = [...new Set(all?.map(e => e.race_key) || [])];

console.log(`=== データカバレッジ ===`);
console.log(`全race_key数: ${allKeys.length}`);
console.log(`確定済みrace_key数: ${finishedKeys.length}`);
console.log(`未確定race_key数: ${allKeys.length - finishedKeys.length}`);

// 3. 未確定（結果なし）のrace_keyを場×開催日で表示
const unfinished = allKeys.filter(k => !finishedKeys.includes(k)).sort();
console.log(`\n=== 未確定race_key（結果データなし） ===`);
const unfinDays = {};
unfinished.forEach(k => {
  const prefix = k.slice(0, 6);
  const course = COURSES[k.slice(0,2)] || k.slice(0,2);
  if (!unfinDays[prefix]) unfinDays[prefix] = { course, keys: [] };
  unfinDays[prefix].keys.push(k);
});
Object.entries(unfinDays).sort().forEach(([p, d]) => {
  console.log(`  ${p} ${d.course}: ${d.keys.length}R`);
});

// 4. surface_codeの状況（芝/ダート区別があるか）
const { data: surfSample } = await supabase.from('jrdb_race_entries')
  .select('race_key, surface_code, distance, race_name')
  .not('surface_code', 'is', null)
  .limit(10);
console.log('\n=== surface_code サンプル ===');
if (surfSample?.length) {
  surfSample.forEach(e => console.log(`  ${e.race_key} | surface:${e.surface_code} | ${e.distance}m | ${e.race_name}`));
} else {
  console.log('  surface_codeは全てNULL');
  // race_keyからレースの芝/ダートを推定する手がかりを探す
  const { data: distSample } = await supabase.from('jrdb_race_entries')
    .select('race_key, distance, horse_name, idm')
    .not('finish_order', 'is', null)
    .limit(5);
  console.log('\n  distanceの状況:');
  distSample?.forEach(e => console.log(`    ${e.race_key} | distance:${e.distance} | ${e.horse_name}`));
}

// 5. racesテーブルで芝/ダートを確認
const { data: raceSample } = await supabase.from('races')
  .select('external_id, name, track_type, distance, course_name, race_date')
  .not('track_type', 'is', null)
  .order('race_date', { ascending: false })
  .limit(10);
console.log('\n=== racesテーブルのtrack_type ===');
raceSample?.forEach(e => console.log(`  ${e.external_id} | ${e.course_name} ${e.track_type}${e.distance}m | ${e.name} | ${e.race_date}`));
