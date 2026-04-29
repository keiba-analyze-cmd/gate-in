import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
const envFile = readFileSync(new URL('../../.env.local', import.meta.url), 'utf-8');
const env = Object.fromEntries(
  envFile.split('\n').filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => { const i=l.indexOf('='); return [l.slice(0,i).trim(), l.slice(i+1).trim()]; })
);
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// finish_orderありのrace_keyを全取得
const { data, count } = await supabase.from('jrdb_race_entries')
  .select('race_key', { count: 'exact' })
  .not('finish_order', 'is', null)
  .limit(10000);

const keys = [...new Set(data?.map(e => e.race_key) || [])].sort();
console.log(`確定済みエントリー総数: ${count}`);
console.log(`確定済みrace_key数: ${keys.length}`);
console.log(`\n最古: ${keys[0]}`);
console.log(`最新: ${keys[keys.length-1]}`);

// race_keyから年を抽出（3-4桁目）して分布を見る
const yearDist = {};
keys.forEach(k => {
  const y = '20' + k.slice(2,4);
  yearDist[y] = (yearDist[y]||0) + 1;
});
console.log('\n年別レース数:');
Object.entries(yearDist).sort().forEach(([y,n]) => console.log(`  ${y}: ${n}レース`));

// 直近のrace_key 20件
console.log('\n直近20レース:');
keys.slice(-20).forEach(k => {
  const course = {'01':'札幌','02':'函館','03':'福島','04':'新潟','05':'東京','06':'中山','07':'中京','08':'京都','09':'阪神','10':'小倉'}[k.slice(0,2)] || k.slice(0,2);
  console.log(`  ${k} → ${course} 20${k.slice(2,4)}年 ${k.slice(6,8)}R`);
});
