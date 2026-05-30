#!/usr/bin/env node
/**
 * WIN5結果 × JRDB マッチング検証 v2
 * 
 * racesテーブル経由で結合:
 *   win5_results(race_date, course_name, race_number)
 *   → races(race_date, course_name, race_number) → external_id
 *   → race_key変換 → jrdb_race_entries
 * 
 * 使い方:
 *   export NEXT_PUBLIC_SUPABASE_URL=xxx
 *   export SUPABASE_SERVICE_ROLE_KEY=xxx
 *   node verify-jrdb-match-v2.mjs
 *   node verify-jrdb-match-v2.mjs --update    # win5_resultsのjrdb_race_keyを更新
 *   node verify-jrdb-match-v2.mjs --verbose
 */

import { parseArgs } from 'util';

const { values: args } = parseArgs({
  options: {
    update:  { type: 'boolean', default: false },
    verbose: { type: 'boolean', default: false },
    from:    { type: 'string', default: '' },
  },
});

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ 環境変数を設定してください');
  process.exit(1);
}

const headers = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` };

async function query(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers });
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  return res.json();
}

async function queryAll(path, pageSize = 1000) {
  let all = [];
  let offset = 0;
  while (true) {
    const sep = path.includes('?') ? '&' : '?';
    const data = await query(`${path}${sep}limit=${pageSize}&offset=${offset}`);
    all = all.concat(data);
    if (data.length < pageSize) break;
    offset += pageSize;
  }
  return all;
}

// external_id(12桁) → race_key(8桁) 変換
// external_id: YYYY + CC + KK + NN + RR
// race_key:    CC + YY + K(hex) + N(hex) + RR
function externalIdToRaceKey(extId) {
  if (!extId || extId.length !== 12) return null;
  const year = extId.slice(2, 4);       // YY
  const course = extId.slice(4, 6);     // CC
  const kai = parseInt(extId.slice(6, 8));   // 回
  const nichi = parseInt(extId.slice(8, 10)); // 日
  const race = extId.slice(10, 12);     // RR
  
  const kaiHex = kai.toString(16);      // 1hex char
  const nichiHex = nichi.toString(16);  // 1hex char
  
  return `${course}${year}${kaiHex}${nichiHex}${race}`;
}

async function main() {
  console.log('\n🔍 WIN5 × JRDB マッチング検証 v2（racesテーブル経由）\n');

  // ── Step 1: WIN5結果を取得 ──
  let filter = '&order=race_date.asc,leg_number.asc';
  if (args.from) filter += `&race_date=gte.${args.from}`;
  
  const win5Results = await queryAll(`win5_results?select=id,race_date,leg_number,course_name,race_number,winning_umaban,winning_odds,jrdb_race_key,payout${filter}`);
  const win5Dates = [...new Set(win5Results.map(r => r.race_date))];
  console.log(`📋 WIN5結果: ${win5Results.length}レッグ (${win5Dates.length}日分)\n`);

  // ── Step 2: racesテーブルからWIN5対象レースをマッチ ──
  console.log('🔗 racesテーブルとマッチング中...');
  
  let matchCount = 0;
  let noMatchCount = 0;
  const updates = []; // {win5_id, jrdb_race_key, race_id}
  const mismatches = [];

  // 日付ごとに処理
  for (const date of win5Dates) {
    const legsForDate = win5Results.filter(r => r.race_date === date);
    
    // この日のracesを取得
    const races = await query(
      `races?select=id,external_id,race_date,course_name,race_number,name&race_date=eq.${date}`
    );

    for (const leg of legsForDate) {
      // course_name + race_number でマッチ
      const match = races.find(r => 
        r.course_name === leg.course_name && 
        r.race_number === leg.race_number
      );

      if (match) {
        const raceKey = externalIdToRaceKey(match.external_id);
        matchCount++;
        updates.push({
          win5_id: leg.id,
          jrdb_race_key: raceKey,
          race_id: match.id,
          external_id: match.external_id,
        });
      } else {
        noMatchCount++;
        mismatches.push({
          date: leg.race_date,
          leg: leg.leg_number,
          course: leg.course_name,
          race: leg.race_number,
        });
      }
    }
    process.stdout.write(`  ${date} (${races.length}レース中 ${legsForDate.filter(l => updates.find(u => u.win5_id === l.id)).length}マッチ)\r`);
  }

  console.log('\n');
  console.log('='.repeat(55));
  console.log('📊 racesテーブル マッチング結果');
  console.log('='.repeat(55));
  console.log(`  WIN5レッグ総数:     ${win5Results.length}`);
  console.log(`  races マッチ:       ${matchCount} (${(matchCount / win5Results.length * 100).toFixed(1)}%)`);
  console.log(`  不一致:             ${noMatchCount}`);

  if (mismatches.length > 0 && args.verbose) {
    console.log(`\n⚠️  不一致レッグ (先頭20件):`);
    for (const m of mismatches.slice(0, 20)) {
      console.log(`  ${m.date} Leg${m.leg}: ${m.course}${m.race}R`);
    }
  }

  // ── Step 3: race_key → jrdb_race_entries マッチ確認 ──
  if (matchCount > 0) {
    console.log('\n🔬 JRDB KYGデータ マッチ確認...');
    
    const raceKeys = [...new Set(updates.map(u => u.jrdb_race_key).filter(Boolean))];
    const BATCH = 80;
    const foundKeys = new Set();

    for (let i = 0; i < raceKeys.length; i += BATCH) {
      const batch = raceKeys.slice(i, i + BATCH);
      const inClause = `in.(${batch.join(',')})`;
      const rows = await query(`jrdb_race_entries?select=race_key&race_key=${inClause}&limit=1000`);
      for (const row of rows) foundKeys.add(row.race_key);
      process.stdout.write(`  KYG確認: ${Math.min(i + BATCH, raceKeys.length)}/${raceKeys.length}\r`);
    }

    const kygMatch = updates.filter(u => foundKeys.has(u.jrdb_race_key)).length;
    console.log(`\n  KYG存在確認: ${kygMatch} / ${matchCount} (${(kygMatch / matchCount * 100).toFixed(1)}%)`);

    // 年別集計
    const byYear = {};
    for (const u of updates) {
      const year = win5Results.find(r => r.id === u.win5_id)?.race_date?.slice(0, 4);
      if (!year) continue;
      if (!byYear[year]) byYear[year] = { total: 0, kyg: 0 };
      byYear[year].total++;
      if (foundKeys.has(u.jrdb_race_key)) byYear[year].kyg++;
    }

    console.log('\n📅 年別KYGマッチ率:');
    console.log('  年     | レッグ | KYG   ');
    console.log('  -------|--------|-------');
    for (const [year, d] of Object.entries(byYear).sort()) {
      console.log(`  ${year}  | ${String(d.total).padStart(5)} | ${(d.kyg / d.total * 100).toFixed(0).padStart(3)}%`);
    }

    // サンプルデータ確認
    if (args.verbose && kygMatch > 0) {
      console.log('\n🏆 WIN5勝ち馬のKYGデータ サンプル:');
      const sampleUpdates = updates.filter(u => foundKeys.has(u.jrdb_race_key)).slice(-10);
      
      for (const u of sampleUpdates.slice(0, 5)) {
        const w = win5Results.find(r => r.id === u.win5_id);
        if (!w) continue;
        
        const entries = await query(
          `jrdb_race_entries?select=umaban,idm,jockey_index,base_odds&race_key=eq.${u.jrdb_race_key}&umaban=eq.${w.winning_umaban}`
        );
        if (entries.length > 0) {
          const e = entries[0];
          console.log(`  ${w.race_date} Leg${w.leg_number} ${w.course_name}${w.race_number}R → ${w.winning_umaban}番 IDM:${e.idm} 騎手:${e.jockey_index} odds:${e.base_odds} (実績:${w.winning_odds}倍)`);
        }
      }
    }
  }

  // ── Step 4: win5_resultsのjrdb_race_key更新 ──
  if (args.update && updates.length > 0) {
    console.log('\n📝 win5_resultsのjrdb_race_keyを更新中...');
    let updated = 0;
    for (const u of updates) {
      if (!u.jrdb_race_key) continue;
      try {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/win5_results?id=eq.${u.win5_id}`,
          {
            method: 'PATCH',
            headers: { ...headers, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
            body: JSON.stringify({ jrdb_race_key: u.jrdb_race_key }),
          }
        );
        if (res.ok) updated++;
      } catch (e) {
        console.error(`  ❌ id=${u.win5_id}: ${e.message}`);
      }
      if (updated % 100 === 0) process.stdout.write(`  更新: ${updated}/${updates.length}\r`);
    }
    console.log(`\n✅ ${updated}件更新完了`);
  } else if (updates.length > 0) {
    console.log(`\n💡 jrdb_race_keyを更新するには: --update オプション`);
  }

  // ── サマリー ──
  console.log('\n' + '='.repeat(55));
  const rate = matchCount / win5Results.length;
  if (rate > 0.8) {
    console.log('✅ racesマッチ率80%超: バックテスト実行可能');
  } else if (rate > 0.5) {
    console.log('⚠️  racesマッチ率50-80%: 部分的にバックテスト可能');
  } else {
    console.log('❌ racesマッチ率50%未満: racesテーブルへのデータ追加が必要');
  }
  console.log('='.repeat(55));
}

main().catch(e => { console.error(e); process.exit(1); });
