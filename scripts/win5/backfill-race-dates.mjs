#!/usr/bin/env node
/**
 * jrdb_race_entries.race_date バックフィル
 * 
 * KYGファイル名（KYGYYMMDD）から日付を取得し、
 * ファイル内のrace_keyに対応するレコードのrace_dateを更新。
 * 
 * 使い方:
 *   cd ~/gate-in/scripts/win5
 *   export $(grep -E '^(NEXT_PUBLIC_SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY)=' ~/gate-in/.env.local | xargs)
 *   node backfill-race-dates.mjs                          # 自動検出
 *   node backfill-race-dates.mjs --dir ~/gate-in/jrdb-data/extracted  # ディレクトリ指定
 *   node backfill-race-dates.mjs --dry-run                # 確認のみ
 */

import fs from 'fs';
import path from 'path';
import { parseArgs } from 'util';

const { values: args } = parseArgs({
  options: {
    dir:      { type: 'string', default: '' },
    'dry-run': { type: 'boolean', default: false },
  },
});

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ 環境変数を設定してください');
  process.exit(1);
}

const DRY_RUN = args['dry-run'];

// ── KYGファイルを再帰的に探す ──
// 構造: extracted/YYMMDD/KYGYYMMDD.txt
function findKygFiles() {
  const candidates = [
    args.dir,
    path.join(process.env.HOME, 'gate-in', 'scripts', 'jrdb', 'jrdb-data', 'extracted'),
    path.join(process.env.HOME, 'gate-in', 'jrdb-data', 'extracted'),
    path.join(process.cwd(), 'jrdb-data', 'extracted'),
  ].filter(Boolean);

  for (const baseDir of candidates) {
    if (!fs.existsSync(baseDir)) continue;
    
    const kygFiles = [];
    // サブディレクトリを走査
    const entries = fs.readdirSync(baseDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const subDir = path.join(baseDir, entry.name);
        const files = fs.readdirSync(subDir).filter(f => /^KYG\d{6}/i.test(f));
        for (const f of files) {
          kygFiles.push(path.join(subDir, f));
        }
      } else if (/^KYG\d{6}/i.test(entry.name)) {
        // フラット構造にも対応
        kygFiles.push(path.join(baseDir, entry.name));
      }
    }
    
    if (kygFiles.length > 0) {
      return { baseDir, files: kygFiles.sort() };
    }
  }
  return null;
}

// ── KYGファイルからrace_keyを抽出 ──
// KYGレコード長: 1行に1馬、race_keyは先頭8バイト
function extractRaceKeysFromKyg(filePath) {
  const content = fs.readFileSync(filePath, 'latin1'); // Shift-JIS互換で読む
  const lines = content.split('\n').filter(l => l.trim().length >= 8);
  const keys = new Set();
  for (const line of lines) {
    const raceKey = line.substring(0, 8).trim();
    if (/^[0-9a-f]{8}$/i.test(raceKey)) {
      keys.add(raceKey);
    }
  }
  return [...keys];
}

// ── ファイル名から日付を抽出 ──
// KYG260503 → 2026-05-03
function filenameToDate(filename) {
  const match = filename.match(/KYG(\d{2})(\d{2})(\d{2})/i);
  if (!match) return null;
  const yy = parseInt(match[1]);
  const mm = match[2];
  const dd = match[3];
  const year = yy >= 80 ? 1900 + yy : 2000 + yy; // 80-99→19xx, 00-79→20xx
  return `${year}-${mm}-${dd}`;
}

// ── Supabase バッチ更新 ──
async function updateRaceDate(raceKeys, raceDate) {
  // race_keyの一括更新: 同じrace_dateのrace_keyをまとめてPATCH
  const BATCH = 50;
  let updated = 0;

  for (let i = 0; i < raceKeys.length; i += BATCH) {
    const batch = raceKeys.slice(i, i + BATCH);
    const inClause = batch.join(',');
    
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/jrdb_race_entries?race_key=in.(${inClause})&race_date=is.null`,
      {
        method: 'PATCH',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal,count=exact',
        },
        body: JSON.stringify({ race_date: raceDate }),
      }
    );

    if (!res.ok) {
      const text = await res.text();
      console.error(`    ❌ ${raceDate} batch ${i}: ${res.status} ${text}`);
    } else {
      const range = res.headers.get('content-range');
      const count = range ? parseInt(range.split('/')[1]) || 0 : 0;
      updated += count;
    }
  }

  return updated;
}

async function main() {
  console.log('\n📅 jrdb_race_entries.race_date バックフィル\n');

  // ── KYGファイルを検索 ──
  const result = findKygFiles();
  if (!result) {
    console.error('❌ KYGファイルが見つかりません。--dir で指定してください');
    console.error('   例: node backfill-race-dates.mjs --dir ~/gate-in/scripts/jrdb/jrdb-data/extracted');
    process.exit(1);
  }

  const { baseDir, files: kygFilePaths } = result;

  console.log(`📂 KYGベースディレクトリ: ${baseDir}`);
  console.log(`📄 KYGファイル数: ${kygFilePaths.length}\n`);

  if (kygFilePaths.length === 0) {
    console.error('❌ KYGファイルが見つかりません');
    process.exit(1);
  }

  // ── 各ファイルから日付→race_keyマッピングを構築 ──
  const dateMap = new Map(); // date → Set<race_key>
  let totalKeys = 0;

  for (const filePath of kygFilePaths) {
    const filename = path.basename(filePath);
    const date = filenameToDate(filename);
    if (!date) continue;

    const raceKeys = extractRaceKeysFromKyg(filePath);
    
    if (raceKeys.length > 0) {
      dateMap.set(date, raceKeys);
      totalKeys += raceKeys.length;
    }
  }

  console.log(`📊 日付数: ${dateMap.size}`);
  console.log(`🔑 ユニークrace_key数: ${totalKeys}`);
  
  // 日付範囲
  const dates = [...dateMap.keys()].sort();
  console.log(`📅 範囲: ${dates[0]} ~ ${dates[dates.length - 1]}\n`);

  if (DRY_RUN) {
    console.log('--- dry-run: サンプル ---');
    let shown = 0;
    for (const [date, keys] of dateMap) {
      if (shown >= 5) break;
      console.log(`  ${date}: ${keys.length}レース (${keys.slice(0, 3).join(', ')}...)`);
      shown++;
    }
    console.log(`\n  合計: ${dateMap.size}日分のrace_dateを更新予定`);
    console.log('  実行するには: --dry-run を外してください');
    return;
  }

  // ── 更新実行 ──
  console.log('🔄 更新中...\n');
  let totalUpdated = 0;
  let processedDates = 0;

  for (const [date, raceKeys] of dateMap) {
    const updated = await updateRaceDate(raceKeys, date);
    totalUpdated += updated;
    processedDates++;

    if (processedDates % 50 === 0 || updated > 0) {
      process.stdout.write(`  [${processedDates}/${dateMap.size}] ${date}: ${updated}件更新 (累計${totalUpdated})\n`);
    }
  }

  console.log(`\n✅ 完了: ${totalUpdated}件のrace_dateを更新 (${processedDates}日分処理)`);

  // ── 検証 ──
  console.log('\n📊 検証...');
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/jrdb_race_entries?select=id&race_date=is.null&limit=1`,
    {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Prefer: 'count=exact',
      },
    }
  );
  const remaining = res.headers.get('content-range');
  console.log(`  残りnull: ${remaining}`);
}

main().catch(e => { console.error(e); process.exit(1); });
