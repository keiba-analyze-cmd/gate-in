import { createAdminClient } from "@/lib/admin";
import { getArticles, getQuizCategories } from "@/lib/microcms";
import type { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://gate-in.jp";
  const admin = createAdminClient();

  // ── レースページ ──
  const { data: races } = await admin
    .from("races")
    .select("id, race_date")
    .order("race_date", { ascending: false })
    .limit(200);

  const raceEntries = (races ?? []).map((race) => ({
    url: `${baseUrl}/races/${race.id}`,
    lastModified: new Date(race.race_date),
    changeFrequency: "daily" as const,
    priority: 0.8,
  }));

  // ── 道場：記事ページ ──
  let articleEntries: MetadataRoute.Sitemap = [];
  try {
    const articles = await getArticles({ limit: 100 });
    articleEntries = articles.contents.map((article) => ({
      url: `${baseUrl}/dojo/articles/${article.id}`,
      lastModified: new Date(article.updatedAt),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));
  } catch (e) {
    console.error("Sitemap: 記事取得エラー", e);
  }

  // ── 道場：クイズカテゴリページ ──
  let quizEntries: MetadataRoute.Sitemap = [];
  try {
    const categories = await getQuizCategories();
    quizEntries = categories.map((cat) => ({
      url: `${baseUrl}/dojo/quiz/${cat.id}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));
  } catch (e) {
    console.error("Sitemap: クイズカテゴリ取得エラー", e);
  }

  return [
    // 固定ページ
    { url: baseUrl, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/races`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/dojo`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/dojo/articles`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/rankings`, lastModified: new Date(), changeFrequency: "daily", priority: 0.7 },
    { url: `${baseUrl}/contest`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    { url: `${baseUrl}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/terms`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${baseUrl}/privacy`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${baseUrl}/legal`, changeFrequency: "monthly", priority: 0.3 },
    // 動的ページ
    ...raceEntries,
    ...articleEntries,
    ...quizEntries,
  ];
}
