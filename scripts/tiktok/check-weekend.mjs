import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
const envFile = readFileSync(new URL('../../.env.local', import.meta.url), 'utf-8');
const env = Object.fromEntries(
  envFile.split('\n').filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => { const i=l.indexOf('='); return [l.slice(0,i).trim(), l.slice(i+1).trim()]; })
);
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// 直近の確定済みレース（finish_orderがあるもの）のrace_keyを取得
const { data: recent } = await supabase.from('jrdb_race_entries')
  .select('race_key, horse_name, finish_order, idm, base_odds, base_popularity, jockey_name, sire_name, running_style, training_index, umaban')
  .not('finish_order', 'is', null)
  .order('created_at', { ascending: false })
  .limit(5);

if (recent?.length) {
  console.log('=== 直近の確定済みエントリー ===');
  recent.forEach(e => console.log(`  ${e.race_key} | ${e.umaban}番 ${e.horse_name} | ${e.finish_order}着 | IDM:${e.idm} | ${e.jockey_name} | 父:${e.sire_name} | 脚質:${e.running_style}`));
} else {
  console.log('確定済みデータなし。finish_orderの状況確認:');
}

// 確定済みデータがあるrace_keyの一覧（直近20件）
const { data: keys } = await supabase.from('jrdb_race_entries')
  .select('race_key')
  .not('finish_order', 'is', null)
  .order('created_at', { ascending: false })
  .limit(200);

const uniqueKeys = [...new Set(keys?.map(k => k.race_key) || [])];
console.log(`\n=== 確定済みレース数: ${uniqueKeys.length} ===`);
console.log('race_keys:', uniqueKeys.slice(0, 15).join(', '));

// 1つのレースの全馬を確認
if (uniqueKeys.length > 0) {
  const targetKey = uniqueKeys[0];
  const { data: full } = await supabase.from('jrdb_race_entries')
    .select('umaban, horse_name, finish_order, idm, base_odds, base_popularity, jockey_name, sire_name, running_style, final_tansho_odds, final_tansho_popularity, horse_weight, horse_weight_change')
    .eq('race_key', targetKey)
    .order('finish_order');
  console.log(`\n=== ${targetKey} 全馬データ ===`);
  full?.forEach(e => console.log(`  ${e.finish_order}着 ${e.umaban}番 ${e.horse_name} | IDM:${e.idm} odds:${e.base_odds}→${e.final_tansho_odds} | ${e.jockey_name} | 父:${e.sire_name} | 脚質:${e.running_style} | 体重:${e.horse_weight}(${e.horse_weight_change})`));
}

// race_keyのパターンから日付を推定
console.log('\n=== race_key先頭2桁(場コード)の分布 ===');
const courseCounts = {};
uniqueKeys.forEach(k => { const c = k.slice(0,2); courseCounts[c] = (courseCounts[c]||0)+1; });
Object.entries(courseCounts).sort((a,b) => b[1]-a[1]).forEach(([k,v]) => console.log(`  場${k}: ${v}レース`));
