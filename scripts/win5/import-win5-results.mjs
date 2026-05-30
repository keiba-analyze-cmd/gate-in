#!/usr/bin/env node
/**
 * WIN5結果 → Supabase インポート
 * 
 * 前提: 
 *   1. create-tables.sql をSupabase SQL Editorで実行済み
 *   2. scrape-win5-list.mjs で win5-data/win5-full.json を取得済み
 * 
 * 使い方:
 *   export NEXT_PUBLIC_SUPABASE_URL=xxx
 *   export SUPABASE_SERVICE_ROLE_KEY=xxx
 *   node import-win5-results.mjs
 *   node import-win5-results.mjs --file ./win5-data/win5-list.json   # 一覧データのみ
 *   node import-win5-results.mjs --dry-run                            # 確認のみ
 */

import fs from 'fs';
import path from 'path';
import { parseArgs } from 'util';

const { values: args } = parseArgs({
  options: {
    file:    { type: 'string', default: '' },
    'dry-run': { type: 'boolean', default: false },
  },
});

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ 環境変数 NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY を設定してください');
  process.exit(1);
}

const DRY_RUN = args['dry-run'];

// ── データファイル選択 ──
const DATA_DIR = path.join(process.cwd(), 'win5-data');
const fullFile = path.join(DATA_DIR, 'win5-full.json');
const listFile = path.join(DATA_DIR, 'win5-list.json');
const inputFile = args.file || (fs.existsSync(fullFile) ? fullFile : listFile);

if (!fs.existsSync(inputFile)) {
  console.error(`❌ データファイルが見つかりません: ${inputFile}`);
  console.error('  先に scrape-win5-list.mjs --detail を実行してください');
  process.exit(1);
}

// ── Supabase REST API ──
async function supabaseRPC(table, method, body, query = '') {
  const url = `${SUPABASE_URL}/rest/v1/${table}${query}`;
  const res = await fetch(url, {
    method,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': method === 'POST' ? 'resolution=merge-duplicates,return=minimal' : 'return=minimal',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase ${method} ${table}: ${res.status} ${text}`);
  }
  return res;
}

// ── メイン ──
async function main() {
  const rawData = JSON.parse(fs.readFileSync(inputFile, 'utf-8'));
  console.log(`\n📥 WIN5結果インポート`);
  console.log(`  ファイル: ${inputFile}`);
  console.log(`  レコード: ${rawData.length}件`);
  if (DRY_RUN) console.log('  🔍 dry-run モード\n');

  const hasLegs = rawData[0]?.legs?.length > 0;
  console.log(`  データ形式: ${hasLegs ? 'フル（レッグ詳細あり）' : '一覧のみ'}\n`);

  // ── レコード生成 ──
  const rows = [];

  for (const entry of rawData) {
    if (hasLegs && entry.legs) {
      // フルデータ: 各レッグを個別レコードに
      for (const leg of entry.legs) {
        rows.push({
          race_date: entry.race_date,
          leg_number: leg.leg_number,
          course_code: leg.course_code || null,
          course_name: leg.course_name || null,
          race_number: leg.race_number || null,
          race_name: leg.race_name || null,
          winning_umaban: leg.winning_umaban,
          winning_odds: leg.winning_odds || null,
          winning_popularity: leg.winning_popularity || null,
          jrdb_race_key: leg.jrdb_race_key || null,
          // WIN5全体データはleg_number=1のみ
          payout: leg.leg_number === 1 ? entry.payout : null,
          hit_count: leg.leg_number === 1 ? entry.hit_count : null,
          total_tickets: leg.leg_number === 1 ? entry.total_tickets : null,
          carryover: leg.leg_number === 1 ? (entry.carryover || 0) : null,
        });
      }
    } else {
      // 一覧データのみ: 馬番のみ
      for (let i = 0; i < 5; i++) {
        const umaban = entry.winning_umabans?.[i];
        if (!umaban) continue;
        rows.push({
          race_date: entry.race_date,
          leg_number: i + 1,
          winning_umaban: umaban,
          payout: i === 0 ? entry.payout : null,
          hit_count: i === 0 ? entry.hit_count : null,
          total_tickets: i === 0 ? entry.total_tickets : null,
        });
      }
    }
  }

  console.log(`  生成レコード: ${rows.length}件 (${rawData.length}日 × 5レッグ)\n`);

  if (DRY_RUN) {
    console.log('--- サンプル (最新5日分) ---');
    const lastDate = rawData.slice(-1)[0]?.race_date;
    const sample = rows.filter(r => r.race_date === lastDate);
    console.table(sample.map(r => ({
      date: r.race_date,
      leg: r.leg_number,
      course: r.course_name || '-',
      R: r.race_number || '-',
      umaban: r.winning_umaban,
      odds: r.winning_odds || '-',
      pop: r.winning_popularity || '-',
      jrdb_key: r.jrdb_race_key || '-',
    })));
    console.log(`\n実行するには: --dry-run を外してください`);
    return;
  }

  // ── バッチ upsert ──
  const BATCH_SIZE = 200;
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    try {
      // upsert (race_date, leg_number) の UNIQUE制約で重複排除
      await supabaseRPC('win5_results', 'POST', batch, '?on_conflict=race_date,leg_number');
      inserted += batch.length;
      process.stdout.write(`  Upsert: ${inserted}/${rows.length}\r`);
    } catch (e) {
      console.error(`\n  ❌ バッチ ${i}-${i + batch.length}: ${e.message}`);
      errors++;
      // 1件ずつリトライ
      for (const row of batch) {
        try {
          await supabaseRPC('win5_results', 'POST', [row], '?on_conflict=race_date,leg_number');
          inserted++;
        } catch (e2) {
          console.error(`    ${row.race_date} leg${row.leg_number}: ${e2.message}`);
        }
      }
    }
  }

  console.log(`\n\n✅ 完了: ${inserted}件インポート${errors > 0 ? ` (エラー${errors}バッチ)` : ''}`);

  // ── 検証クエリ ──
  console.log('\n📊 検証...');
  const countRes = await fetch(
    `${SUPABASE_URL}/rest/v1/win5_results?select=race_date&order=race_date.desc&limit=1`,
    { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
  );
  const latest = await countRes.json();
  if (latest.length > 0) {
    console.log(`  最新データ: ${latest[0].race_date}`);
  }

  const totalRes = await fetch(
    `${SUPABASE_URL}/rest/v1/win5_results?select=race_date`,
    { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Prefer': 'count=exact' } }
  );
  const total = totalRes.headers.get('content-range');
  console.log(`  総レコード: ${total}`);
}

main().catch(e => { console.error(e); process.exit(1); });
