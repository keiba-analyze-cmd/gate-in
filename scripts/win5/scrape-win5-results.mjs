#!/usr/bin/env node
/**
 * WIN5過去結果スクレイピング
 * ソース: winkeiba.jp
 * 
 * 使い方:
 *   node scrape-win5-results.mjs                    # 2019-2026 全取得
 *   node scrape-win5-results.mjs --from 2024 --to 2026  # 年指定
 *   node scrape-win5-results.mjs --dry-run           # URLリストのみ表示
 * 
 * 出力: ./win5-data/win5-results.json
 */

import https from 'https';
import { parseArgs } from 'util';
import fs from 'fs';
import path from 'path';

// ── 競馬場コード → 名称マッピング ──
const COURSE_MAP = {
  '01': '札幌', '02': '函館', '03': '福島', '04': '新潟',
  '05': '東京', '06': '中山', '07': '中京', '08': '京都',
  '09': '阪神', '10': '小倉',
};

// ── JRDB用 競馬場コード → 場コード(2桁) ──
// JRDBのrace_keyは YYMMDD + 場コード(2桁) + R番号(2桁) の8桁
const COURSE_TO_JRDB = {
  '01': '01', '02': '02', '03': '03', '04': '04',
  '05': '05', '06': '06', '07': '07', '08': '08',
  '09': '09', '10': '10',
};

// ── CLI引数 ──
const { values: args } = parseArgs({
  options: {
    from:    { type: 'string', default: '2019' },
    to:      { type: 'string', default: '2026' },
    'dry-run': { type: 'boolean', default: false },
    delay:   { type: 'string', default: '1500' },
  },
});

const FROM_YEAR = parseInt(args.from);
const TO_YEAR = parseInt(args.to);
const DRY_RUN = args['dry-run'];
const DELAY_MS = parseInt(args.delay);

const OUT_DIR = path.join(process.cwd(), 'win5-data');
const OUT_FILE = path.join(OUT_DIR, 'win5-results.json');

// ── HTTP GETユーティリティ ──
function fetchPage(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchPage(res.headers.location).then(resolve, reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ── Step 1: 一覧ページからWIN5開催日を取得 ──
async function fetchWin5Dates(year) {
  const dates = [];
  // 1月〜12月を走査
  for (let month = 1; month <= 12; month++) {
    const ym = `${year}${String(month).padStart(2, '0')}`;
    const url = `https://www.winkeiba.jp/win5?YearMonth=${ym}`;
    
    try {
      const html = await fetchPage(url);
      // DOR=YYYYMMDD のリンクを抽出
      const re = /results_more\?DOR=(\d{8})/g;
      let m;
      while ((m = re.exec(html)) !== null) {
        if (!dates.includes(m[1])) dates.push(m[1]);
      }
      process.stdout.write(`  ${ym}: ${dates.length}件累計\r`);
    } catch (e) {
      console.warn(`  ${ym}: スキップ (${e.message})`);
    }
    await sleep(500);
  }
  console.log(`  ${year}年: ${dates.length}件`);
  return dates.sort();
}

// ── Step 2: 詳細ページから結果をパース ──
function parseResultPage(html, dor) {
  const result = {
    race_date: `${dor.slice(0, 4)}-${dor.slice(4, 6)}-${dor.slice(6, 8)}`,
    dor,
    payout: null,
    hit_count: null,
    total_tickets: null,
    carryover: null,
    legs: [],
  };

  // ── 払戻金 ──
  const payoutMatch = html.match(/払戻金[\s\S]*?([\d,]+)円/);
  if (payoutMatch) {
    result.payout = parseInt(payoutMatch[1].replace(/,/g, ''));
  }

  // ── 的中票数 / 発売票数 ──
  const ticketMatch = html.match(/的中票数[\s\S]*?([\d,]+)票[\s\S]*?\/[\s\S]*?([\d,]+)票/);
  if (ticketMatch) {
    result.hit_count = parseInt(ticketMatch[1].replace(/,/g, ''));
    result.total_tickets = parseInt(ticketMatch[2].replace(/,/g, ''));
  }

  // ── キャリーオーバー ──
  const coMatch = html.match(/キャリーオーバー[\s\S]*?([\d,]+)円/);
  if (coMatch) {
    result.carryover = parseInt(coMatch[1].replace(/,/g, ''));
  }

  // ── 各レッグ（5レース） ──
  // パターン: /race/results?DOR=YYYYMMDD&RacetrackCd=XX&RaceNum=YY のリンク
  const raceRe = /race\/results\?DOR=\d{8}&RacetrackCd=(\d{2})&RaceNum=(\d{1,2})[^>]*>([^<]+)<[\s\S]*?<\/a>/g;
  let raceMatch;
  let legNum = 0;

  while ((raceMatch = raceRe.exec(html)) !== null) {
    legNum++;
    const courseCode = raceMatch[1];
    const raceNumber = parseInt(raceMatch[2]);
    const rawRaceName = raceMatch[3].replace(/[\s\n\r]+/g, '').trim();
    // "京都10R　八坂ステークス" → コース名とレース名を分離
    const courseName = COURSE_MAP[courseCode] || courseCode;
    // レース名からコース+R番号部分を除去
    const raceName = rawRaceName.replace(/^.*?\d+R[　\s]*/, '').trim() || rawRaceName;

    // 馬番・オッズ・人気を取得（レースリンクの直後にある）
    const afterRace = html.slice(raceMatch.index + raceMatch[0].length, raceMatch.index + raceMatch[0].length + 2000);
    
    let umaban = null;
    let odds = null;
    let popularity = null;

    // 馬番: <em>数字</em> または bold/strong で囲まれた数字
    // winkeiba では *N* (markdown) → 実際のHTMLでは <td class="num">N</td> 的な構造
    // 実際のパターンを探す
    const umabanMatch = afterRace.match(/class="[^"]*num[^"]*"[^>]*>(\d{1,2})</);
    if (umabanMatch) {
      umaban = parseInt(umabanMatch[1]);
    } else {
      // フォールバック: 最初に出現する単独の1-2桁数字
      const simpleMatch = afterRace.match(/<[^>]*>(\d{1,2})<\/[^>]*>/);
      if (simpleMatch) umaban = parseInt(simpleMatch[1]);
    }

    // オッズ
    const oddsMatch = afterRace.match(/([\d.]+)\s*<\/td>[\s\S]*?(\d+)人気/);
    if (oddsMatch) {
      odds = parseFloat(oddsMatch[1]);
      popularity = parseInt(oddsMatch[2]);
    } else {
      // 別パターン
      const oddsMatch2 = afterRace.match(/([\d.]+)[\s\S]*?(\d+)人気/);
      if (oddsMatch2) {
        odds = parseFloat(oddsMatch2[1]);
        popularity = parseInt(oddsMatch2[2]);
      }
    }

    // JRDB race_key 生成: YYMMDD + 場コード(2桁) + R番号(2桁)
    const yy = dor.slice(2, 4);
    const mm = dor.slice(4, 6);
    const dd = dor.slice(6, 8);
    const jrdbCourse = COURSE_TO_JRDB[courseCode] || courseCode;
    const jrdb_race_key = `${yy}${mm}${dd}${jrdbCourse}${String(raceNumber).padStart(2, '0')}`;

    result.legs.push({
      leg_number: legNum,
      course_code: courseCode,
      course_name: courseName,
      race_number: raceNumber,
      race_name: raceName,
      winning_umaban: umaban,
      winning_odds: odds,
      winning_popularity: popularity,
      jrdb_race_key,
    });
  }

  return result;
}

// ── Step 2b: より確実なパーサー（生HTMLから直接抽出） ──
function parseResultPageRobust(html, dor) {
  const result = {
    race_date: `${dor.slice(0, 4)}-${dor.slice(4, 6)}-${dor.slice(6, 8)}`,
    dor,
    payout: null,
    hit_count: null,
    total_tickets: null,
    carryover: null,
    legs: [],
  };

  // 払戻金
  const payoutMatch = html.match(/払戻金[\s\S]*?([\d,]+)円/);
  if (payoutMatch) result.payout = parseInt(payoutMatch[1].replace(/,/g, ''));

  // 的中票数 / 発売票数
  const ticketMatch = html.match(/([\d,]+)票\s*\/\s*([\d,]+)票/);
  if (ticketMatch) {
    result.hit_count = parseInt(ticketMatch[1].replace(/,/g, ''));
    result.total_tickets = parseInt(ticketMatch[2].replace(/,/g, ''));
  }

  // キャリーオーバー
  const coMatch = html.match(/キャリーオーバー[\s\S]{0,100}?([\d,]+)円/);
  if (coMatch) result.carryover = parseInt(coMatch[1].replace(/,/g, ''));

  // 的中馬番リスト（一覧ページにある "8-1-12-7-3" 形式がdetailにもあるか確認用）
  const umabanListMatch = html.match(/的中馬番[\s\S]*?(\d{1,2}[-ー]\d{1,2}[-ー]\d{1,2}[-ー]\d{1,2}[-ー]\d{1,2})/);
  let fallbackUmabans = [];
  if (umabanListMatch) {
    fallbackUmabans = umabanListMatch[1].split(/[-ー]/).map(Number);
  }

  // 各レース: RacetrackCd と RaceNum から取得
  const racePattern = /RacetrackCd=(\d{2})&(?:amp;)?RaceNum=(\d{1,2})/g;
  const races = [];
  let rm;
  while ((rm = racePattern.exec(html)) !== null) {
    const key = `${rm[1]}-${rm[2]}`;
    if (!races.find(r => r.key === key)) {
      races.push({ 
        key, 
        courseCode: rm[1], 
        raceNumber: parseInt(rm[2]),
        index: rm.index 
      });
    }
  }

  // レース名取得 + データ抽出
  for (let i = 0; i < races.length && i < 5; i++) {
    const race = races[i];
    const courseName = COURSE_MAP[race.courseCode] || race.courseCode;

    // レースリンク周辺のテキストからレース名を取得
    const linkArea = html.slice(Math.max(0, race.index - 200), race.index + 500);
    const nameMatch = linkArea.match(/>\s*([^<]*\d+R[　\s]*[^<]+)\s*</);
    let raceName = '';
    if (nameMatch) {
      raceName = nameMatch[1].replace(/^.*?\d+R[　\s]*/, '').trim();
    }

    // 馬番・オッズ・人気
    // 各レースブロック内のデータ (次のレースまでの区間)
    const blockEnd = (i < races.length - 1) ? races[i + 1].index : race.index + 3000;
    const block = html.slice(race.index, blockEnd);

    let umaban = fallbackUmabans[i] || null;
    let odds = null;
    let popularity = null;

    // オッズと人気
    const oddsPopMatch = block.match(/([\d]+\.[\d]+)[\s\S]*?(\d+)人気/);
    if (oddsPopMatch) {
      odds = parseFloat(oddsPopMatch[1]);
      popularity = parseInt(oddsPopMatch[2]);
    }

    // JRDB race_key
    const yy = dor.slice(2, 4);
    const mm = dor.slice(4, 6);
    const dd = dor.slice(6, 8);
    const jrdb_race_key = `${yy}${mm}${dd}${race.courseCode}${String(race.raceNumber).padStart(2, '0')}`;

    result.legs.push({
      leg_number: i + 1,
      course_code: race.courseCode,
      course_name: courseName,
      race_number: race.raceNumber,
      race_name: raceName,
      winning_umaban: umaban,
      winning_odds: odds,
      winning_popularity: popularity,
      jrdb_race_key,
    });
  }

  return result;
}

// ── メイン ──
async function main() {
  console.log(`\n🏇 WIN5過去結果スクレイピング (${FROM_YEAR}-${TO_YEAR})\n`);

  // Step 1: 全日付取得
  console.log('📅 Step 1: WIN5開催日を取得中...');
  let allDates = [];
  for (let year = FROM_YEAR; year <= TO_YEAR; year++) {
    const dates = await fetchWin5Dates(year);
    allDates = allDates.concat(dates);
    await sleep(500);
  }

  console.log(`\n✅ 合計 ${allDates.length} 回のWIN5開催日を取得\n`);

  if (DRY_RUN) {
    console.log('--- dry-run: URLリスト ---');
    allDates.forEach(d => console.log(`  https://www.winkeiba.jp/win5/results_more?DOR=${d}`));
    console.log(`\n合計: ${allDates.length} 件`);
    return;
  }

  // Step 2: 各日の詳細を取得
  console.log('📊 Step 2: 各日の結果詳細を取得中...');
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  // 既存データ読み込み（途中再開用）
  let results = [];
  if (fs.existsSync(OUT_FILE)) {
    results = JSON.parse(fs.readFileSync(OUT_FILE, 'utf-8'));
    console.log(`  既存データ: ${results.length}件（スキップして差分のみ取得）`);
  }
  const existingDates = new Set(results.map(r => r.dor));

  let newCount = 0;
  let errorCount = 0;
  for (let i = 0; i < allDates.length; i++) {
    const dor = allDates[i];
    if (existingDates.has(dor)) continue;

    const url = `https://www.winkeiba.jp/win5/results_more?DOR=${dor}`;
    try {
      const html = await fetchPage(url);
      const parsed = parseResultPageRobust(html, dor);

      if (parsed.legs.length === 5) {
        results.push(parsed);
        newCount++;
        process.stdout.write(`  [${i + 1}/${allDates.length}] ${dor} ✅ ${parsed.legs.map(l => l.winning_umaban).join('-')} 配当:${(parsed.payout || 0).toLocaleString()}円\n`);
      } else {
        console.warn(`  [${i + 1}/${allDates.length}] ${dor} ⚠️  ${parsed.legs.length}レースしか取得できず`);
        // 5レース未満でも保存（後で手動確認用）
        results.push(parsed);
        newCount++;
      }
    } catch (e) {
      console.error(`  [${i + 1}/${allDates.length}] ${dor} ❌ ${e.message}`);
      errorCount++;
    }

    // 中間保存（10件ごと）
    if (newCount > 0 && newCount % 10 === 0) {
      fs.writeFileSync(OUT_FILE, JSON.stringify(results, null, 2));
    }

    await sleep(DELAY_MS);
  }

  // 最終保存
  results.sort((a, b) => a.dor.localeCompare(b.dor));
  fs.writeFileSync(OUT_FILE, JSON.stringify(results, null, 2));

  // サマリー
  console.log('\n' + '='.repeat(50));
  console.log(`✅ 完了: ${results.length}件（新規${newCount}件, エラー${errorCount}件）`);
  console.log(`📁 保存先: ${OUT_FILE}`);

  // 統計
  const withPayout = results.filter(r => r.payout);
  if (withPayout.length > 0) {
    const avgPayout = withPayout.reduce((s, r) => s + r.payout, 0) / withPayout.length;
    const maxPayout = Math.max(...withPayout.map(r => r.payout));
    const minPayout = Math.min(...withPayout.map(r => r.payout));
    console.log(`\n📊 配当統計:`);
    console.log(`  平均: ${Math.round(avgPayout).toLocaleString()}円`);
    console.log(`  最高: ${maxPayout.toLocaleString()}円`);
    console.log(`  最低: ${minPayout.toLocaleString()}円`);
  }

  // 5レース取得チェック
  const incomplete = results.filter(r => r.legs.length !== 5);
  if (incomplete.length > 0) {
    console.log(`\n⚠️  5レース未満の日: ${incomplete.length}件`);
    incomplete.forEach(r => console.log(`  ${r.dor}: ${r.legs.length}レース`));
  }

  const missingUmaban = results.filter(r => r.legs.some(l => !l.winning_umaban));
  if (missingUmaban.length > 0) {
    console.log(`\n⚠️  馬番取得失敗: ${missingUmaban.length}件（一覧ページから補完推奨）`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
