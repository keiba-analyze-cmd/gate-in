/**
 * ゲートイン！ MicroCMS 一括投入スクリプト v2
 *
 * 配置場所: gate-in/scripts/microcms-import.mjs
 *
 * 使い方:
 *   1. Node.js 18+ 環境で実行（fetchが組み込み済み）
 *   2. gate-in/scripts/ ディレクトリに移動して実行:
 *
 *      cd scripts
 *      MICROCMS_API_KEY=xxxxx node microcms-import.mjs categories  ← カテゴリ＋タグを登録（最初に実行）
 *      MICROCMS_API_KEY=xxxxx node microcms-import.mjs quiz        ← クイズ100問を投入
 *      MICROCMS_API_KEY=xxxxx node microcms-import.mjs article     ← サンプル記事を投入
 *      MICROCMS_API_KEY=xxxxx node microcms-import.mjs all         ← 全部一括実行
 *
 *   ※ categories → quiz / article の順で実行してください（参照先が必要なため）
 *
 * データファイル:
 *   scripts/data/quiz-questions-all-100.json
 *   scripts/data/sample-article-deep-impact.json
 */

import { readFileSync } from "fs";

// ============================================================
// 設定
// ============================================================
const config = {
  serviceId: process.env.MICROCMS_SERVICE_ID || "gatein",
  apiKey: process.env.MICROCMS_API_KEY || "YOUR_API_KEY_HERE",
  requestDelay: 1200, // APIレート制限対策（ミリ秒）
};

const BASE_URL = `https://${config.serviceId}.microcms.io/api/v1`;

// ============================================================
// カテゴリ定義データ
// ============================================================

// article-categories: name, slug, icon, description, gradient, order
const articleCategoriesData = [
  {
    id: "blood",
    name: "血統",
    slug: "blood",
    icon: "🧬",
    description: "種牡馬の特徴、血統理論、産駒分析",
    gradient: "from-purple-500 to-pink-500",
    order: 1,
  },
  {
    id: "course",
    name: "コース攻略",
    slug: "course",
    icon: "🏟️",
    description: "コース別の傾向と対策",
    gradient: "from-blue-500 to-cyan-500",
    order: 2,
  },
  {
    id: "jockey",
    name: "騎手分析",
    slug: "jockey",
    icon: "👨‍✈️",
    description: "騎手の得意・不得意、騎乗スタイル",
    gradient: "from-green-500 to-emerald-500",
    order: 3,
  },
  {
    id: "trainer",
    name: "調教師",
    slug: "trainer",
    icon: "👔",
    description: "厩舎の特徴と狙い目",
    gradient: "from-orange-500 to-red-500",
    order: 4,
  },
  {
    id: "prediction",
    name: "予想術",
    slug: "prediction",
    icon: "📊",
    description: "データ分析・展開予想の手法",
    gradient: "from-indigo-500 to-purple-500",
    order: 5,
  },
  {
    id: "legend",
    name: "名馬列伝",
    slug: "legend",
    icon: "🏆",
    description: "伝説の名馬たちの物語",
    gradient: "from-yellow-500 to-orange-500",
    order: 6,
  },
];

// quiz-categories: name, slug, icon, description, color, order
const quizCategoriesData = [
  {
    id: "blood",
    name: "血統マスター",
    slug: "blood",
    icon: "🧬",
    description: "種牡馬・血統理論のクイズ",
    color: "from-purple-500 to-pink-500",
    order: 1,
  },
  {
    id: "g1",
    name: "G1メモリアル",
    slug: "g1",
    icon: "🏇",
    description: "歴代G1レースの記録",
    color: "from-blue-500 to-cyan-500",
    order: 2,
  },
  {
    id: "jockey",
    name: "騎手検定",
    slug: "jockey",
    icon: "👨‍✈️",
    description: "騎手の記録・特徴のクイズ",
    color: "from-green-500 to-emerald-500",
    order: 3,
  },
  {
    id: "course",
    name: "コース攻略",
    slug: "course",
    icon: "🏟️",
    description: "コース傾向のクイズ",
    color: "from-orange-500 to-red-500",
    order: 4,
  },
];

// tags
const tagsData = [
  { id: "deep-impact", name: "ディープインパクト" },
  { id: "kitasan-black", name: "キタサンブラック" },
  { id: "lord-kanaloa", name: "ロードカナロア" },
  { id: "blood", name: "血統" },
  { id: "sire", name: "種牡馬" },
  { id: "turf", name: "芝" },
  { id: "dirt", name: "ダート" },
  { id: "middle-distance", name: "中距離" },
  { id: "sprint", name: "短距離" },
  { id: "long-distance", name: "長距離" },
  { id: "tokyo", name: "東京競馬場" },
  { id: "nakayama", name: "中山競馬場" },
  { id: "hanshin", name: "阪神競馬場" },
  { id: "kyoto", name: "京都競馬場" },
  { id: "lemaire", name: "ルメール" },
  { id: "take-yutaka", name: "武豊" },
  { id: "g1", name: "G1" },
  { id: "triple-crown", name: "三冠馬" },
  { id: "pedigree-analysis", name: "産駒分析" },
  { id: "heavy-track", name: "重馬場" },
  { id: "course-strategy", name: "コース攻略" },
  { id: "pace", name: "展開予想" },
  { id: "odds", name: "オッズ" },
  { id: "recovery-rate", name: "回収率" },
];

// ============================================================
// ユーティリティ
// ============================================================
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function microCmsPost(endpoint, body) {
  const url = `${BASE_URL}/${endpoint}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-MICROCMS-API-KEY": config.apiKey,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`POST ${endpoint} (${res.status}): ${err}`);
  }
  return await res.json();
}

async function microCmsPut(endpoint, contentId, body) {
  const url = `${BASE_URL}/${endpoint}/${contentId}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-MICROCMS-API-KEY": config.apiKey,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`PUT ${endpoint}/${contentId} (${res.status}): ${err}`);
  }
  return await res.json();
}

// ============================================================
// カテゴリ＋タグ投入
// ============================================================
async function importCategories() {
  // --- article-categories ---
  console.log("\n📂 article-categories 投入...");
  let success = 0;
  let failed = 0;

  for (const cat of articleCategoriesData) {
    const { id, ...fields } = cat;
    try {
      await microCmsPut("article-categories", id, fields);
      console.log(`  ✅ ${fields.icon} ${fields.name} → ID: ${id}`);
      success++;
    } catch (err) {
      console.log(`  ❌ ${fields.name}: ${err.message}`);
      failed++;
    }
    await sleep(config.requestDelay);
  }
  console.log(`  → ${success}件成功 / ${failed}件失敗`);

  // --- quiz-categories ---
  console.log("\n📂 quiz-categories 投入...");
  success = 0;
  failed = 0;

  for (const cat of quizCategoriesData) {
    const { id, ...fields } = cat;
    try {
      await microCmsPut("quiz-categories", id, fields);
      console.log(`  ✅ ${fields.icon} ${fields.name} → ID: ${id}`);
      success++;
    } catch (err) {
      console.log(`  ❌ ${fields.name}: ${err.message}`);
      failed++;
    }
    await sleep(config.requestDelay);
  }
  console.log(`  → ${success}件成功 / ${failed}件失敗`);

  // --- tags ---
  console.log("\n🏷️  tags 投入...");
  success = 0;
  failed = 0;

  for (const tag of tagsData) {
    try {
      await microCmsPut("tags", tag.id, { name: tag.name });
      console.log(`  ✅ ${tag.name} → ID: ${tag.id}`);
      success++;
    } catch (err) {
      console.log(`  ❌ ${tag.name}: ${err.message}`);
      failed++;
    }
    await sleep(config.requestDelay);
  }
  console.log(`  → ${success}件成功 / ${failed}件失敗`);
}

// ============================================================
// クイズ投入
// ============================================================
async function importQuiz() {
  console.log("\n🎯 クイズ投入開始...");

  let data;
  try {
    const raw = readFileSync("data/quiz-questions-all-100.json", "utf-8");
    data = JSON.parse(raw);
  } catch (err) {
    console.error("  ❌ quiz-questions-all-100.json が見つかりません。同じディレクトリに配置してください。");
    return;
  }

  const questions = data.questions;
  console.log(`  読み込み: ${questions.length}問`);

  // quiz-categories のIDマッピング
  const catMap = {};
  for (const cat of quizCategoriesData) {
    catMap[cat.slug] = cat.id;
  }

  let success = 0;
  let failed = 0;

  for (const q of questions) {
    const categoryId = catMap[q.category];
    if (!categoryId) {
      console.log(`  ⚠️ スキップ: 不明カテゴリ "${q.category}" (${q.id})`);
      failed++;
      continue;
    }

    const body = {
      question: q.question,
      category: categoryId,
      level: [q.level],
      choice1: q.choice1,
      choice2: q.choice2,
      choice3: q.choice3 || "",
      choice4: q.choice4 || "",
      correctIndex: q.correctIndex,
      explanation: q.explanation || "",
      order: q.order || 0,
    };

    try {
      const result = await microCmsPost("quiz-questions", body);
      console.log(`  ✅ [${q.id}] ${q.question.substring(0, 35)}... → ${result.id}`);
      success++;
    } catch (err) {
      console.log(`  ❌ [${q.id}] ${err.message}`);
      failed++;
    }

    await sleep(config.requestDelay);
  }

  console.log(`\n  完了: ${success}件成功 / ${failed}件失敗`);
}

// ============================================================
// 記事投入
// ============================================================
async function importArticle() {
  console.log("\n📖 記事投入開始...");

  let data;
  try {
    const raw = readFileSync("data/sample-article-deep-impact.json", "utf-8");
    data = JSON.parse(raw);
  } catch (err) {
    console.error("  ❌ sample-article-deep-impact.json が見つかりません。");
    return;
  }

  const categoryId = articleCategoriesData.find((c) =>
    (data.category || "").startsWith(c.slug)
  )?.id || "blood";

  const tagIds = (data.tags || [])
    .map((tagName) => tagsData.find((t) => t.name === tagName)?.id)
    .filter(Boolean);

  const body = {
    title: data.title,
    slug: data.slug,
    category: categoryId,
    emoji: data.emoji || "",
    excerpt: data.excerpt || "",
    content: data.content,
    readTime: data.readTime || 0,
    hasQuiz: data.hasQuiz || false,
    isPremium: data.isPremium || false,
    tags: tagIds,
  };

  if (data.publishedAt) {
    body.publishedAt = data.publishedAt;
  }

  try {
    const result = await microCmsPost("articles", body);
    console.log(`  ✅ "${data.title}" → ${result.id}`);
  } catch (err) {
    console.log(`  ❌ "${data.title}": ${err.message}`);
  }
}

// ============================================================
// メイン
// ============================================================
async function main() {
  const mode = process.argv[2] || "all";

  console.log("=".repeat(55));
  console.log("  🏇 ゲートイン！ MicroCMS 一括投入 v2");
  console.log(`  サービスID: ${config.serviceId}`);
  console.log(`  モード:     ${mode}`);
  console.log("=".repeat(55));

  if (config.apiKey === "YOUR_API_KEY_HERE" || !config.apiKey) {
    console.error("\n❌ APIキーが設定されていません。");
    console.error("   例: MICROCMS_API_KEY=xxxxx node microcms-import.mjs all");
    process.exit(1);
  }

  const validModes = ["categories", "quiz", "article", "all"];

  if (!validModes.includes(mode)) {
    console.error(`\n❌ 不明なモード: ${mode}`);
    console.error(`   使い方: node microcms-import.mjs [${validModes.join("|")}]`);
    process.exit(1);
  }

  try {
    if (mode === "categories" || mode === "all") {
      await importCategories();
    }
    if (mode === "quiz" || mode === "all") {
      await importQuiz();
    }
    if (mode === "article" || mode === "all") {
      await importArticle();
    }
  } catch (err) {
    console.error(`\n💥 予期しないエラー: ${err.message}`);
  }

  console.log("\n🏁 完了");
}

main();
