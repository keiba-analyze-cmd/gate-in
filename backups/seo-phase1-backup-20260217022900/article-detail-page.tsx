import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import ArticleDetailClient from "./ArticleDetailClient";
import { getArticleById, getQuizCategories } from "@/lib/microcms";

type Props = {
  params: Promise<{ articleId: string }>;
};

export default async function ArticleDetailPage({ params }: Props) {
  const { articleId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  let article;
  try {
    article = await getArticleById(articleId);
  } catch {
    notFound();
  }

  if (!article) notFound();

  // クイズカテゴリを取得して、記事カテゴリと一致するものがあるかチェック
  const quizCategories = await getQuizCategories();
  const quizCategoryIds = new Set(quizCategories.map((c) => c.id));
  const categoryId = article.category?.id || "";
  const hasMatchingQuiz = quizCategoryIds.has(categoryId);

  return (
    <ArticleDetailClient
      articleId={article.id}
      title={article.title}
      emoji={article.emoji || "📖"}
      categoryId={categoryId}
      categoryName={article.category?.name || ""}
      categoryIcon={article.category?.icon || ""}
      readTime={article.readTime || 5}
      content={article.content}
      hasQuiz={hasMatchingQuiz}
      quizCategoryId={hasMatchingQuiz ? categoryId : undefined}
      tags={article.tags?.map((t) => t.name) || []}
      publishedAt={article.publishedAt || article.createdAt}
    />
  );
}
