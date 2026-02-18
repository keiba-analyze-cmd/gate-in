import { NextRequest, NextResponse } from "next/server";
import { createClient } from "microcms-js-sdk";

const client = createClient({
  serviceDomain: process.env.MICROCMS_SERVICE_DOMAIN || "gatein",
  apiKey: process.env.MICROCMS_API_KEY || "",
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const articleId = searchParams.get("articleId");
  const categoryId = searchParams.get("categoryId");
  const limit = parseInt(searchParams.get("limit") || "5", 10);

  if (!articleId && !categoryId) {
    return NextResponse.json(
      { error: "articleId or categoryId is required" },
      { status: 400 }
    );
  }

  try {
    // 1. まずsourceArticleIdで検索（記事専用クイズ）
    let quizzes: any[] = [];

    if (articleId) {
      const res = await client.getList({
        endpoint: "quiz-questions",
        queries: {
          filters: `sourceArticleId[equals]${articleId}`,
          limit: 50,
          fields: [
            "id",
            "question",
            "choice1",
            "choice2",
            "choice3",
            "choice4",
            "correctIndex",
            "explanation",
            "level",
          ],
        },
      });
      quizzes = res.contents;
    }

    // 2. ランダムにlimit件を選出（カテゴリフォールバックなし = 記事専用のみ）
    const shuffled = quizzes.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(limit, shuffled.length));

    return NextResponse.json({
      quizzes: selected,
      total: quizzes.length,
      source: quizzes.length > 0 ? (articleId ? "article" : "category") : "none",
    });
  } catch (error) {
    console.error("article-quiz API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch quizzes" },
      { status: 500 }
    );
  }
}
