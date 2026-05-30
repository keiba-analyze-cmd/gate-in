#!/usr/bin/env node
/**
 * WIN5結果 × JRDB マッチング検証
 * 
 * win5_results.jrdb_race_key → jrdb_race_entries でマッチ率を確認。
 * マッチしたレースでは、KYGデータ(IDM等)が使えるかも検証。
 * 
 * 使い方:
 *   export NEXT_PUBLIC_SUPABASE_URL=xxx
 *   export SUPABASE_SERVICE_ROLE_KEY=xxx
 *   node verify-jrdb-match.mjs
 *   node verify-jrdb-match.mjs --from 2024-01-01   # 期間指定
 *   node verify-jrdb-match.mjs --verbose             # 詳細表示
 */

import { parseArgs } from 'util';

const { values: args } = parseArgs({
  options: {
    from:    { type: 'string', default: '' },
    to:      { type: 'string', default: '' },
    verbose: { type: 'boolean', default: false },
  },
});

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ 環境変数を設定してください');
  process.exit(1);
}

async function query(table, select, filter = '') {
  const url = `${SUPABASE_URL}/rest/v1/${table}?select=${encodeURIComponent(select)}${filter}`;
  const res = await fetch(url, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    },
  });
  if (!res.ok) throw new Error(`Query ${table}: ${res.status} ${await res.text()}`);
  return res.json();
}

// ページネーション付きクエリ
async function queryAll(table, select, filter = '', pageSize = 1000) {
  let all = [];
  let offset = 0;
  while (true) {
    const url = `${SUPABASE_URL}/rest/v1/${table}?select=${encodeURIComponent(select)}${filter}&limit=${pageSize}&offset=${offset}`;
    const res = await fetch(url, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      },
    });
    if (!res.ok) throw new Error(`Query ${table}: ${res.status}`);
    const data = await res.json();
    all = all.concat(data);
    if (data.length < pageSize) break;
    offset += pageSize;
  }
  return all;
}

async function main() {
  console.log('\n🔍 WIN5 × JRDB マッチング検証\n');

  // ── Step 1: WIN5結果を取得 ──
  let dateFilter = '';
  if (args.from) dateFilter += `&race_date=gte.${args.from}`;
  if (args.to) dateFilter += `&race_date=lte.${args.to}`;

  const win5Results = await queryAll(
    'win5_results',
    'race_date,leg_number,course_name,race_number,race_name,winning_umaban,winning_odds,winning_popularity,jrdb_race_key,payout',
    `&order=race_date.asc,leg_number.asc${dateFilter}`
  );

  console.log(`📋 WIN5結果: ${win5Results.length}件 (${win5Results.length / 5}日分)`);

  if (win5Results.length === 0) {
    console.log('  → データなし。先にimport-win5-results.mjsを実行してください。');
    return;
  }

  // ── Step 2: JRDB race_keys を取得 ──
  // jrdb_race_entriesに存在するrace_keyのセットを取得
  const raceKeys = [...new Set(win5Results.map(r => r.jrdb_race_key).filter(Boolean))];
  console.log(`🔑 マッチ対象race_key: ${raceKeys.length}件`);

  // バッチで存在確認（race_keyでフィルタ）
  const BATCH = 100;
  const matchedKeys = new Set();
  const matchedWithResult = new Set(); // SEC結果もある

  for (let i = 0; i < raceKeys.length; i += BATCH) {
    const batch = raceKeys.slice(i, i + BATCH);
    const inClause = `in.(${batch.join(',')})`;
    
    // KYGデータ存在確認
    const kygRows = await query(
      'jrdb_race_entries',
      'race_key',
      `&race_key=${inClause}&limit=1000`
    );
    for (const row of kygRows) {
      matchedKeys.add(row.race_key);
    }

    // SEC結果データ存在確認
    try {
      const secRows = await query(
        'jrdb_race_results',
        'race_key',
        `&race_key=${inClause}&limit=1000`
      );
      for (const row of secRows) {
        matchedWithResult.add(row.race_key);
      }
    } catch (e) {
      // jrdb_race_results テーブルがなければスキップ
    }

    process.stdout.write(`  確認中: ${Math.min(i + BATCH, raceKeys.length)}/${raceKeys.length}\r`);
  }

  console.log('');

  // ── Step 3: 集計 ──
  const totalLegs = win5Results.filter(r => r.jrdb_race_key).length;
  const matchedLegs = win5Results.filter(r => matchedKeys.has(r.jrdb_race_key)).length;
  const resultLegs = win5Results.filter(r => matchedWithResult.has(r.jrdb_race_key)).length;

  console.log('\n' + '='.repeat(55));
  console.log('📊 マッチング結果');
  console.log('='.repeat(55));
  console.log(`  WIN5レッグ総数:     ${totalLegs}`);
  console.log(`  KYG マッチ:         ${matchedLegs} (${(matchedLegs / totalLegs * 100).toFixed(1)}%)`);
  console.log(`  SEC(結果)マッチ:    ${resultLegs} (${(resultLegs / totalLegs * 100).toFixed(1)}%)`);
  console.log(`  KYG 不一致:         ${totalLegs - matchedLegs}`);

  // ── 年別マッチ率 ──
  const byYear = {};
  for (const r of win5Results) {
    if (!r.jrdb_race_key) continue;
    const year = r.race_date.slice(0, 4);
    if (!byYear[year]) byYear[year] = { total: 0, kyg: 0, sec: 0 };
    byYear[year].total++;
    if (matchedKeys.has(r.jrdb_race_key)) byYear[year].kyg++;
    if (matchedWithResult.has(r.jrdb_race_key)) byYear[year].sec++;
  }

  console.log('\n📅 年別マッチ率:');
  console.log('  年     | レッグ | KYG   | SEC   ');
  console.log('  -------|--------|-------|-------');
  for (const [year, d] of Object.entries(byYear).sort()) {
    const kygPct = (d.kyg / d.total * 100).toFixed(0);
    const secPct = (d.sec / d.total * 100).toFixed(0);
    console.log(`  ${year}  | ${String(d.total).padStart(5)} | ${kygPct.padStart(3)}%  | ${secPct.padStart(3)}%`);
  }

  // ── 不一致の詳細 ──
  const unmatched = win5Results.filter(r => r.jrdb_race_key && !matchedKeys.has(r.jrdb_race_key));
  if (unmatched.length > 0) {
    console.log(`\n⚠️  KYG不一致レッグ (先頭20件):`);
    for (const r of unmatched.slice(0, 20)) {
      console.log(`  ${r.race_date} Leg${r.leg_number}: ${r.course_name || '?'}${r.race_number || '?'}R key=${r.jrdb_race_key}`);
    }
  }

  // ── Step 4: マッチしたレースのKYGデータ品質チェック ──
  if (matchedLegs > 0) {
    console.log('\n🔬 KYGデータ品質チェック (サンプル10レース)...');
    
    const sampleKeys = [...matchedKeys].slice(0, 10);
    const inClause = `in.(${sampleKeys.join(',')})`;
    
    const sampleData = await query(
      'jrdb_race_entries',
      'race_key,umaban,idm,comprehensive_index,jockey_index,base_odds',
      `&race_key=${inClause}&order=race_key.asc,umaban.asc&limit=200`
    );

    // IDM null率チェック
    const totalEntries = sampleData.length;
    const idmNull = sampleData.filter(r => r.idm == null).length;
    const compNull = sampleData.filter(r => r.comprehensive_index == null).length;
    const oddsNull = sampleData.filter(r => r.base_odds == null).length;

    console.log(`  サンプルエントリー数: ${totalEntries}`);
    console.log(`  IDM null率:          ${(idmNull / totalEntries * 100).toFixed(1)}%`);
    console.log(`  総合指数 null率:      ${(compNull / totalEntries * 100).toFixed(1)}%`);
    console.log(`  基準オッズ null率:    ${(oddsNull / totalEntries * 100).toFixed(1)}%`);

    if (args.verbose && sampleData.length > 0) {
      console.log('\n  サンプルデータ:');
      console.table(sampleData.slice(0, 10).map(r => ({
        race_key: r.race_key,
        umaban: r.umaban,
        idm: r.idm,
        comp: r.comprehensive_index,
        odds: r.base_odds,
      })));
    }

    // WIN5勝ち馬のIDM確認
    console.log('\n🏆 WIN5勝ち馬のIDMデータ確認 (サンプル):');
    const sampleWin5 = win5Results
      .filter(r => matchedKeys.has(r.jrdb_race_key))
      .slice(0, 20);

    for (const w of sampleWin5.slice(0, 5)) {
      const entries = await query(
        'jrdb_race_entries',
        'umaban,idm,comprehensive_index,base_odds,jockey_index',
        `&race_key=eq.${w.jrdb_race_key}&umaban=eq.${w.winning_umaban}`
      );
      if (entries.length > 0) {
        const e = entries[0];
        console.log(`  ${w.race_date} Leg${w.leg_number} ${w.course_name}${w.race_number}R ` +
          `→ ${w.winning_umaban}番 IDM:${e.idm} 総合:${e.comprehensive_index} odds:${e.base_odds} ` +
          `(実績: ${w.winning_odds}倍 ${w.winning_popularity}人気)`);
      }
    }
  }

  // ── サマリー ──
  console.log('\n' + '='.repeat(55));
  if (matchedLegs / totalLegs > 0.8) {
    console.log('✅ マッチ率80%超: バックテスト実行可能');
  } else if (matchedLegs / totalLegs > 0.5) {
    console.log('⚠️  マッチ率50-80%: 部分的にバックテスト可能（不足期間あり）');
  } else {
    console.log('❌ マッチ率50%未満: JRDBデータの追加取得が必要');
  }
  console.log('='.repeat(55));
}

main().catch(e => { console.error(e); process.exit(1); });
