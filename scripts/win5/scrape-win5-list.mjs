#!/usr/bin/env node
/**
 * WIN5結果 - Step 1: 一覧ページから基本データを一括取得
 * 
 * 一覧ページ（/win5?YearMonth=YYYYMM）には以下が含まれる:
 *   - 日付, 的中馬番(例: 8-1-12-7-3), 払戻金, 的中票数/発売票数
 * 
 * 詳細ページ（/win5/results_more?DOR=YYYYMMDD）で追加取得:
 *   - 各レッグの競馬場, R番号, レース名, オッズ, 人気
 * 
 * 使い方:
 *   node scrape-win5-list.mjs                     # 2019-2026 全取得
 *   node scrape-win5-list.mjs --from 2024         # 2024以降
 *   node scrape-win5-list.mjs --detail             # 詳細も取得
 *   node scrape-win5-list.mjs --detail --from 2024 # 2024以降＋詳細
 * 
 * 出力:
 *   ./win5-data/win5-list.json    ← 一覧データ
 *   ./win5-data/win5-full.json    ← 詳細含むフルデータ
 */

import https from 'https';
import { parseArgs } from 'util';
import fs from 'fs';
import path from 'path';

const COURSE_MAP = {
  '01': '札幌', '02': '函館', '03': '福島', '04': '新潟',
  '05': '東京', '06': '中山', '07': '中京', '08': '京都',
  '09': '阪神', '10': '小倉',
};

const { values: args } = parseArgs({
  options: {
    from:     { type: 'string', default: '2019' },
    to:       { type: 'string', default: '2026' },
    detail:   { type: 'boolean', default: false },
    delay:    { type: 'string', default: '1200' },
  },
});

const FROM_YEAR = parseInt(args.from);
const TO_YEAR = parseInt(args.to);
const FETCH_DETAIL = args.detail;
const DELAY_MS = parseInt(args.delay);

const OUT_DIR = path.join(process.cwd(), 'win5-data');
const LIST_FILE = path.join(OUT_DIR, 'win5-list.json');
const FULL_FILE = path.join(OUT_DIR, 'win5-full.json');

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchPage(res.headers.location).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── 一覧ページパース ──
function parseListPage(html, yearMonth) {
  const results = [];

  // DOR=YYYYMMDD のリンクを探す
  const dorRe = /results_more\?DOR=(\d{8})/g;
  const dors = [];
  let m;
  while ((m = dorRe.exec(html)) !== null) {
    if (!dors.includes(m[1])) dors.push(m[1]);
  }

  for (const dor of dors) {
    const entry = {
      race_date: `${dor.slice(0, 4)}-${dor.slice(4, 6)}-${dor.slice(6, 8)}`,
      dor,
      winning_umabans: [],
      payout: null,
      hit_count: null,
      total_tickets: null,
    };

    // DORリンクの周辺からデータ抽出
    const dorIdx = html.indexOf(`DOR=${dor}`);
    // この日付ブロック（DOR出現位置の前後）を取得
    const blockStart = Math.max(0, dorIdx - 500);
    const blockEnd = Math.min(html.length, dorIdx + 2000);
    const block = html.slice(blockStart, blockEnd);

    // 的中馬番: "8-1-12-7-3" or "8－1－12－7－3"
    const umabanMatch = block.match(/(\d{1,2})\s*[-－ー]\s*(\d{1,2})\s*[-－ー]\s*(\d{1,2})\s*[-－ー]\s*(\d{1,2})\s*[-－ー]\s*(\d{1,2})/);
    if (umabanMatch) {
      entry.winning_umabans = [1, 2, 3, 4, 5].map(i => parseInt(umabanMatch[i]));
    }

    // 払戻金
    const payoutMatch = block.match(/払戻金[\s\S]*?([\d,]+)円/);
    if (payoutMatch) {
      entry.payout = parseInt(payoutMatch[1].replace(/,/g, ''));
    }

    // 的中票数 / 発売票数
    const ticketMatch = block.match(/([\d,]+)票\s*\/\s*([\d,]+)票/);
    if (ticketMatch) {
      entry.hit_count = parseInt(ticketMatch[1].replace(/,/g, ''));
      entry.total_tickets = parseInt(ticketMatch[2].replace(/,/g, ''));
    }

    results.push(entry);
  }

  return results;
}

// ── 詳細ページパース ──
function parseDetailPage(html, dor) {
  const legs = [];

  // レースリンクからコード・番号を取得
  const raceRe = /RacetrackCd=(\d{2})&(?:amp;)?RaceNum=(\d{1,2})/g;
  const seen = new Set();
  const racePositions = [];
  let rm;
  while ((rm = raceRe.exec(html)) !== null) {
    const key = `${rm[1]}-${rm[2]}`;
    if (!seen.has(key)) {
      seen.add(key);
      racePositions.push({ courseCode: rm[1], raceNumber: parseInt(rm[2]), index: rm.index });
    }
  }

  for (let i = 0; i < racePositions.length && i < 5; i++) {
    const race = racePositions[i];
    const courseName = COURSE_MAP[race.courseCode] || race.courseCode;

    // レース名
    const nameArea = html.slice(race.index - 200, race.index + 200);
    const nameMatch = nameArea.match(/>([^<]*?(?:${courseName})?[^<]*?\d+R[　\s]+[^<]+)</);
    let raceName = '';
    if (nameMatch) {
      raceName = nameMatch[1].replace(/^.*?\d+R[　\s]*/, '').trim();
    }

    // オッズ・人気（次のレースまたはブロック終端まで）
    const nextIdx = (i < racePositions.length - 1) ? racePositions[i + 1].index : race.index + 3000;
    const block = html.slice(race.index, nextIdx);

    let odds = null;
    let popularity = null;
    const opMatch = block.match(/([\d]+\.[\d]+)[\s\S]*?(\d+)人気/);
    if (opMatch) {
      odds = parseFloat(opMatch[1]);
      popularity = parseInt(opMatch[2]);
    }

    // JRDB race_key
    const yy = dor.slice(2, 4), mm = dor.slice(4, 6), dd = dor.slice(6, 8);
    const jrdb_race_key = `${yy}${mm}${dd}${race.courseCode}${String(race.raceNumber).padStart(2, '0')}`;

    legs.push({
      leg_number: i + 1,
      course_code: race.courseCode,
      course_name: courseName,
      race_number: race.raceNumber,
      race_name: raceName,
      winning_odds: odds,
      winning_popularity: popularity,
      jrdb_race_key,
    });
  }

  return legs;
}

// ── メイン ──
async function main() {
  console.log(`\n🏇 WIN5結果取得 (${FROM_YEAR}-${TO_YEAR})${FETCH_DETAIL ? ' +詳細' : ''}\n`);

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  // ── Phase A: 一覧ページから基本データ ──
  console.log('📅 Phase A: 一覧ページから基本データ取得...\n');
  
  let allEntries = [];
  // 既存データ読み込み
  if (fs.existsSync(LIST_FILE)) {
    allEntries = JSON.parse(fs.readFileSync(LIST_FILE, 'utf-8'));
    console.log(`  既存: ${allEntries.length}件\n`);
  }
  const existingDors = new Set(allEntries.map(e => e.dor));

  for (let year = FROM_YEAR; year <= TO_YEAR; year++) {
    for (let month = 1; month <= 12; month++) {
      // 未来の月はスキップ
      if (year === 2026 && month > 5) continue;
      
      const ym = `${year}${String(month).padStart(2, '0')}`;
      const url = `https://www.winkeiba.jp/win5?YearMonth=${ym}`;

      try {
        const html = await fetchPage(url);
        const entries = parseListPage(html, ym);
        let newCount = 0;
        for (const entry of entries) {
          if (!existingDors.has(entry.dor)) {
            allEntries.push(entry);
            existingDors.add(entry.dor);
            newCount++;
          }
        }
        if (entries.length > 0) {
          console.log(`  ${ym}: ${entries.length}件取得 (新規${newCount})`);
        }
      } catch (e) {
        console.warn(`  ${ym}: ⚠️ ${e.message}`);
      }
      await sleep(400);
    }
  }

  allEntries.sort((a, b) => a.dor.localeCompare(b.dor));
  fs.writeFileSync(LIST_FILE, JSON.stringify(allEntries, null, 2));
  console.log(`\n✅ 一覧データ: ${allEntries.length}件 → ${LIST_FILE}\n`);

  // 検証
  const noUmaban = allEntries.filter(e => e.winning_umabans.length !== 5);
  if (noUmaban.length) {
    console.log(`⚠️  馬番5つ取得できなかった日: ${noUmaban.length}件`);
    noUmaban.slice(0, 5).forEach(e => console.log(`  ${e.dor}: ${e.winning_umabans}`));
  }

  if (!FETCH_DETAIL) {
    printStats(allEntries);
    console.log('\n💡 詳細データ（レース名・オッズ等）も取得するには: --detail オプション');
    return;
  }

  // ── Phase B: 詳細ページから追加データ ──
  console.log('📊 Phase B: 詳細ページからレース情報取得...\n');

  let fullResults = [];
  if (fs.existsSync(FULL_FILE)) {
    fullResults = JSON.parse(fs.readFileSync(FULL_FILE, 'utf-8'));
    console.log(`  既存フルデータ: ${fullResults.length}件\n`);
  }
  const existingFull = new Set(fullResults.map(r => r.dor));

  const pending = allEntries.filter(e => !existingFull.has(e.dor));
  console.log(`  取得対象: ${pending.length}件\n`);

  for (let i = 0; i < pending.length; i++) {
    const entry = pending[i];
    const url = `https://www.winkeiba.jp/win5/results_more?DOR=${entry.dor}`;

    try {
      const html = await fetchPage(url);
      const legs = parseDetailPage(html, entry.dor);

      // 一覧データと結合
      const full = {
        ...entry,
        legs: legs.map((leg, idx) => ({
          ...leg,
          winning_umaban: entry.winning_umabans[idx] || leg.winning_umaban || null,
        })),
      };

      fullResults.push(full);
      const umaStr = full.legs.map(l => l.winning_umaban).join('-');
      process.stdout.write(`  [${i + 1}/${pending.length}] ${entry.dor} ✅ ${umaStr}\n`);

    } catch (e) {
      console.error(`  [${i + 1}/${pending.length}] ${entry.dor} ❌ ${e.message}`);
    }

    // 中間保存
    if ((i + 1) % 20 === 0) {
      fullResults.sort((a, b) => a.dor.localeCompare(b.dor));
      fs.writeFileSync(FULL_FILE, JSON.stringify(fullResults, null, 2));
    }

    await sleep(DELAY_MS);
  }

  fullResults.sort((a, b) => a.dor.localeCompare(b.dor));
  fs.writeFileSync(FULL_FILE, JSON.stringify(fullResults, null, 2));
  console.log(`\n✅ フルデータ: ${fullResults.length}件 → ${FULL_FILE}`);

  printStats(allEntries);
}

function printStats(entries) {
  const withPayout = entries.filter(e => e.payout);
  if (withPayout.length === 0) return;

  const avg = withPayout.reduce((s, e) => s + e.payout, 0) / withPayout.length;
  const max = Math.max(...withPayout.map(e => e.payout));
  const min = Math.min(...withPayout.map(e => e.payout));
  const median = [...withPayout].sort((a, b) => a.payout - b.payout)[Math.floor(withPayout.length / 2)].payout;

  console.log('\n📊 配当統計:');
  console.log(`  件数:   ${withPayout.length}件`);
  console.log(`  平均:   ${Math.round(avg).toLocaleString()}円`);
  console.log(`  中央値: ${median.toLocaleString()}円`);
  console.log(`  最高:   ${max.toLocaleString()}円`);
  console.log(`  最低:   ${min.toLocaleString()}円`);

  // 年別件数
  const byYear = {};
  for (const e of entries) {
    const y = e.dor.slice(0, 4);
    byYear[y] = (byYear[y] || 0) + 1;
  }
  console.log('\n📅 年別開催数:');
  for (const [y, c] of Object.entries(byYear).sort()) {
    console.log(`  ${y}: ${c}回`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
