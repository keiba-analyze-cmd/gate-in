#!/usr/bin/env node
/**
 * WIN5結果 × JRDB マッチング検証 v3
 * 
 * jrdb_race_entries に race_date, course_name, race_number があるので直接結合。
 * 
 * 使い方:
 *   node verify-jrdb-match-v3.mjs                # 検証のみ
 *   node verify-jrdb-match-v3.mjs --update        # win5_resultsのjrdb_race_keyを正しい値に更新
 *   node verify-jrdb-match-v3.mjs --verbose        # サンプルデータ表示
 */

import { parseArgs } from 'util';

const { values: args } = parseArgs({
  options: {
    update:  { type: 'boolean', default: false },
    verbose: { type: 'boolean', default: false },
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

async function main() {
  console.log('\n🔍 WIN5 × JRDB マッチング検証 v3（直接結合）\n');

  // ── Step 1: WIN5結果を取得 ──
  const win5Results = await queryAll(
    'win5_results?select=id,race_date,leg_number,course_name,race_number,winning_umaban,winning_odds,winning_popularity,jrdb_race_key,payout&order=race_date.asc,leg_number.asc'
  );
  const win5Dates = [...new Set(win5Results.map(r => r.race_date))];
  console.log(`📋 WIN5結果: ${win5Results.length}レッグ (${win5Dates.length}日分)`);

  // ── Step 2: jrdb_race_entries の全 distinct (race_date, course_name, race_number, race_key) を取得 ──
  // race_key は同一レースの馬ごとに同じなので、1馬取ればOK
  console.log('📡 JRDBレースインデックス取得中...');

  // 全jrdb_race_entriesからユニークなレース情報を取得
  // umaban=1 の馬だけ取れば各レース1行で済む
  const jrdbIndex = await queryAll(
    'jrdb_race_entries?select=race_key,race_date,course_name,race_number&umaban=eq.1&order=race_date.asc'
  );

  console.log(`  JRDBレース数: ${jrdbIndex.length}\n`);

  // マッチング用のMapを構築: "YYYY-MM-DD|コース名|R番号" → race_key
  const jrdbMap = new Map();
  for (const r of jrdbIndex) {
    const key = `${r.race_date}|${r.course_name}|${r.race_number}`;
    jrdbMap.set(key, r.race_key);
  }

  // ── Step 3: マッチング ──
  let matchCount = 0;
  let noMatchCount = 0;
  const updates = [];
  const mismatches = [];

  for (const w of win5Results) {
    const lookupKey = `${w.race_date}|${w.course_name}|${w.race_number}`;
    const raceKey = jrdbMap.get(lookupKey);

    if (raceKey) {
      matchCount++;
      updates.push({ win5_id: w.id, jrdb_race_key: raceKey, date: w.race_date });
    } else {
      noMatchCount++;
      mismatches.push(w);
    }
  }

  console.log('='.repeat(55));
  console.log('📊 マッチング結果');
  console.log('='.repeat(55));
  console.log(`  WIN5レッグ総数:     ${win5Results.length}`);
  console.log(`  JRDB マッチ:        ${matchCount} (${(matchCount / win5Results.length * 100).toFixed(1)}%)`);
  console.log(`  不一致:             ${noMatchCount}`);

  // 年別集計
  const byYear = {};
  for (const w of win5Results) {
    const year = w.race_date.slice(0, 4);
    if (!byYear[year]) byYear[year] = { total: 0, match: 0 };
    byYear[year].total++;
  }
  for (const u of updates) {
    const year = u.date.slice(0, 4);
    if (byYear[year]) byYear[year].match++;
  }

  console.log('\n📅 年別マッチ率:');
  console.log('  年     | レッグ | JRDB  ');
  console.log('  -------|--------|-------');
  for (const [year, d] of Object.entries(byYear).sort()) {
    console.log(`  ${year}  | ${String(d.total).padStart(5)} | ${(d.match / d.total * 100).toFixed(0).padStart(3)}%`);
  }

  // 不一致の詳細
  if (mismatches.length > 0) {
    // 不一致の年分布
    const missYears = {};
    for (const m of mismatches) {
      const y = m.race_date.slice(0, 4);
      missYears[y] = (missYears[y] || 0) + 1;
    }
    console.log('\n⚠️  不一致の年分布:');
    for (const [y, c] of Object.entries(missYears).sort()) {
      console.log(`  ${y}: ${c}レッグ`);
    }

    if (args.verbose) {
      console.log('\n  不一致サンプル (先頭10件):');
      for (const m of mismatches.slice(0, 10)) {
        console.log(`    ${m.race_date} Leg${m.leg_number}: ${m.course_name}${m.race_number}R`);
      }
    }
  }

  // ── Step 4: サンプルデータ ──
  if (args.verbose && matchCount > 0) {
    console.log('\n🏆 WIN5勝ち馬のJRDBデータ サンプル:');
    
    // 最新のマッチからサンプル
    const sampleUpdates = updates.slice(-10);
    for (const u of sampleUpdates.slice(0, 5)) {
      const w = win5Results.find(r => r.id === u.win5_id);
      if (!w || !w.winning_umaban) continue;
      
      try {
        const entries = await query(
          `jrdb_race_entries?select=umaban,idm,jockey_index,base_odds,sogo_index,horse_name&race_key=eq.${u.jrdb_race_key}&umaban=eq.${w.winning_umaban}`
        );
        if (entries.length > 0) {
          const e = entries[0];
          console.log(`  ${w.race_date} Leg${w.leg_number} ${w.course_name}${w.race_number}R → ${e.horse_name}(${w.winning_umaban}番) IDM:${e.idm} 総合:${e.sogo_index} JRDBodds:${e.base_odds} (実績:${w.winning_odds}倍)`);
        }
      } catch (e) { /* skip */ }
    }
  }

  // ── Step 5: win5_results更新 ──
  if (args.update && updates.length > 0) {
    console.log(`\n📝 win5_results の jrdb_race_key を更新中... (${updates.length}件)`);
    let updated = 0;
    let errors = 0;

    // バッチ更新（1件ずつPATCH）
    for (const u of updates) {
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
        else errors++;
      } catch (e) { errors++; }
      if ((updated + errors) % 100 === 0) {
        process.stdout.write(`  更新: ${updated}/${updates.length}\r`);
      }
    }
    console.log(`\n✅ ${updated}件更新完了${errors > 0 ? ` (エラー${errors}件)` : ''}`);
  } else if (updates.length > 0 && !args.update) {
    console.log(`\n💡 jrdb_race_keyを更新するには: --update オプション`);
  }

  // ── サマリー ──
  console.log('\n' + '='.repeat(55));
  const rate = matchCount / win5Results.length;
  if (rate > 0.8) {
    console.log(`✅ マッチ率${(rate * 100).toFixed(0)}%: バックテスト実行可能！`);
    console.log(`   次のステップ: --update でrace_key更新 → Phase 2（難易度スコア）へ`);
  } else if (rate > 0.5) {
    console.log(`⚠️  マッチ率${(rate * 100).toFixed(0)}%: 部分的にバックテスト可能`);
    console.log(`   不一致分のJRDBデータ追加取得を推奨`);
  } else {
    console.log(`❌ マッチ率${(rate * 100).toFixed(0)}%: JRDBデータの追加取得が必要`);
  }
  console.log('='.repeat(55));
}

main().catch(e => { console.error(e); process.exit(1); });
