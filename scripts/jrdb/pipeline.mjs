/**
 * JRDB 統合パイプライン
 *
 * 使い方:
 *   node pipeline.mjs download              # 一括DL (7年分)
 *   node pipeline.mjs download --year 2024  # 指定年のみ
 *   node pipeline.mjs import                # 全データをSupabaseにインポート
 *   node pipeline.mjs import --type ukc     # UKCのみインポート
 *   node pipeline.mjs aggregate             # 種牡馬集計テーブル更新
 *   node pipeline.mjs all                   # DL → インポート → 集計 を全実行
 *   node pipeline.mjs weekly                # 今週分のDL → インポート (Cron用)
 *
 * 環境変数:
 *   JRDB_USER / JRDB_PASS          — JRDBログイン
 *   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY — Supabase
 *   JRDB_DIR                        — データ保存先 (default: ./jrdb-data)
 */

import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function run(cmd) {
  console.log(`\n▶ ${cmd}\n`);
  execSync(cmd, { stdio: 'inherit', cwd: __dirname });
}

const command = process.argv[2] || 'help';
const extraArgs = process.argv.slice(3).join(' ');

switch (command) {
  case 'download': {
    run(`node bulk-download.mjs ${extraArgs}`);
    break;
  }

  case 'import': {
    run(`node supabase-import.mjs --dir ${process.env.JRDB_DIR || './jrdb-data'}/extracted ${extraArgs}`);
    break;
  }

  case 'aggregate': {
    run(`node supabase-import.mjs --dir ${process.env.JRDB_DIR || './jrdb-data'}/extracted --aggregate --type none`);
    break;
  }

  case 'all': {
    console.log('🏇 === JRDB フルパイプライン ===');
    console.log('');
    console.log('Step 1/3: ダウンロード');
    run(`node bulk-download.mjs ${extraArgs}`);

    console.log('\nStep 2/3: Supabaseインポート');
    run(`node supabase-import.mjs --dir ${process.env.JRDB_DIR || './jrdb-data'}/extracted`);

    console.log('\nStep 3/3: 種牡馬集計');
    run(`node supabase-import.mjs --dir ${process.env.JRDB_DIR || './jrdb-data'}/extracted --aggregate --type none`);

    console.log('\n✅ フルパイプライン完了');
    break;
  }

  case 'weekly': {
    // 今週分のみ処理（Cron用）
    const today = new Date();
    const lastSaturday = new Date(today);
    lastSaturday.setDate(today.getDate() - ((today.getDay() + 1) % 7));
    const from = lastSaturday.toISOString().slice(0, 10);
    const to = today.toISOString().slice(0, 10);

    console.log(`🏇 今週分パイプライン: ${from} → ${to}`);
    run(`node bulk-download.mjs --from ${from} --to ${to}`);
    run(`node supabase-import.mjs --dir ${process.env.JRDB_DIR || './jrdb-data'}/extracted`);
    console.log('\n✅ 週次パイプライン完了');
    break;
  }

  case 'help':
  default:
    console.log(`
🏇 JRDB 統合パイプライン

使い方:
  node pipeline.mjs <command> [options]

コマンド:
  download              一括ダウンロード (デフォルト: 2019年〜現在)
    --from YYYY-MM-DD    開始日
    --to YYYY-MM-DD      終了日
    --year YYYY          指定年のみ
    --type datapack|result  データ種別

  import                Supabaseへインポート
    --type kyg|sec|ukc   指定種別のみ

  aggregate             種牡馬×コース×距離の集計テーブル更新

  all                   download → import → aggregate を全実行

  weekly                今週分のみ処理 (Cron用)

環境変数:
  JRDB_USER             JRDBログインID
  JRDB_PASS             JRDBパスワード
  JRDB_DIR              保存先 (default: ./jrdb-data)
  SUPABASE_URL          Supabase URL
  SUPABASE_SERVICE_ROLE_KEY  Supabase Service Role Key
`);
}
