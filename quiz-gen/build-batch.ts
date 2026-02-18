// quiz-gen/build-batch.ts
// 使い方: npx ts-node quiz-gen/build-batch.ts
//
// microCMSから記事一覧を取得し、コース・ステージにマッピングして
// batch.json を自動生成するスクリプト

import { createClient } from "microcms-js-sdk";
import * as fs from "fs";

const microcms = createClient({
  serviceDomain: process.env.MICROCMS_SERVICE_DOMAIN!,
  apiKey: process.env.MICROCMS_API_KEY!,
});

// ============================================================
// カテゴリ → コースのマッピング定義
// ============================================================

// microCMSの記事カテゴリID → コースID群
// ※ カテゴリIDはmicroCMSの実際のIDに合わせて更新してください
const CATEGORY_TO_COURSES: Record<string, string[]> = {
  // カテゴリID: [コースID, コースID, ...]
  // 血統系
  blood: ["blood_basics", "blood_sire", "blood_broodmare", "blood_advanced"],
  // コース攻略系
  course: ["course_tokyo", "course_nakayama", "course_kyoto", "course_hanshin", "course_local"],
  // 馬券・予想系
  ticket: ["ticket_basics", "ticket_types", "ticket_odds", "ticket_strategy", "ticket_advanced"],
  // 騎手系
  jockey: ["jockey_basics", "jockey_data", "jockey_strategy"],
  // 調教系
  training: ["training_basics", "training_analysis", "stable_guide"],
  // 歴史系
  history: ["history_classics", "history_champions", "history_records", "history_modern"],
  // 競馬場ガイド
  venue: ["venue_kanto", "venue_kansai", "venue_local_east", "venue_local_west", "venue_facilities"],
  // 馬券術・回収率
  roi: ["roi_basics", "roi_methods", "roi_advanced"],
  // 初心者入門
  beginner: ["beginner_first", "beginner_watching", "beginner_betting"],
  // データ分析
  data: ["data_basics", "data_pace", "data_tools"],
  // 地方競馬
  local: ["local_intro", "local_races", "local_betting"],
  // 海外競馬
  overseas: ["overseas_basics", "overseas_major"],
  // POG
  pog: ["pog_basics", "pog_advanced"],
  // メディア
  media: ["media_newspaper", "media_digital"],
  // ウマ娘
  umamusume: ["umamusume_intro", "umamusume_real", "umamusume_advanced"],
  // ── microCMS実カテゴリID（エイリアス） ──
  prediction: ["ticket_basics", "ticket_types", "ticket_odds", "ticket_strategy", "ticket_advanced"],
  legend: ["history_classics", "history_champions", "history_records", "history_modern"],
  trainer: ["training_basics", "training_analysis", "stable_guide"],
  "uma-musume": ["umamusume_intro", "umamusume_real", "umamusume_advanced"],
};

type BatchItem = {
  articleId: string;
  articleTitle: string;
  courseId: string;
  stageId: number;
};

async function main() {
  console.log("📖 microCMSから記事一覧を取得中...\n");

  // 全記事を取得
  const allArticles: any[] = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const res = await microcms.getList({
      endpoint: "articles",
      queries: {
        limit,
        offset,
        fields: ["id", "title", "category"],
        orders: "publishedAt",
      },
    });
    allArticles.push(...res.contents);
    if (allArticles.length >= res.totalCount) break;
    offset += limit;
  }

  console.log(`  取得: ${allArticles.length}件\n`);

  // カテゴリ別にグループ化
  const byCategory: Record<string, any[]> = {};
  for (const article of allArticles) {
    const catId = article.category?.id || "uncategorized";
    if (!byCategory[catId]) byCategory[catId] = [];
    byCategory[catId].push(article);
  }

  // カテゴリごとにコース・ステージを割り当て
  const batch: BatchItem[] = [];
  const summary: Record<string, number> = {};

  for (const [catId, articles] of Object.entries(byCategory)) {
    // カテゴリIDからマッピングを検索
    let courses: string[] | undefined;
    for (const [key, value] of Object.entries(CATEGORY_TO_COURSES)) {
      if (catId.includes(key) || key.includes(catId)) {
        courses = value;
        break;
      }
    }

    if (!courses) {
      console.warn(`⚠️ マッピングなし: カテゴリ "${catId}" (${articles.length}記事)`);
      continue;
    }

    // 記事をコース群に均等分配
    const articlesPerCourse = Math.ceil(articles.length / courses.length);

    for (let ci = 0; ci < courses.length; ci++) {
      const courseId = courses[ci];
      const courseArticles = articles.slice(
        ci * articlesPerCourse,
        (ci + 1) * articlesPerCourse
      );

      // 各記事をステージに割り当て（最大10ステージ）
      for (let si = 0; si < Math.min(courseArticles.length, 10); si++) {
        const article = courseArticles[si];
        batch.push({
          articleId: article.id,
          articleTitle: article.title,
          courseId,
          stageId: si + 1,
        });
      }

      summary[courseId] = Math.min(courseArticles.length, 10);
    }
  }

  // 結果を保存
  const outputPath = "quiz-gen/batch.json";
  // batch.json にはarticleId, courseId, stageIdのみ（titleは不要）
  const cleanBatch = batch.map(({ articleId, courseId, stageId }) => ({
    articleId,
    courseId,
    stageId,
  }));
  fs.writeFileSync(outputPath, JSON.stringify(cleanBatch, null, 2), "utf-8");

  // サマリー表示
  console.log("━━━ バッチ生成サマリー ━━━\n");
  console.log(`📦 総バッチ数: ${batch.length}件（= ${batch.length}ステージ × 10問 = ${batch.length * 10}問）\n`);

  console.log("コース別:");
  for (const [courseId, stageCount] of Object.entries(summary).sort()) {
    console.log(`  ${courseId}: ${stageCount}ステージ`);
  }

  // マッピング確認用CSV
  const csvPath = "quiz-gen/batch-mapping.csv";
  const csv = [
    "articleId,articleTitle,courseId,stageId",
    ...batch.map(
      (b) =>
        `${b.articleId},"${b.articleTitle.replace(/"/g, '""')}",${b.courseId},${b.stageId}`
    ),
  ].join("\n");
  fs.writeFileSync(csvPath, csv, "utf-8");

  console.log(`\n💾 保存: ${outputPath}`);
  console.log(`📋 マッピングCSV: ${csvPath}`);
  console.log(`\n次のステップ:`);
  console.log(`  1. batch-mapping.csv を確認・修正`);
  console.log(`  2. npx ts-node quiz-gen/generate.ts --batch quiz-gen/batch.json`);
}

main().catch((error) => {
  console.error("❌ エラー:", error);
  process.exit(1);
});
