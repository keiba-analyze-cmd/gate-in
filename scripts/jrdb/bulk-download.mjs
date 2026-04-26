/**
 * JRDB 一括ダウンローダー
 *
 * 使い方:
 *   node bulk-download.mjs --from 2019-01-01 --to 2026-04-27
 *   node bulk-download.mjs --type datapack    # データパック(KYG,UKC等)のみ
 *   node bulk-download.mjs --type result      # 成績(SEC)のみ
 *   node bulk-download.mjs --year 2024        # 指定年のみ
 *
 * 環境変数:
 *   JRDB_USER   — JRDBログインID
 *   JRDB_PASS   — JRDBパスワード
 *   JRDB_DIR    — 保存先ディレクトリ (default: ./jrdb-data)
 *
 * 前提:
 *   npm install node-fetch cheerio
 *   lha コマンドがインストール済み (brew install lha / apt install lha)
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const JRDB_USER = process.env.JRDB_USER;
const JRDB_PASS = process.env.JRDB_PASS;
const BASE_DIR = process.env.JRDB_DIR || './jrdb-data';

// JRA開催日 = 基本は土日 + 祝日開催
// データパック: JRDB{YYMMDD}.lzh
// 成績:       SEC{YYMMDD}.lzh

const COURSE_MAP = {
  '01': '札幌', '02': '函館', '03': '福島', '04': '新潟',
  '05': '東京', '06': '中山', '07': '中京', '08': '京都',
  '09': '阪神', '10': '小倉',
};

// ─── 日付ユーティリティ ─────────────────────────────────
function generateRaceDates(fromDate, toDate) {
  const dates = [];
  const d = new Date(fromDate);
  const end = new Date(toDate);

  while (d <= end) {
    const day = d.getDay();
    // 土(6)と日(0) + 一部祝日（祝日は網羅しきれないので土日ベース）
    if (day === 0 || day === 6) {
      const yy = String(d.getFullYear()).slice(-2);
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      dates.push({ full: `${d.getFullYear()}-${mm}-${dd}`, short: `${yy}${mm}${dd}` });
    }
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

// ─── ダウンロード ───────────────────────────────────────
async function downloadFile(url, dest, authHeader) {
  const fetch = (await import('node-fetch')).default;

  if (fs.existsSync(dest)) {
    console.log(`  ⏭️  既存: ${path.basename(dest)}`);
    return true;
  }

  try {
    const res = await fetch(url, {
      headers: { Authorization: authHeader },
      redirect: 'follow',
    });

    if (!res.ok) {
      if (res.status === 404) {
        // 開催なしの日はファイルが存在しない → スキップ
        return false;
      }
      console.warn(`  ⚠️  HTTP ${res.status}: ${url}`);
      return false;
    }

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      // ログインページにリダイレクトされた場合
      console.warn('  ⚠️  ログインセッション切れ');
      return false;
    }

    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 100) {
      return false; // 空ファイル
    }

    fs.writeFileSync(dest, buf);
    console.log(`  ✅ DL: ${path.basename(dest)} (${(buf.length / 1024).toFixed(0)}KB)`);
    return true;
  } catch (err) {
    console.error(`  ❌ Error: ${err.message}`);
    return false;
  }
}

// ─── JRDBログイン ───────────────────────────────────────
async function login() {
  if (!JRDB_USER || !JRDB_PASS) {
    throw new Error('JRDB_USER と JRDB_PASS を環境変数で指定してください');
  }

  const authHeader = 'Basic ' + Buffer.from(`${JRDB_USER}:${JRDB_PASS}`).toString('base64');

  // 接続テスト
  const fetch = (await import('node-fetch')).default;
  const res = await fetch('http://www.jrdb.com/member/n_index.html', {
    headers: { Authorization: authHeader },
  });

  if (!res.ok) {
    throw new Error(`JRDBログイン失敗: HTTP ${res.status}`);
  }

  console.log('🔑 JRDBログイン確認OK');
  return authHeader;
}

// ─── LZH解凍 ───────────────────────────────────────────
function extractLZH(lzhPath, outputDir) {
  try {
    // lha コマンドで解凍
    const absPath = path.resolve(lzhPath);
    execSync(`cd "${outputDir}" && lha e "${absPath}"`, { stdio: "pipe" });
    return true;
  } catch {
    try {
      // 代替: 7z で解凍
      execSync(`7z x -y -o"${outputDir}" "${lzhPath}" 2>/dev/null`, { stdio: 'pipe' });
      return true;
    } catch {
      console.warn(`  ⚠️  解凍失敗: ${path.basename(lzhPath)} (lha/7zが必要)`);
      return false;
    }
  }
}

// ─── メイン処理 ─────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const getArg = (flag) => {
    const idx = args.indexOf(flag);
    return idx >= 0 ? args[idx + 1] : null;
  };

  const fromDate = getArg('--from') || '2019-01-01';
  const toDate = getArg('--to') || new Date().toISOString().slice(0, 10);
  const typeFilter = getArg('--type') || 'all'; // datapack, result, all
  const yearFilter = getArg('--year');

  console.log('🏇 JRDB一括ダウンローダー');
  console.log(`   期間: ${fromDate} → ${toDate}`);
  console.log(`   種別: ${typeFilter}`);
  console.log(`   保存先: ${BASE_DIR}`);
  console.log('');

  // ディレクトリ準備
  const lzhDir = path.join(BASE_DIR, 'lzh');
  const extractedDir = path.join(BASE_DIR, 'extracted');
  fs.mkdirSync(lzhDir, { recursive: true });
  fs.mkdirSync(extractedDir, { recursive: true });

  // ログイン
  const auth = await login();

  // 開催日リスト生成
  let dates = generateRaceDates(fromDate, toDate);
  if (yearFilter) {
    dates = dates.filter(d => d.full.startsWith(yearFilter));
  }

  console.log(`📅 対象日数: ${dates.length}日\n`);

  let dlCount = 0;
  let skipCount = 0;
  let failCount = 0;

  for (const date of dates) {
    const { short, full } = date;
    console.log(`📆 ${full}`);

    const tasks = [];

    if (typeFilter === 'all' || typeFilter === 'datapack') {
      tasks.push({
        filename: `JRDB${short}.lzh`,
        url: `http://www.jrdb.com/member/data/Jrdb/JRDB${short}.lzh`,
      });
    }

    if (typeFilter === 'all' || typeFilter === 'result') {
      tasks.push({
        filename: `SEC${short}.lzh`,
        url: `http://www.jrdb.com/member/data/Sec/SEC${short}.lzh`,
      });
    }

    for (const task of tasks) {
      const lzhPath = path.join(lzhDir, task.filename);
      const success = await downloadFile(task.url, lzhPath, auth);

      if (success) {
        dlCount++;
        // 解凍
        const dateDir = path.join(extractedDir, short);
        fs.mkdirSync(dateDir, { recursive: true });
        extractLZH(lzhPath, dateDir);
      } else {
        // 開催なしの日はスキップ（月曜祝日開催が土日リストに含まれない等）
        skipCount++;
      }

      // レート制限: 0.5秒間隔
      await new Promise(r => setTimeout(r, 500));
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ DL完了: ${dlCount}件`);
  console.log(`⏭️  スキップ: ${skipCount}件`);
  console.log(`❌ 失敗: ${failCount}件`);
  console.log(`📂 保存先: ${BASE_DIR}`);

  // ファイル一覧出力
  const extractedFiles = [];
  function listFiles(dir) {
    if (!fs.existsSync(dir)) return;
    for (const f of fs.readdirSync(dir)) {
      const fp = path.join(dir, f);
      if (fs.statSync(fp).isDirectory()) listFiles(fp);
      else extractedFiles.push(fp);
    }
  }
  listFiles(extractedDir);

  const kygCount = extractedFiles.filter(f => f.toUpperCase().includes('KYG')).length;
  const secCount = extractedFiles.filter(f => f.toUpperCase().includes('SEC')).length;
  const ukcCount = extractedFiles.filter(f => f.toUpperCase().includes('UKC')).length;
  console.log(`\n📊 解凍済みファイル: KYG=${kygCount} SEC=${secCount} UKC=${ukcCount}`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
