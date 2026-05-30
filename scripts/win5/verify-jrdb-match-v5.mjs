#!/usr/bin/env node
/**
 * WIN5 × JRDB マッチング v5 — jrdb_race_results活用版
 * 
 * jrdb_race_results（SECデータ、333K件）の finish_position=1 + odds でマッチ。
 * jrdb_race_entriesのfinish_orderは2026年のみだが、
 * jrdb_race_resultsのfinish_positionは全年カバー。
 * 
 * 使い方:
 *   node verify-jrdb-match-v5.mjs                # 検証のみ
 *   node verify-jrdb-match-v5.mjs --update        # win5_results.jrdb_race_key更新
 *   node verify-jrdb-match-v5.mjs --verbose
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

const COURSE_NAME_TO_CODE = {
  '札幌': '01', '函館': '02', '福島': '03', '新潟': '04',
  '東京': '05', '中山': '06', '中京': '07', '京都': '08',
  '阪神': '09', '小倉': '10',
};

async function main() {
  console.log('\n🔍 WIN5 × JRDB マッチング v5（jrdb_race_results活用）\n');

  // ── Step 1: WIN5結果を取得 ──
  const win5Results = await queryAll(
    'win5_results?select=id,race_date,leg_number,course_code,course_name,race_number,winning_umaban,winning_odds,winning_popularity,jrdb_race_key,payout&order=race_date.asc,leg_number.asc'
  );
  console.log(`📋 WIN5結果: ${win5Results.length}レッグ`);

  // ── Step 2: jrdb_race_results から1着馬を全取得 ──
  console.log('📡 jrdb_race_results の1着馬データ取得中...');
  const winners = await queryAll(
    'jrdb_race_results?select=race_key,umaban,odds,popularity&finish_position=eq.1'
  );
  console.log(`  1着馬レコード: ${winners.length}`);

  // インデックス: "{CC}{YY}{RR}" → [{race_key, umaban, odds, pop}]
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
      odds: w.odds ? w.odds / 10 : null, // SECのoddsは10倍値の可能性あり
      odds_raw: w.odds,
      popularity: w.popularity,
    });
  }
  console.log(`🗂️  インデックスキー: ${winnerIndex.size}\n`);

  // ── Step 3: オッズの単位を確認 ──
  // SECのoddsが10倍値かどうかサンプルで確認
  const sampleWin5 = win5Results.find(w => w.winning_odds && w.winning_odds > 1);
  if (sampleWin5) {
    const cc = sampleWin5.course_code || COURSE_NAME_TO_CODE[sampleWin5.course_name];
    const yy = sampleWin5.race_date.slice(2, 4);
    const rr = String(sampleWin5.race_number).padStart(2, '0');
    const candidates = winnerIndex.get(`${cc}${yy}${rr}`) || [];
    const match = candidates.find(c => c.umaban === sampleWin5.winning_umaban);
    if (match) {
      const ratio = match.odds_raw / sampleWin5.winning_odds;
      console.log(`📐 オッズ単位確認: SEC=${match.odds_raw} WIN5=${sampleWin5.winning_odds} 比率=${ratio.toFixed(1)}`);
      // 比率が約10なら10倍値、約1ならそのまま
      if (ratio > 5) {
        console.log('  → SECオッズは10倍値 (÷10で比較)\n');
      } else {
        console.log('  → SECオッズはそのまま\n');
      }
    }
  }

  // ── Step 4: マッチング ──
  console.log('🔗 マッチング中...');
  let matchExact = 0;
  let matchOdds = 0;
  let matchPopularity = 0;
  let matchAmbiguous = 0;
  let noMatch = 0;
  const updates = [];
  const mismatches = [];

  for (const w5 of win5Results) {
    if (!w5.winning_umaban) { noMatch++; continue; }

    const cc = w5.course_code || COURSE_NAME_TO_CODE[w5.course_name];
    if (!cc) { noMatch++; mismatches.push(w5); continue; }

    const yy = w5.race_date.slice(2, 4);
    const rr = String(w5.race_number).padStart(2, '0');
    const indexKey = `${cc}${yy}${rr}`;

    const candidates = winnerIndex.get(indexKey) || [];
    const umabanMatch = candidates.filter(c => c.umaban === w5.winning_umaban);

    if (umabanMatch.length === 0) {
      noMatch++;
      mismatches.push(w5);
      continue;
    }

    if (umabanMatch.length === 1) {
      matchExact++;
      updates.push({ win5_id: w5.id, jrdb_race_key: umabanMatch[0].race_key, date: w5.race_date });
      continue;
    }

    // 複数候補 → オッズで絞る（SEC odds / 10 ≈ WIN5 odds、許容差±1.5）
    if (w5.winning_odds) {
      const oddsFiltered = umabanMatch.filter(c => {
        if (!c.odds_raw) return false;
        // 10倍値の場合と実値の場合の両方をチェック
        const diff10 = Math.abs(c.odds_raw / 10 - w5.winning_odds);
        const diff1 = Math.abs(c.odds_raw - w5.winning_odds);
        return diff10 < 1.5 || diff1 < 1.5;
      });

      if (oddsFiltered.length === 1) {
        matchOdds++;
        updates.push({ win5_id: w5.id, jrdb_race_key: oddsFiltered[0].race_key, date: w5.race_date });
        continue;
      }
    }

    // 人気で絞る
    if (w5.winning_popularity) {
      const popFiltered = umabanMatch.filter(c => c.popularity === w5.winning_popularity);
      if (popFiltered.length === 1) {
        matchPopularity++;
        updates.push({ win5_id: w5.id, jrdb_race_key: popFiltered[0].race_key, date: w5.race_date });
        continue;
      }
    }

    // 曖昧だが最初の候補を使用
    matchAmbiguous++;
    updates.push({ win5_id: w5.id, jrdb_race_key: umabanMatch[0].race_key, date: w5.race_date });
  }

  const totalMatch = matchExact + matchOdds + matchPopularity + matchAmbiguous;

  // ── 結果表示 ──
  console.log('\n' + '='.repeat(55));
  console.log('📊 マッチング結果');
  console.log('='.repeat(55));
  console.log(`  WIN5レッグ総数:     ${win5Results.length}`);
  console.log(`  マッチ合計:         ${totalMatch} (${(totalMatch / win5Results.length * 100).toFixed(1)}%)`);
  console.log(`    一意マッチ:       ${matchExact}`);
  console.log(`    オッズ絞り込み:   ${matchOdds}`);
  console.log(`    人気絞り込み:     ${matchPopularity}`);
  console.log(`    曖昧:             ${matchAmbiguous}`);
  console.log(`  不一致:             ${noMatch}`);

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
      console.log(`    ${m.race_date} Leg${m.leg_number}: ${m.course_name}${m.race_number}R uma=${m.winning_umaban} pattern=${cc}${yy}??${rr}`);
    }
  }

  // サンプルデータ
  if (args.verbose && totalMatch > 0) {
    console.log('\n🏆 マッチしたWIN5勝ち馬 サンプル（各年1件）:');
    const seenYears = new Set();
    for (const u of updates) {
      const y = u.date.slice(0, 4);
      if (seenYears.has(y)) continue;
      seenYears.add(y);

      const w = win5Results.find(r => r.id === u.win5_id);
      if (!w) continue;
      try {
        const entries = await query(
          `jrdb_race_entries?select=umaban,horse_name,idm,sogo_index,base_odds,jockey_name&race_key=eq.${u.jrdb_race_key}&umaban=eq.${w.winning_umaban}`
        );
        if (entries.length > 0) {
          const e = entries[0];
          console.log(`  ${w.race_date} ${w.course_name}${w.race_number}R → ${e.horse_name || '?'}(${w.winning_umaban}番) IDM:${e.idm} 総合:${e.sogo_index} JRDBodds:${e.base_odds} 実績:${w.winning_odds}倍`);
        }
      } catch (e) { /* skip */ }
    }
  }

  // ── Step 5: 更新 ──
  if (args.update && updates.length > 0) {
    console.log(`\n📝 win5_results.jrdb_race_key を更新中... (${updates.length}件)`);
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
    console.log(`\n💡 更新するには: --update オプション`);
  }

  // サマリー
  console.log('\n' + '='.repeat(55));
  const rate = totalMatch / win5Results.length;
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
