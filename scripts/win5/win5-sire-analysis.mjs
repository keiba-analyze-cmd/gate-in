#!/usr/bin/env node
/**
 * 血統×コース適性シグナルの分析
 * sire_course_distance_stats + jrdb_race_entries + win5_results を結合して
 * 穴馬選出に血統情報がどれだけ有効かを検証
 */
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

async function main() {
  // ═══ Step 1: sire_course_distance_stats構造確認 ═══
  console.log('═══ Step 1: sire_course_distance_stats 構造 ═══');
  const sampleStats = await queryAll('sire_course_distance_stats?limit=3');
  if (sampleStats.length > 0) {
    console.log('カラム:');
    for (const [k, v] of Object.entries(sampleStats[0])) {
      console.log(`  ${k}: ${JSON.stringify(v)?.slice(0, 80)}`);
    }
    console.log(`\n全件数確認中...`);
  }
  const allStats = await queryAll('sire_course_distance_stats?select=id');
  console.log(`  総レコード数: ${allStats.length}`);

  // ═══ Step 2: jrdb_race_entriesのsire関連フィールド確認 ═══
  console.log('\n═══ Step 2: jrdb_race_entries sire関連フィールド ═══');
  const sampleEntry = await queryAll('jrdb_race_entries?limit=1');
  if (sampleEntry.length > 0) {
    const sireFields = Object.entries(sampleEntry[0]).filter(([k]) => 
      k.includes('sire') || k.includes('horse') || k.includes('father') || k.includes('code')
    );
    console.log('sire/horse関連:');
    for (const [k, v] of sireFields) {
      console.log(`  ${k}: ${JSON.stringify(v)?.slice(0, 80)}`);
    }
  }

  // ═══ Step 3: UKCテーブル（血統情報）確認 ═══
  console.log('\n═══ Step 3: jrdb_ukc（馬基本データ） ═══');
  const sampleUkc = await queryAll('jrdb_ukc?limit=3&select=horse_code,horse_name,sire_name');
  if (sampleUkc.length > 0) {
    for (const u of sampleUkc) console.log(`  ${u.horse_code}: ${u.horse_name} (父: ${u.sire_name})`);
    const totalUkc = await queryAll('jrdb_ukc?select=horse_code');
    console.log(`  総頭数: ${totalUkc.length}`);
  }

  // ═══ Step 4: racesテーブルのコース情報確認 ═══
  console.log('\n═══ Step 4: racesテーブル コース情報 ═══');
  const sampleRace = await queryAll('races?limit=1&race_date=eq.2026-05-17&select=id,external_id,course_name,track_type,distance');
  if (sampleRace.length > 0) {
    console.log(`  例: ${JSON.stringify(sampleRace[0])}`);
  }

  // ═══ Step 5: sire_course_distance_statsの結合テスト ═══
  console.log('\n═══ Step 5: 血統×コース結合テスト ═══');
  // WIN5レッグ1件を取り、出走馬の父馬→sire_statsを結合
  const testLegs = await queryAll('win5_results?select=race_date,leg_number,course_name,race_number,winning_umaban,jrdb_race_key&race_date=eq.2026-05-10&leg_number=eq.1');
  if (testLegs.length > 0) {
    const leg = testLegs[0];
    console.log(`  テスト: ${leg.race_date} Leg${leg.leg_number} ${leg.course_name}R${leg.race_number}`);
    
    // 出走馬取得
    const entries = await queryAll(`jrdb_race_entries?select=umaban,horse_name,horse_code,idm,base_odds&race_key=eq.${leg.jrdb_race_key}&order=umaban.asc`);
    console.log(`  出走馬: ${entries.length}頭`);

    // レース情報取得（距離・馬場）
    const races = await queryAll(`races?select=course_name,track_type,distance&race_date=eq.${leg.race_date}&course_name=eq.${leg.course_name}&race_number=eq.${leg.race_number}`);
    const raceInfo = races[0];
    console.log(`  コース: ${raceInfo?.course_name} ${raceInfo?.track_type} ${raceInfo?.distance}m`);

    // 各馬の父馬をUKCから取得→sire_statsを照合
    let matchCount = 0;
    for (const e of entries.slice(0, 5)) {
      const ukc = await queryAll(`jrdb_ukc?select=sire_name&horse_code=eq.${e.horse_code}&limit=1`);
      const sireName = ukc[0]?.sire_name || '不明';
      
      // sire_statsで検索
      const stats = await queryAll(
        `sire_course_distance_stats?select=*&sire_name=eq.${encodeURIComponent(sireName)}&course_name=eq.${encodeURIComponent(raceInfo.course_name)}&track_type=eq.${encodeURIComponent(raceInfo.track_type)}&distance=eq.${raceInfo.distance}&limit=1`
      );
      
      const isWinner = e.umaban === leg.winning_umaban ? '🏆' : '  ';
      if (stats.length > 0) {
        const s = stats[0];
        matchCount++;
        console.log(`  ${isWinner} ${e.umaban}番 ${e.horse_name} 父:${sireName} → 勝率${(s.win_rate*100||0).toFixed(1)}% 複勝${(s.place_rate*100||0).toFixed(1)}% (${s.runs}走)`);
      } else {
        console.log(`  ${isWinner} ${e.umaban}番 ${e.horse_name} 父:${sireName} → stats該当なし`);
      }
    }
    console.log(`  マッチ率: ${matchCount}/${Math.min(entries.length, 5)}`);
  }

  // ═══ Step 6: sire_statsの分布 ═══
  console.log('\n═══ Step 6: sire_course_distance_stats 分布 ═══');
  const statsAll = await queryAll('sire_course_distance_stats?select=sire_name,runs,win_rate,place_rate&order=runs.desc&limit=20');
  console.log('  上位20（走数順）:');
  console.log('  種牡馬               | 走数  | 勝率   | 複勝率');
  console.log('  ' + '-'.repeat(55));
  for (const s of statsAll) {
    console.log(`  ${(s.sire_name||'').padEnd(18)} | ${String(s.runs).padStart(5)} | ${((s.win_rate||0)*100).toFixed(1).padStart(5)}% | ${((s.place_rate||0)*100).toFixed(1).padStart(5)}%`);
  }

  console.log('\n═══ 完了 ═══');
}
main().catch(e => { console.error(e); process.exit(1); });
