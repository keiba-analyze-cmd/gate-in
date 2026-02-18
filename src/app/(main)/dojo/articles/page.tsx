// src/app/(main)/dojo/articles/page.tsx
import { Metadata } from "next";
import ArticlesListClient from "./ArticlesListClient";
import { getArticles, getArticleCategories, getQuizCategories } from "@/lib/microcms";

export const metadata: Metadata = {
  title: "記事一覧 | 競馬道場",
  description:
    "競馬の血統入門、コース攻略、騎手データ分析など、競馬の知識を深める記事を一覧で紹介。初心者から上級者まで役立つ情報が見つかります。",
  alternates: {
    canonical: "https://gate-in.jp/dojo/articles",
  },
};

type Props = {
  searchParams: Promise<{ category?: string }>;
};

export default async function ArticlesPage({ searchParams }: Props) {
  const params = await searchParams;
  const filterCategoryId = params.category || "";

  const [articlesData, articleCategories, quizCategories] = await Promise.all([
    getArticles({
      categoryId: filterCategoryId || undefined,
      limit: 100,
    }).catch(() => ({
      contents: [],
      totalCount: 0,
      offset: 0,
      limit: 100,
    })),
    getArticleCategories().catch(() => []),
    getQuizCategories().catch(() => []),
  ]);

  const quizCategoryIds = new Set(
    (Array.isArray(quizCategories) ? quizCategories : []).map((c) => c.id)
  );

  const articles = articlesData.contents.map((article) => {
    const categoryId = article.category?.id || "";
    return {
      id: article.id,
      title: article.title,
      slug: article.slug,
      emoji: article.emoji || "📖",
      excerpt: article.excerpt || "",
      readTime: article.readTime || 5,
      categoryId,
      categoryName: article.category?.name || "",
      categoryIcon: article.category?.icon || "",
      hasQuiz: quizCategoryIds.has(categoryId),
      publishedAt: article.publishedAt || article.createdAt,
    };
  });

  const categories = (
    Array.isArray(articleCategories) ? articleCategories : []
  ).map((cat) => ({
    id: cat.id,
    name: cat.name,
    icon: cat.icon || "",
    order: cat.order || 0,
  }));

  return (
    <ArticlesListClient
      articles={articles}
      categories={categories}
      totalCount={articlesData.totalCount}
      initialCategoryId={filterCategoryId}
    />
  );
}
