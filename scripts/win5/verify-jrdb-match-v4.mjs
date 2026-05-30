#!/usr/bin/env node
/**
 * WIN5 × JRDB マッチング v4 — race_keyパターンマッチ方式
 * 
 * race_dateを使わず、race_keyの構造（CC+YY+回+日+RR）を利用:
 *   パターン: {course_code}{YY}__{race_number} でLIKE検索
 *   + umaban = winning_umaban AND finish_order = 1 で一意特定
 * 
 * 使い方:
 *   node verify-jrdb-match-v4.mjs                # 検証のみ
 *   node verify-jrdb-match-v4.mjs --update        # win5_results.jrdb_race_key更新
 *   node verify-jrdb-match-v4.mjs --verbose
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

// course_name → course_code マッピング
const COURSE_NAME_TO_CODE = {
  '札幌': '01', '函館': '02', '福島': '03', '新潟': '04',
  '東京': '05', '中山': '06', '中京': '07', '京都': '08',
  '阪神': '09', '小倉': '10',
};

async function main() {
  console.log('\n🔍 WIN5 × JRDB マッチング v4（race_keyパターンマッチ）\n');

  // ── Step 1: WIN5結果を取得 ──
  const win5Results = await queryAll(
    'win5_results?select=id,race_date,leg_number,course_code,course_name,race_number,winning_umaban,winning_odds,winning_popularity,jrdb_race_key,payout&order=race_date.asc,leg_number.asc'
  );
  console.log(`📋 WIN5結果: ${win5Results.length}レッグ\n`);

  // ── Step 2: 全jrdb_race_entriesの勝ち馬インデックスを構築 ──
  // finish_order=1 のエントリだけ取得してインデックス化
  console.log('📡 JRDBの1着馬データ取得中...');
  const winners = await queryAll(
    'jrdb_race_entries?select=race_key,umaban,final_tansho_odds,final_tansho_popularity&finish_order=eq.1'
  );
  console.log(`  1着馬レコード: ${winners.length}\n`);

  // インデックス: "{CC}{YY}{RR}" → [{race_key, umaban, odds, pop}]
  // race_keyの1-4文字(CCYY) + 7-8文字(RR) をキーに
  const winnerIndex = new Map();
  for (const w of winners) {
    if (!w.race_key || w.race_key.length !== 8) continue;
    const cc = w.race_key.slice(0, 2);
    const yy = w.race_key.slice(2, 4);
    const rr = w.race_key.slice(6, 8);
    const indexKey = `${cc}${yy}${rr}`;
    
    if (!winnerIndex.has(indexKey)) winnerIndex.set(indexKey, []);
    winnerIndex.get(indexKey).push({
      race_key: w.race_key,
      umaban: w.umaban,
      odds: w.final_tansho_odds,
      popularity: w.final_tansho_popularity,
    });
  }

  console.log(`🗂️  インデックスキー: ${winnerIndex.size}\n`);

  // ── Step 3: マッチング ──
  console.log('🔗 マッチング中...');
  let matchCount = 0;
  let noMatchCount = 0;
  let multiMatch = 0;
  const updates = [];
  const mismatches = [];

  for (const w5 of win5Results) {
    if (!w5.winning_umaban) { noMatchCount++; continue; }

    // course_codeがなければcourse_nameから変換
    const cc = w5.course_code || COURSE_NAME_TO_CODE[w5.course_name];
    if (!cc) { noMatchCount++; mismatches.push(w5); continue; }

    const yy = w5.race_date.slice(2, 4); // 2019 → 19
    const rr = String(w5.race_number).padStart(2, '0');
    const indexKey = `${cc}${yy}${rr}`;

    const candidates = winnerIndex.get(indexKey) || [];
    
    // umaban一致でフィルタ
    const umabanMatch = candidates.filter(c => c.umaban === w5.winning_umaban);

    if (umabanMatch.length === 1) {
      // 完全一致
      matchCount++;
      updates.push({ win5_id: w5.id, jrdb_race_key: umabanMatch[0].race_key, date: w5.race_date });
    } else if (umabanMatch.length > 1) {
      // 複数候補 → オッズで絞る
      const oddsMatch = umabanMatch.filter(c => 
        c.odds && w5.winning_odds && Math.abs(c.odds - w5.winning_odds) < 2.0
      );
      if (oddsMatch.length === 1) {
        matchCount++;
        updates.push({ win5_id: w5.id, jrdb_race_key: oddsMatch[0].race_key, date: w5.race_date });
      } else if (oddsMatch.length > 1) {
        // 人気でさらに絞る
        const popMatch = oddsMatch.filter(c =>
          c.popularity && w5.winning_popularity && c.popularity === w5.winning_popularity
        );
        if (popMatch.length >= 1) {
          matchCount++;
          updates.push({ win5_id: w5.id, jrdb_race_key: popMatch[0].race_key, date: w5.race_date });
        } else {
          multiMatch++;
          matchCount++;
          updates.push({ win5_id: w5.id, jrdb_race_key: oddsMatch[0].race_key, date: w5.race_date });
        }
      } else {
        // オッズ情報なし → 最初の候補を使用（同年同コース同R同馬番で複数1着はまれ）
        multiMatch++;
        matchCount++;
        updates.push({ win5_id: w5.id, jrdb_race_key: umabanMatch[0].race_key, date: w5.race_date });
      }
    } else {
      noMatchCount++;
      mismatches.push(w5);
    }
  }

  // ── 結果表示 ──
  console.log('\n' + '='.repeat(55));
  console.log('📊 マッチング結果');
  console.log('='.repeat(55));
  console.log(`  WIN5レッグ総数:     ${win5Results.length}`);
  console.log(`  マッチ:             ${matchCount} (${(matchCount / win5Results.length * 100).toFixed(1)}%)`);
  console.log(`  不一致:             ${noMatchCount}`);
  if (multiMatch > 0) console.log(`  曖昧マッチ:         ${multiMatch} (オッズ/人気で絞り込み)`);

  // 年別
  const byYear = {};
  for (const w of win5Results) {
    const y = w.race_date.slice(0, 4);
    if (!byYear[y]) byYear[y] = { total: 0, match: 0 };
    byYear[y].total++;
  }
  for (const u of updates) {
    const y = u.date.slice(0, 4);
    if (byYear[y]) byYear[y].match++;
  }

  console.log('\n📅 年別マッチ率:');
  console.log('  年     | レッグ | マッチ');
  console.log('  -------|--------|-------');
  for (const [year, d] of Object.entries(byYear).sort()) {
    console.log(`  ${year}  | ${String(d.total).padStart(5)} | ${(d.match / d.total * 100).toFixed(0).padStart(3)}%`);
  }

  // 不一致サンプル
  if (mismatches.length > 0 && args.verbose) {
    console.log(`\n⚠️  不一致サンプル (先頭10件):`);
    for (const m of mismatches.slice(0, 10)) {
      const cc = m.course_code || COURSE_NAME_TO_CODE[m.course_name] || '??';
      const yy = m.race_date.slice(2, 4);
      const rr = String(m.race_number).padStart(2, '0');
      console.log(`  ${m.race_date} Leg${m.leg_number}: ${m.course_name}${m.race_number}R uma=${m.winning_umaban} key=${cc}${yy}__${rr}`);
    }
  }

  // サンプルデータ
  if (args.verbose && matchCount > 0) {
    console.log('\n🏆 マッチしたWIN5勝ち馬 サンプル:');
    const samples = updates.slice(-10);
    for (const u of samples.slice(0, 5)) {
      const w = win5Results.find(r => r.id === u.win5_id);
      if (!w) continue;
      try {
        const entries = await query(
          `jrdb_race_entries?select=umaban,horse_name,idm,sogo_index,base_odds,jockey_name&race_key=eq.${u.jrdb_race_key}&umaban=eq.${w.winning_umaban}`
        );
        if (entries.length > 0) {
          const e = entries[0];
          console.log(`  ${w.race_date} Leg${w.leg_number} ${w.course_name}${w.race_number}R → ${e.horse_name}(${w.winning_umaban}番) IDM:${e.idm} 総合:${e.sogo_index} JRDBodds:${e.base_odds} 実績:${w.winning_odds}倍`);
        }
      } catch (e) { /* skip */ }
    }
  }

  // ── Step 4: 更新 ──
  if (args.update && updates.length > 0) {
    console.log(`\n📝 win5_results の jrdb_race_key を更新中... (${updates.length}件)`);
    let updated = 0;
    let errors = 0;

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
      if ((updated + errors) % 200 === 0) process.stdout.write(`  更新: ${updated}/${updates.length}\r`);
    }
    console.log(`\n✅ ${updated}件更新完了${errors > 0 ? ` (エラー${errors}件)` : ''}`);
  } else if (updates.length > 0) {
    console.log(`\n💡 jrdb_race_keyを更新するには: --update オプション`);
  }

  // サマリー
  console.log('\n' + '='.repeat(55));
  const rate = matchCount / win5Results.length;
  if (rate > 0.8) {
    console.log(`✅ マッチ率${(rate * 100).toFixed(0)}%: バックテスト実行可能！`);
  } else if (rate > 0.5) {
    console.log(`⚠️  マッチ率${(rate * 100).toFixed(0)}%: 部分的にバックテスト可能`);
  } else {
    console.log(`❌ マッチ率${(rate * 100).toFixed(0)}%: JRDBデータの追加が必要`);
  }
  console.log('='.repeat(55));
}

main().catch(e => { console.error(e); process.exit(1); });
