import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
const envFile = readFileSync(new URL('../../.env.local', import.meta.url), 'utf-8');
const env = Object.fromEntries(
  envFile.split('\n').filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => { const i=l.indexOf('='); return [l.slice(0,i).trim(), l.slice(i+1).trim()]; })
);
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const COURSES = {'01':'札幌','02':'函館','03':'福島','04':'新潟','05':'東京','06':'中山','07':'中京','08':'京都','09':'阪神','10':'小倉'};

// surface_codeの分布
const { data } = await supabase.from('jrdb_race_entries')
  .select('race_key, surface_code, umaban, horse_name, finish_order')
  .not('finish_order', 'is', null)
  .limit(20000);

// surface_codeの値別カウント
const surfDist = {};
data?.forEach(e => {
  const s = e.surface_code ?? 'null';
  surfDist[s] = (surfDist[s] || 0) + 1;
});
console.log('=== surface_code分布 ===');
Object.entries(surfDist).forEach(([k,v]) => console.log(`  ${k}: ${v}件`));

// surface_codeがnullの場合、racesテーブルから取る方法を検証
// race_keyとexternal_idの対応で取れるか
const sampleKey = data?.[0]?.race_key;
if (sampleKey) {
  const courseCode = sampleKey.slice(0,2);
  const year = '20' + sampleKey.slice(2,4);

  console.log(`\nサンプルrace_key: ${sampleKey}`);
  console.log(`場: ${COURSES[courseCode]} / 年: ${year}`);

  // 同じrace_keyの全エントリーでsurface_codeを確認
  const { data: sameRace } = await supabase.from('jrdb_race_entries')
    .select('umaban, horse_name, surface_code, distance')
    .eq('race_key', sampleKey)
    .order('umaban')
    .limit(5);
  console.log('同一レースのsurface_code:');
  sameRace?.forEach(e => console.log(`  ${e.umaban}番 ${e.horse_name} surface:${e.surface_code} dist:${e.distance}`));
}

// 場別×surface_codeの分布
const courseSurf = {};
data?.forEach(e => {
  const course = COURSES[e.race_key.slice(0,2)] || e.race_key.slice(0,2);
  const surf = e.surface_code ?? 'null';
  const key = `${course}_${surf}`;
  courseSurf[key] = (courseSurf[key] || 0) + 1;
});
console.log('\n=== 場×surface_code ===');
Object.entries(courseSurf).sort().forEach(([k,v]) => console.log(`  ${k}: ${v}件`));
