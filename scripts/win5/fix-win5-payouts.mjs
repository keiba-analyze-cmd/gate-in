#!/usr/bin/env node
/**
 * WIN5データ完全修復 — 詳細ページから配当・馬番・オッズ・人気を再取得
 * 
 * 使い方:
 *   node fix-win5-payouts.mjs --dry-run    # 5件確認
 *   node fix-win5-payouts.mjs              # 全件修復(約9分)
 */
import https from 'https';
import fs from 'fs';
import path from 'path';
import { parseArgs } from 'util';

const { values: args } = parseArgs({
  options: { 'dry-run': { type: 'boolean', default: false }, delay: { type: 'string', default: '1200' } },
});
const DELAY = parseInt(args.delay);
const DRY_RUN = args['dry-run'];
const DATA_DIR = path.join(process.cwd(), 'win5-data');
const FULL_FILE = path.join(DATA_DIR, 'win5-full.json');

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location)
        return fetchPage(res.headers.location).then(resolve, reject);
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(d));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

const COURSE_MAP = {
  '01':'札幌','02':'函館','03':'福島','04':'新潟',
  '05':'東京','06':'中山','07':'中京','08':'京都','09':'阪神','10':'小倉',
};

function parseDetail(html, dor) {
  const result = { payout: null, hit_count: null, total_tickets: null, winning_umabans: [], legs: [] };

  // 日付チェック（リダイレクト検出）
  const dateMatch = html.match(/(\d{1,2})\/(\d{1,2})\s*\([^)]+\)/);
  // 払戻金
  const payMatch = html.match(/払戻金[\s\S]*?([\d,]+)円/);
  if (payMatch) result.payout = parseInt(payMatch[1].replace(/,/g, ''));
  // 的中票数 / 発売票数
  const tickMatch = html.match(/([\d,]+)票\s*\/\s*([\d,]+)票/);
  if (tickMatch) {
    result.hit_count = parseInt(tickMatch[1].replace(/,/g, ''));
    result.total_tickets = parseInt(tickMatch[2].replace(/,/g, ''));
  }

  // 馬番: <i class="icon-umaban ...">NUMBER</i>
  const umaRe = /icon-umaban[^>]*>(\d{1,2})</g;
  let um;
  const allUmabans = [];
  while ((um = umaRe.exec(html)) !== null) allUmabans.push(parseInt(um[1]));
  // 上部の的中馬番セクションにある最初の5つが勝ち馬番
  // ただしレース詳細テーブルにもicon-umabanが出るので、最初の5つを取る
  if (allUmabans.length >= 5) result.winning_umabans = allUmabans.slice(0, 5);

  // レース詳細: RacetrackCd + RaceNum
  const raceRe = /RacetrackCd=(\d{2})&(?:amp;)?RaceNum=(\d{1,2})/g;
  const seen = new Set();
  const racePos = [];
  let rm;
  while ((rm = raceRe.exec(html)) !== null) {
    const key = `${rm[1]}-${rm[2]}`;
    if (!seen.has(key)) { seen.add(key); racePos.push({ cc: rm[1], rn: parseInt(rm[2]), idx: rm.index }); }
  }

  for (let i = 0; i < racePos.length && i < 5; i++) {
    const race = racePos[i];
    const nextIdx = (i < racePos.length - 1) ? racePos[i + 1].index : race.idx + 3000;
    const block = html.slice(race.idx, nextIdx);

    // レース名
    const nameArea = html.slice(Math.max(0, race.idx - 300), race.idx + 200);
    const nm = nameArea.match(/>([^<]*?\d+R[　\s]+[^<]+)</);
    let raceName = nm ? nm[1].replace(/^.*?\d+R[　\s]*/, '').trim() : '';

    // オッズ・人気
    let odds = null, pop = null;
    const op = block.match(/([\d]+\.[\d]+)[\s\S]*?(\d+)人気/);
    if (op) { odds = parseFloat(op[1]); pop = parseInt(op[2]); }

    result.legs.push({
      leg_number: i + 1,
      course_code: race.cc, course_name: COURSE_MAP[race.cc] || race.cc,
      race_number: race.rn, race_name: raceName,
      winning_umaban: result.winning_umabans[i] || null,
      winning_odds: odds, winning_popularity: pop,
    });
  }

  return result;
}

async function main() {
  console.log('\n🔧 WIN5 データ完全修復\n');
  const data = JSON.parse(fs.readFileSync(FULL_FILE, 'utf-8'));
  console.log(`  既存: ${data.length}件`);

  const limit = DRY_RUN ? 10 : data.length;
  let fixed = 0, errors = 0, skipped = 0;

  for (let i = 0; i < limit; i++) {
    const entry = data[i];
    const dor = entry.dor;

    try {
      const html = await fetchPage(`https://www.winkeiba.jp/win5/results_more?DOR=${dor}`);

      // リダイレクト検出: ページ内の日付がdorと一致するか
      const yy = dor.slice(0,4), mm = parseInt(dor.slice(4,6)), dd = parseInt(dor.slice(6,8));
      const expectedDateStr = `${mm}/${dd}`;
      if (!html.includes(expectedDateStr)) {
        console.log(`  [${i+1}/${limit}] ${dor} ⚠️ リダイレクト（ページに${expectedDateStr}なし）→ スキップ`);
        skipped++; await sleep(DELAY); continue;
      }

      const parsed = parseDetail(html, dor);

      const oldP = entry.payout;
      const oldU = JSON.stringify(entry.winning_umabans || []);
      const newU = JSON.stringify(parsed.winning_umabans);
      const changed = oldP !== parsed.payout || oldU !== newU;

      if (changed) {
        fixed++;
        if (DRY_RUN || fixed <= 15) {
          console.log(`  [${i+1}/${limit}] ${dor} ✏️  ¥${(oldP||0).toLocaleString()}→¥${(parsed.payout||0).toLocaleString()} [${entry.winning_umabans||[]}]→[${parsed.winning_umabans}] odds:${parsed.legs.map(l=>l.winning_odds).join(',')}`);
        }
      }

      // 更新
      entry.payout = parsed.payout;
      entry.hit_count = parsed.hit_count;
      entry.total_tickets = parsed.total_tickets;
      entry.winning_umabans = parsed.winning_umabans;
      // legs更新
      if (parsed.legs.length >= 1) {
        entry.legs = parsed.legs.map((pl, j) => ({
          ...(entry.legs?.[j] || {}),
          ...pl,
        }));
      }

    } catch (e) {
      console.log(`  [${i+1}/${limit}] ${dor} ❌ ${e.message}`);
      errors++;
    }

    if (!DRY_RUN && (i+1) % 50 === 0) {
      process.stdout.write(`  進捗: ${i+1}/${limit} (修正${fixed} エラー${errors} スキップ${skipped})\n`);
      fs.writeFileSync(FULL_FILE + '.tmp', JSON.stringify(data, null, 2));
    }
    await sleep(DELAY);
  }

  console.log(`\n✅ 完了: 修正${fixed} エラー${errors} スキップ${skipped}`);

  if (!DRY_RUN) {
    fs.copyFileSync(FULL_FILE, path.join(DATA_DIR, 'win5-full-backup.json'));
    fs.writeFileSync(FULL_FILE, JSON.stringify(data, null, 2));
    console.log(`💾 ${FULL_FILE} 更新済み（バックアップ保存済み）`);

    // 重複チェック
    const seen = new Map(); let dupes = 0;
    for (const d of data.filter(x => x.payout)) {
      if (seen.has(d.payout)) dupes++;
      seen.set(d.payout, d.dor);
    }
    console.log(`📊 重複配当: ${dupes}件 (修復前: 91件)`);
    console.log('\n次のステップ:');
    console.log('  node import-win5-results.mjs        # Supabase再インポート');
    console.log('  node win5-backtest-v2.mjs            # バックテスト再実行');
    console.log('  node win5-export-excel.mjs           # Excel再出力');
  }
}

main().catch(e => { console.error(e); process.exit(1); });
