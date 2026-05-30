#!/usr/bin/env node
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('❌'); process.exit(1); }
const headers = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` };
async function queryAll(p, ps = 1000) {
  let all = [], off = 0;
  while (true) {
    const sep = p.includes('?') ? '&' : '?';
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${p}${sep}limit=${ps}&offset=${off}`, { headers });
    if (!r.ok) throw new Error(await r.text()); const d = await r.json(); all = all.concat(d);
    if (d.length < ps) break; off += ps;
  }
  return all;
}

const CC = { '札幌':'01','函館':'02','福島':'03','新潟':'04','東京':'05','中山':'06','中京':'07','京都':'08','阪神':'09','小倉':'10' };

async function main() {
  console.log('🔬 血統×コース適性シグナル 検証\n');

  // sire_statsを全件メモリにロード（3518件）
  console.log('  sire_stats読込中...');
  const allStats = await queryAll('sire_course_distance_stats?select=sire_name,course_code,runs,win_rate,place_rate,avg_odds,roi_win');
  const sireMap = new Map();
  for (const s of allStats) {
    sireMap.set(`${s.sire_name}|${s.course_code}`, s);
  }
  console.log(`  ${allStats.length}件 (${new Set(allStats.map(s=>s.sire_name)).size}種牡馬)\n`);

  // jrdb_horsesも全件ロード
  console.log('  jrdb_horses読込中...');
  const allHorses = await queryAll('jrdb_horses?select=horse_code,sire_name');
  const horseMap = new Map();
  for (const h of allHorses) horseMap.set(h.horse_code, h.sire_name);
  console.log(`  ${allHorses.length}頭\n`);

  // WIN5全レッグを取得
  const legs = await queryAll('win5_results?select=race_date,leg_number,course_name,race_number,winning_umaban,winning_odds,winning_popularity,jrdb_race_key,payout&jrdb_race_key=not.is.null&order=race_date.asc,leg_number.asc');
  const raceKeys = [...new Set(legs.map(l => l.jrdb_race_key))];
  const jrdb = new Map();
  for (let i = 0; i < raceKeys.length; i += 60) {
    const batch = raceKeys.slice(i, i + 60);
    const entries = await queryAll(`jrdb_race_entries?select=race_key,umaban,horse_code,idm,jockey_index,base_odds&race_key=in.(${batch.join(',')})`);
    for (const e of entries) { if (!jrdb.has(e.race_key)) jrdb.set(e.race_key, []); jrdb.get(e.race_key).push(e); }
    process.stdout.write(`  JRDB: ${Math.min(i+60, raceKeys.length)}/${raceKeys.length}\r`);
  }
  console.log(`\n  対象: ${legs.length}レッグ\n`);

  // 各レッグで血統シグナルを計算
  let totalLegs = 0, sireMatchLegs = 0;
  let winnerHasSire = 0, winnerSireAboveAvg = 0;
  // 穴馬（6人気以下）で血統適性が高い馬の的中率
  let anaWithSire = 0, anaWithSireWin = 0;
  let anaWithoutSire = 0, anaWithoutSireWin = 0;
  // 血統適性スコア分布
  const sireScoreBuckets = { high: {total:0,win:0}, mid: {total:0,win:0}, low: {total:0,win:0}, none: {total:0,win:0} };

  for (const leg of legs) {
    const entries = jrdb.get(leg.jrdb_race_key) || [];
    if (entries.length === 0) continue;
    totalLegs++;

    const cc = CC[leg.course_name];
    if (!cc) continue;

    let legHasSireData = false;
    for (const e of entries) {
      const sire = horseMap.get(e.horse_code);
      if (!sire) continue;
      const stats = sireMap.get(`${sire}|${cc}`);
      const isWinner = e.umaban === leg.winning_umaban;
      const isAna = (leg.winning_popularity || 0) >= 6 && isWinner;
      const pop = entries.map(x => x.base_odds||999).sort((a,b)=>a-b).indexOf(e.base_odds||999) + 1;
      const isHighOdds = (e.base_odds || 0) >= 10;

      if (stats && stats.runs >= 10) {
        legHasSireData = true;
        const placeRate = stats.place_rate || 0;
        
        // 血統適性バケット
        let bucket;
        if (placeRate >= 0.35) bucket = 'high';
        else if (placeRate >= 0.25) bucket = 'mid';
        else bucket = 'low';

        if (isHighOdds) {
          sireScoreBuckets[bucket].total++;
          if (isWinner) sireScoreBuckets[bucket].win++;
        }

        if (isWinner) {
          winnerHasSire++;
          if (placeRate >= 0.30) winnerSireAboveAvg++;
        }

        if (isHighOdds && isWinner) {
          anaWithSire++;
          if (placeRate >= 0.30) anaWithSireWin++;
        }
      } else {
        if (isHighOdds) {
          sireScoreBuckets.none.total++;
          if (isWinner) sireScoreBuckets.none.win++;
        }
        if (isHighOdds && isWinner) anaWithoutSire++;
      }
    }
    if (legHasSireData) sireMatchLegs++;
  }

  // 結果表示
  console.log('═'.repeat(60));
  console.log('📊 血統×コース適性の有効性');
  console.log('═'.repeat(60));

  console.log(`\n  血統データカバー率: ${sireMatchLegs}/${totalLegs} レッグ (${(sireMatchLegs/totalLegs*100).toFixed(1)}%)`);
  console.log(`  勝ち馬の血統データあり: ${winnerHasSire}件`);
  console.log(`  勝ち馬の血統適性が平均以上(複勝≥30%): ${winnerSireAboveAvg}件 (${(winnerSireAboveAvg/winnerHasSire*100).toFixed(1)}%)`);

  console.log('\n  穴馬（odds≥10倍）の血統適性別 勝率:');
  console.log('  適性レベル      | 出走数  | 勝利数 | 勝率');
  console.log('  ' + '-'.repeat(45));
  for (const [label, data] of [['high(複勝≥35%)', sireScoreBuckets.high], ['mid(25-35%)', sireScoreBuckets.mid], ['low(<25%)', sireScoreBuckets.low], ['データなし', sireScoreBuckets.none]]) {
    const rate = data.total > 0 ? (data.win/data.total*100).toFixed(2) : '-';
    console.log(`  ${label.padEnd(16)} | ${String(data.total).padStart(6)}  | ${String(data.win).padStart(4)}   | ${rate}%`);
  }

  console.log('\n═══ 完了 ═══');
}
main().catch(e => { console.error(e); process.exit(1); });
