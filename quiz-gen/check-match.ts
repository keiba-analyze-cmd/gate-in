import { createClient } from "microcms-js-sdk";
const client = createClient({ serviceDomain: process.env.MICROCMS_SERVICE_DOMAIN!, apiKey: process.env.MICROCMS_API_KEY! });

// 最新のクイズ5件のsourceArticleIdを確認
client.getList({ 
  endpoint: "quiz-questions", 
  queries: { limit: 5, fields: ["id", "question", "sourceArticleId", "courseId", "stageId"], orders: "-createdAt" } 
}).then(async (res) => {
  for (const q of res.contents) {
    console.log(`\nクイズ: ${q.id}`);
    console.log(`  Q: ${q.question.substring(0, 50)}...`);
    console.log(`  sourceArticleId: ${q.sourceArticleId || "❌ 未設定"}`);
    console.log(`  courseId: ${q.courseId || "未設定"}`);
    
    // 元記事のタイトルを取得
    if (q.sourceArticleId) {
      try {
        const article = await client.get({ endpoint: "articles", contentId: q.sourceArticleId });
        console.log(`  元記事: ${article.title}`);
      } catch {
        console.log(`  元記事: ❌ 取得失敗`);
      }
    }
  }
});
