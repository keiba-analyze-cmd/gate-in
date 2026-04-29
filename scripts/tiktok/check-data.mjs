import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// .env.localから読み込み
const envFile = readFileSync(new URL('../../.env.local', import.meta.url), 'utf-8');
const env = Object.fromEntries(
  envFile.split('\n')
    .filter(l => l && !l.startsWith('#'))
    .map(l => l.split('=').map(s => s.trim()))
);

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

// 1. ai_predictionsの最新5件
const { data: preds, error: e1 } = await supabase
  .from('ai_predictions')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(5);

console.log('\n=== ai_predictions (最新5件) ===');
if (e1) console.log('Error:', e1.message);
else console.log(JSON.stringify(preds, null, 2));

// 2. ai_predictionsのカラム名確認（1件）
const { data: sample } = await supabase
  .from('ai_predictions')
  .select('*')
  .limit(1);
if (sample?.[0]) {
  console.log('\n=== カラム一覧 ===');
  console.log(Object.keys(sample[0]).join(', '));
}

// 3. 直近のレース（予想があるもの）
const { data: races } = await supabase
  .from('ai_predictions')
  .select('race_id')
  .order('created_at', { ascending: false })
  .limit(1);

if (races?.[0]) {
  const raceId = races[0].race_id;
  console.log('\n=== 直近レースの全予想 (race_id: ' + raceId + ') ===');

  const { data: allPreds } = await supabase
    .from('ai_predictions')
    .select('*')
    .eq('race_id', raceId);
  console.log(JSON.stringify(allPreds, null, 2));

  // レース情報
  const { data: raceInfo } = await supabase
    .from('races')
    .select('*')
    .eq('id', raceId)
    .limit(1);
  console.log('\n=== レース情報 ===');
  console.log(JSON.stringify(raceInfo, null, 2));
}

// 4. jrdb_race_entriesのカラム確認
const { data: jrdbSample } = await supabase
  .from('jrdb_race_entries')
  .select('*')
  .limit(1);
if (jrdbSample?.[0]) {
  console.log('\n=== jrdb_race_entries カラム一覧 ===');
  console.log(Object.keys(jrdbSample[0]).join(', '));
}
