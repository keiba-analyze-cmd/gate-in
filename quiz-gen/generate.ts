// quiz-gen/generate.ts
// 使い方: npx ts-node quiz-gen/generate.ts --articleId <ARTICLE_ID> --courseId <COURSE_ID> --stageId <STAGE_ID>
// 一括: npx ts-node quiz-gen/generate.ts --batch ./batch.json

import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "microcms-js-sdk";
import * as fs from "fs";

// ============================================================
// 設定
// ============================================================

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const microcms = createClient({
  serviceDomain: process.env.MICROCMS_SERVICE_DOMAIN!,
  apiKey: process.env.MICROCMS_API_KEY!,
});

const QUIZ_ENDPOINT = "quiz-questions";
const ARTICLE_ENDPOINT = "articles";

// courseId → microCMS quiz category ID マッピング
// 既存カテゴリ: blood, course, jockey, g1, trainer, prediction
const COURSE_TO_QUIZ_CATEGORY: Record<string, string> = {
  blood_basics: "blood",
  blood_sire: "blood",
  blood_broodmare: "blood",
  blood_advanced: "blood",
  course_tokyo: "course",
  course_nakayama: "course",
  course_kyoto: "course",
  course_hanshin: "course",
  course_local: "course",
  ticket_basics: "prediction",
  ticket_types: "prediction",
  ticket_odds: "prediction",
  ticket_strategy: "prediction",
  ticket_advanced: "prediction",
  jockey_basics: "jockey",
  jockey_data: "jockey",
  jockey_strategy: "jockey",
  training_basics: "trainer",
  training_analysis: "trainer",
  stable_guide: "trainer",
  history_classics: "g1",
  history_champions: "g1",
  history_records: "g1",
  history_modern: "g1",
  venue_kanto: "course",
  venue_kansai: "course",
  venue_local_east: "course",
  venue_local_west: "course",
  venue_facilities: "course",
  roi_basics: "prediction",
  roi_methods: "prediction",
  roi_advanced: "prediction",
  beginner_first: "g1",
  beginner_watching: "g1",
  beginner_betting: "prediction",
  data_basics: "prediction",
  data_pace: "prediction",
  data_tools: "prediction",
  local_intro: "course",
  local_races: "course",
  local_betting: "prediction",
  overseas_basics: "g1",
  overseas_major: "g1",
  pog_basics: "blood",
  pog_advanced: "blood",
  media_newspaper: "g1",
  media_digital: "g1",
  umamusume_intro: "g1",
  umamusume_real: "g1",
  umamusume_advanced: "g1",
};

// ============================================================
// 型定義
// ============================================================

type GeneratedQuiz = {
  question: string;
  choice1: string;
  choice2: string;
  choice3: string;
  choice4: string;
  correctIndex: number; // 1-4
  explanation: string;
  difficulty: number; // 1-5
};

type BatchItem = {
  articleId: string;
  courseId: string;
  stageId: number;
};

// ============================================================
// 記事取得
// ============================================================

async function fetchArticle(articleId: string) {
  const article = await microcms.get({
    endpoint: ARTICLE_ENDPOINT,
    contentId: articleId,
  });
  return article;
}

// HTMLからテキストを抽出（簡易版）
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

// ============================================================
// Claude APIでクイズ生成
// ============================================================

async function generateQuizzes(
  articleTitle: string,
  articleContent: string,
  stageId: number
): Promise<GeneratedQuiz[]> {
  const difficultyGuide =
    stageId <= 3
      ? "初級（基本的な事実の確認）"
      : stageId <= 7
        ? "中級（理解・応用を問う）"
        : "上級（判断・分析を問う）";

  const prompt = `以下の競馬学習記事の内容に基づいて、4択クイズを10問作成してください。

## 記事タイトル
${articleTitle}

## 記事内容
${articleContent.slice(0, 8000)}

## ルール
- 記事の重要ポイントから出題すること
- 4つの選択肢を用意し、正解は1つだけ
- 解説は記事の内容を踏まえて100-200文字で書くこと
- 難易度: ${difficultyGuide}（ステージ${stageId}/10）
- 選択肢は紛らわしいが、記事を読んでいれば正解がわかるレベル
- 「すべて正しい」「どれも違う」等の選択肢は避ける
- 同じ知識を複数の角度から問う（暗記ではなく理解を確認）
- 正解の位置（correctIndex）は1〜4でバラけさせること

## 出力形式
以下のJSON配列のみを出力してください。余計な説明は不要です。
[
  {
    "question": "問題文",
    "choice1": "選択肢1",
    "choice2": "選択肢2",
    "choice3": "選択肢3",
    "choice4": "選択肢4",
    "correctIndex": 1,
    "explanation": "解説文（100-200文字）",
    "difficulty": ${Math.min(5, Math.ceil(stageId / 2))}
  }
]`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  // JSONを抽出
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error("Claude APIからJSON配列を取得できませんでした");
  }

  const quizzes: GeneratedQuiz[] = JSON.parse(jsonMatch[0]);

  // バリデーション
  const validated = quizzes.filter((q) => {
    if (!q.question || !q.choice1 || !q.choice2 || !q.choice3 || !q.choice4) {
      console.warn("⚠️ 不完全な問題をスキップ:", q.question?.slice(0, 30));
      return false;
    }
    if (q.correctIndex < 1 || q.correctIndex > 4) {
      console.warn("⚠️ correctIndex異常:", q.correctIndex, q.question?.slice(0, 30));
      return false;
    }
    return true;
  });

  console.log(`✅ ${validated.length}/10問が有効`);
  return validated;
}

// ============================================================
// microCMSにアップロード
// ============================================================

async function uploadToMicroCMS(
  quizzes: GeneratedQuiz[],
  courseId: string,
  stageId: number,
  articleId: string
): Promise<string[]> {
  const uploadedIds: string[] = [];

  for (let i = 0; i < quizzes.length; i++) {
    const q = quizzes[i];
    try {
      // difficulty → microCMS level select値にマッピング
      const levelMap: Record<number, string> = {
        1: "beginner",
        2: "intermediate",
        3: "advenced",   // microCMS側のtypoに合わせる
        4: "master",
      };
      const level = levelMap[q.difficulty] || "beginner";

      const result = await microcms.create({
        endpoint: QUIZ_ENDPOINT,
        content: {
          question: q.question,
          choice1: q.choice1,
          choice2: q.choice2,
          choice3: q.choice3,
          choice4: q.choice4,
          correctIndex: q.correctIndex,
          explanation: `<p>${q.explanation}</p>`,
          category: COURSE_TO_QUIZ_CATEGORY[courseId] || "g1",
          level: [level],
          order: i + 1,
          courseId: courseId,
          stageId: stageId,
          sourceArticleId: articleId,
          questionOrder: i + 1,
        },
      });
      uploadedIds.push(result.id);
      console.log(`  📤 問題${i + 1} アップロード完了: ${result.id}`);
    } catch (error) {
      console.error(`  ❌ 問題${i + 1} アップロード失敗:`, error);
    }

    // レート制限回避
    await sleep(200);
  }

  return uploadedIds;
}

// ============================================================
// ユーティリティ
// ============================================================

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================
// 単体実行
// ============================================================

async function processSingle(
  articleId: string,
  courseId: string,
  stageId: number
) {
  console.log(`\n🎯 クイズ生成開始`);
  console.log(`  記事: ${articleId}`);
  console.log(`  コース: ${courseId} / ステージ: ${stageId}`);

  // 1. 記事取得
  console.log(`\n📖 記事を取得中...`);
  const article = await fetchArticle(articleId);
  const plainText = stripHtml(article.content || article.body || "");
  console.log(`  タイトル: ${article.title}`);
  console.log(`  文字数: ${plainText.length}`);

  // 2. クイズ生成
  console.log(`\n🤖 Claude APIでクイズ生成中...`);
  const quizzes = await generateQuizzes(article.title, plainText, stageId);

  // 3. ローカル保存（バックアップ）
  const outputDir = `./output/${courseId}`;
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  const outputPath = `${outputDir}/stage${stageId}.json`;
  fs.writeFileSync(outputPath, JSON.stringify(quizzes, null, 2), "utf-8");
  console.log(`💾 ローカル保存: ${outputPath}`);

  // 4. microCMSアップロード
  console.log(`\n📤 microCMSにアップロード中...`);
  const ids = await uploadToMicroCMS(quizzes, courseId, stageId, articleId);
  console.log(`\n✅ 完了！ ${ids.length}問をアップロード`);

  return ids;
}

// ============================================================
// バッチ実行
// ============================================================

async function processBatch(batchFile: string) {
  const batch: BatchItem[] = JSON.parse(
    fs.readFileSync(batchFile, "utf-8")
  );
  console.log(`\n📦 バッチ実行: ${batch.length}件`);

  const results: Record<string, string[]> = {};
  let total = 0;
  let errors = 0;

  for (let i = 0; i < batch.length; i++) {
    const item = batch[i];
    console.log(`\n━━━ [${i + 1}/${batch.length}] ━━━`);
    try {
      const ids = await processSingle(
        item.articleId,
        item.courseId,
        item.stageId
      );
      results[`${item.courseId}_stage${item.stageId}`] = ids;
      total += ids.length;
    } catch (error) {
      console.error(`❌ エラー: ${item.articleId}`, error);
      errors++;
    }

    // API レート制限回避（バッチ間）
    await sleep(1000);
  }

  // サマリー
  console.log(`\n${"═".repeat(50)}`);
  console.log(`📊 バッチ完了`);
  console.log(`  成功: ${batch.length - errors}件`);
  console.log(`  エラー: ${errors}件`);
  console.log(`  総問題数: ${total}問`);

  // 結果を保存
  fs.writeFileSync(
    "./output/batch-result.json",
    JSON.stringify(results, null, 2),
    "utf-8"
  );
}

// ============================================================
// ドライラン（アップロードせずJSONのみ生成）
// ============================================================

async function dryRun(articleId: string, courseId: string, stageId: number) {
  console.log(`\n🧪 ドライラン（アップロードなし）`);

  const article = await fetchArticle(articleId);
  const plainText = stripHtml(article.content || article.body || "");
  console.log(`  タイトル: ${article.title}`);

  const quizzes = await generateQuizzes(article.title, plainText, stageId);

  // 整形して表示
  quizzes.forEach((q, i) => {
    console.log(`\n--- 問題${i + 1} ---`);
    console.log(`Q: ${q.question}`);
    console.log(`  A: ${q.choice1}`);
    console.log(`  B: ${q.choice2}`);
    console.log(`  C: ${q.choice3}`);
    console.log(`  D: ${q.choice4}`);
    console.log(`  正解: ${String.fromCharCode(64 + q.correctIndex)}`);
    console.log(`  解説: ${q.explanation}`);
  });

  // ローカル保存
  const outputDir = `./output/${courseId}`;
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  fs.writeFileSync(
    `${outputDir}/stage${stageId}.json`,
    JSON.stringify(quizzes, null, 2),
    "utf-8"
  );
  console.log(`\n💾 保存: ${outputDir}/stage${stageId}.json`);
}

// ============================================================
// CLI エントリポイント
// ============================================================

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--batch")) {
    const batchIdx = args.indexOf("--batch");
    const batchFile = args[batchIdx + 1];
    if (!batchFile) {
      console.error("❌ --batch にファイルパスを指定してください");
      process.exit(1);
    }
    await processBatch(batchFile);
  } else if (args.includes("--articleId")) {
    const articleId = args[args.indexOf("--articleId") + 1];
    const courseId = args[args.indexOf("--courseId") + 1] || "test_course";
    const stageId = parseInt(
      args[args.indexOf("--stageId") + 1] || "1",
      10
    );
    const isDry = args.includes("--dry");

    if (!articleId) {
      console.error("❌ --articleId を指定してください");
      process.exit(1);
    }

    if (isDry) {
      await dryRun(articleId, courseId, stageId);
    } else {
      await processSingle(articleId, courseId, stageId);
    }
  } else {
    console.log(`
🎯 競馬道場クイズ生成スクリプト

使い方:
  # ドライラン（確認のみ、アップロードなし）
  npx ts-node quiz-gen/generate.ts --articleId <ID> --courseId <COURSE> --stageId <N> --dry

  # 単体実行（生成 + アップロード）
  npx ts-node quiz-gen/generate.ts --articleId <ID> --courseId blood_basics --stageId 1

  # バッチ実行
  npx ts-node quiz-gen/generate.ts --batch ./batch.json

環境変数:
  ANTHROPIC_API_KEY      — Claude API キー
  MICROCMS_SERVICE_DOMAIN — microCMS サービスドメイン
  MICROCMS_API_KEY        — microCMS API キー（POST権限必要）
    `);
  }
}

main().catch((error) => {
  console.error("❌ 致命的エラー:", error);
  process.exit(1);
});
