/**
 * JRDB → Supabase インポーター
 *
 * 使い方:
 *   node supabase-import.mjs --dir ./jrdb-data/extracted
 *   node supabase-import.mjs --dir ./jrdb-data/extracted --type kyg    # KYGのみ
 *   node supabase-import.mjs --dir ./jrdb-data/extracted --type ukc    # UKCのみ
 *   node supabase-import.mjs --dir ./jrdb-data/extracted --type sec    # SECのみ
 *   node supabase-import.mjs --dir ./jrdb-data/extracted --aggregate   # 集計テーブル更新
 *
 * 環境変数:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { parseKYG, parseSEC, parseUKC } from './parsers.mjs';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const BATCH_SIZE = 500;

// ─── ファイル探索 ────────────────────────────────────────
function findFiles(dir, prefix) {
  const results = [];
  function walk(d) {
    if (!fs.existsSync(d)) return;
    for (const f of fs.readdirSync(d)) {
      const fp = path.join(d, f);
      if (fs.statSync(fp).isDirectory()) {
        walk(fp);
      } else if (f.toUpperCase().startsWith(prefix.toUpperCase()) && !f.endsWith('.lzh')) {
        results.push(fp);
      }
    }
  }
  walk(dir);
  return results.sort();
}

// ─── バッチ upsert ──────────────────────────────────────
async function batchUpsert(table, rows, conflictColumns, label) {
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from(table)
      .upsert(batch, { onConflict: conflictColumns, ignoreDuplicates: false });

    if (error) {
      console.error(`  ❌ ${label} batch ${Math.floor(i / BATCH_SIZE)}: ${error.message}`);
    } else {
      inserted += batch.length;
    }
  }
  return inserted;
}

// ─── KYGインポート → jrdb_race_entries ──────────────────
async function importKYG(dir) {
  const files = findFiles(dir, 'KYG');
  console.log(`\n🏇 KYG: ${files.length}ファイル → jrdb_race_entries`);

  let total = 0;
  for (const file of files) {
    try {
      const entries = parseKYG(file);
      const rows = entries.map(e => ({
        race_key: e.race_key,
        umaban: e.umaban,
        horse_code: e.horse_code,
        horse_name: e.horse_name,
        idm: e.idm,
        jockey_index: e.jockey_index,
        info_index: e.info_index,
        pace_index: e.pace_index,
        composite_index: e.composite_index,
        running_style: e.running_style,
        base_odds: e.base_odds,
        base_popularity: e.base_popularity,
        training_index: e.training_index,
        stable_index: e.stable_index,
        jockey_name: e.jockey_name,
        ten_index: e.ten_index,
        agari_index: e.agari_index,
        position_index: e.position_index,
        pace_prediction: e.pace_prediction,
      }));

      const count = await batchUpsert(
        'jrdb_race_entries',
        rows,
        'race_key,umaban',
        path.basename(file),
      );
      total += count;
      process.stdout.write(`  ✅ ${path.basename(file)}: ${entries.length}件\r`);
    } catch (err) {
      console.error(`  ❌ ${path.basename(file)}: ${err.message}`);
    }
  }
  console.log(`\n  📊 KYG合計: ${total}件インポート`);
  return total;
}

// ─── SECインポート → jrdb_race_results ──────────────────
async function importSEC(dir) {
  const files = findFiles(dir, 'SEC');
  console.log(`\n📊 SEC: ${files.length}ファイル → jrdb_race_results`);

  let total = 0;
  for (const file of files) {
    try {
      const entries = parseSEC(file);
      const rows = entries
        .filter(e => e.finish_position && e.finish_position > 0)
        .map(e => ({
          race_key: e.race_key,
          umaban: e.umaban,
          horse_code: e.horse_code,
          finish_position: e.finish_position,
          abnormal_code: e.abnormal_code,
          odds: e.odds,
          popularity: e.popularity,
          agari_3f: e.agari_3f,
          weight: e.weight,
          weight_diff: e.weight_diff,
          idm: e.idm,
        }));

      const count = await batchUpsert(
        'jrdb_race_results',
        rows,
        'race_key,umaban',
        path.basename(file),
      );
      total += count;
      process.stdout.write(`  ✅ ${path.basename(file)}: ${rows.length}件\r`);
    } catch (err) {
      console.error(`  ❌ ${path.basename(file)}: ${err.message}`);
    }
  }
  console.log(`\n  📊 SEC合計: ${total}件インポート`);
  return total;
}

// ─── UKCインポート → jrdb_horses ────────────────────────
async function importUKC(dir) {
  const files = findFiles(dir, 'UKC');
  console.log(`\n🧬 UKC: ${files.length}ファイル → jrdb_horses`);

  // 全ファイルから馬データを集めて重複排除
  const horseMap = new Map();
  for (const file of files) {
    try {
      const entries = parseUKC(file);
      for (const e of entries) {
        if (e.horse_code && e.horse_code.trim()) {
          horseMap.set(e.horse_code, {
            horse_code: e.horse_code,
            horse_name: e.horse_name,
            sex_code: e.sex_code,
            sire_name: e.sire_name,
            dam_sire_name: e.dam_sire_name,
            sire_lineage_code: e.sire_lineage_code,
            dam_lineage_code: e.dam_lineage_code,
            trainer_name: e.trainer_name,
            birth_year: e.birth_year,
          });
        }
      }
      process.stdout.write(`  📖 ${path.basename(file)}: ${entries.length}頭\r`);
    } catch (err) {
      console.error(`  ❌ ${path.basename(file)}: ${err.message}`);
    }
  }

  const rows = [...horseMap.values()];
  console.log(`\n  🐴 ユニーク馬: ${rows.length}頭`);

  const count = await batchUpsert('jrdb_horses', rows, 'horse_code', 'UKC');
  console.log(`  📊 UKC合計: ${count}件インポート`);
  return count;
}

// ─── 種牡馬×コース×距離 集計 ─────────────────────────────
async function aggregateSireStats() {
  console.log('\n📈 種牡馬×コース×距離 集計...');

  // Supabase RPC で集計（大量データのためサーバーサイドで実行）
  const { error } = await supabase.rpc('refresh_sire_course_distance_stats');

  if (error) {
    console.error(`  ❌ 集計エラー: ${error.message}`);
    console.log('  💡 手動SQLで実行してください（migration SQL参照）');
    return;
  }

  // 件数確認
  const { count } = await supabase
    .from('sire_course_distance_stats')
    .select('*', { count: 'exact', head: true });

  console.log(`  ✅ 集計完了: ${count}件`);
}

// ─── メイン ─────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const getArg = (flag) => {
    const idx = args.indexOf(flag);
    return idx >= 0 ? args[idx + 1] : null;
  };

  const dir = getArg('--dir') || './jrdb-data/extracted';
  const typeFilter = getArg('--type') || 'all';
  const doAggregate = args.includes('--aggregate');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🏇 JRDB → Supabase インポーター');
  console.log(`   ディレクトリ: ${dir}`);
  console.log(`   種別: ${typeFilter}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const results = {};

  if (typeFilter === 'all' || typeFilter === 'kyg') {
    results.kyg = await importKYG(dir);
  }

  if (typeFilter === 'all' || typeFilter === 'sec') {
    results.sec = await importSEC(dir);
  }

  if (typeFilter === 'all' || typeFilter === 'ukc') {
    results.ukc = await importUKC(dir);
  }

  if (doAggregate || typeFilter === 'all') {
    await aggregateSireStats();
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ インポート完了');
  if (results.kyg) console.log(`   KYG: ${results.kyg}件`);
  if (results.sec) console.log(`   SEC: ${results.sec}件`);
  if (results.ukc) console.log(`   UKC: ${results.ukc}件`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
