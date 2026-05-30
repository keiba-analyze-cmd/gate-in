// scripts/jrdb/calibrate-rating.mjs
//
// レーティングの基準値 b と表示 scale を、確定済み履歴から決める校正スクリプト。
//   b     : 「常に1番人気を◎」した無策戦略が横ばい（累積スコア≈0）になる高さ
//   scale : 既知の好成績モデル（例: ガンテツ）が目標レート(既定1900)に来る係数
//
// 使い方:
//   node scripts/jrdb/calibrate-rating.mjs
// 前提:
//   - SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY を環境変数に
//   - createClient は @supabase/supabase-js から（このスクリプトはNode直実行のため）
//   - データ取得部 (fetchSettledRaces / fetchModelPicks) は自分のスキーマに合わせて実装
//
// メモ: zsh の inline `node -e` は `!` で落ちるため、必ず .mjs ファイルで実行すること。

import { createClient } from "@supabase/supabase-js";

const TARGET_STRONG_RATING = 1900; // 好成績モデルが来てほしいレート
const R0 = 1500;

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// ── 1) 無策戦略のサンプルを取得 ───────────────────────────────
// 各確定レースについて「1番人気馬」を◎としたときの (的中 ? ln(確定単勝オッズ) : 0) を集める。
// JRDB SEC: 着順 pos141 / 単勝オッズ pos175 / 人気 pos181。
// TODO: 自分のテーブル（jrdb_race_entries 等）に合わせて実装。
async function fetchFavoriteSamples() {
  // 期待する戻り値: number[]  各要素 = (favoriteが1着 ? Math.log(odds) : 0)
  // 例（擬似）:
  //   select per race: 人気=1 の馬の { 着順, 単勝オッズ }
  //   sample = 着順===1 ? Math.log(単勝オッズ) : 0
  throw new Error(
    "fetchFavoriteSamples を実装してください（jrdb_race_entries / SEC確定値から1番人気の着順・オッズを取得）",
  );
}

// ── 2) 既知の好成績モデルの ◎ 結果を取得 ─────────────────────
// 例: ガンテツの過去◎について (的中 ? ln(確定単勝オッズ) : 0) を集める。
// TODO: ai_predictions（◎馬）× 確定結果 から実装。
async function fetchModelSamples(modelName = "ガンテツ") {
  // 期待する戻り値: number[]
  throw new Error(
    `fetchModelSamples('${modelName}') を実装してください（ai_predictions の◎ × 確定オッズ/着順）`,
  );
}

function mean(arr) {
  return arr.reduce((a, c) => a + c, 0) / arr.length;
}

async function main() {
  const favSamples = await fetchFavoriteSamples();
  // b: 無策◎の期待スコア。これを引けば「市場に勝った分」だけが残る。
  const b = mean(favSamples);

  // 念のため過剰適合チェック用にSDも出す（1予想あたりの標準変動の目安）
  const sd = Math.sqrt(mean(favSamples.map((x) => (x - b) ** 2)));

  // scale: 好成績モデルの平均スコア(=b控除後)が、目標レートに来るように決める
  const modelSamples = await fetchModelSamples("ガンテツ");
  const modelMeanScore = mean(modelSamples) - b; // bを引く
  const scale = (TARGET_STRONG_RATING - R0) / modelMeanScore;

  console.log("── レーティング校正結果 ──");
  console.log(`無策(1番人気◎) サンプル数 : ${favSamples.length}`);
  console.log(`b   (基準スコア)          : ${b.toFixed(4)}`);
  console.log(`score SD                  : ${sd.toFixed(4)}`);
  console.log(`好成績モデル 平均スコア(b控除後): ${modelMeanScore.toFixed(4)}`);
  console.log(`scale                     : ${Math.round(scale)}`);
  console.log("");
  console.log("→ src/lib/rating/rating.ts の DEFAULT_RATING_CONFIG.b / .scale を更新してください。");
  console.log("→ 確認: ランダム◎戦略も横ばい(累積≈0)になるか別途チェック。");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
