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

  if (!categoryId) {
    return NextResponse.json({ articles: [] });
  }

  try {
    const res = await client.getList({
      endpoint: "articles",
      queries: {
        filters: `category[equals]${categoryId}`,
        limit: 20,
        fields: ["id", "title", "emoji", "category"],
      },
    });

    // 現在の記事を除外してシャッフル
    const filtered = res.contents.filter((a) => a.id !== articleId);
    const shuffled = filtered.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(limit, shuffled.length));

    return NextResponse.json({ articles: selected });
  } catch (error) {
    console.error("related-articles API error:", error);
    return NextResponse.json({ articles: [] });
  }
}
