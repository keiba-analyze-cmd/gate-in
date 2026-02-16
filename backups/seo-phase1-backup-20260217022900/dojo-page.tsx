import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DojoClient from "./DojoClient";
import {
  getQuizCategories,
  getArticles,
  getArticleCategories,
  getQuizQuestions,
} from "@/lib/microcms";

export default async function DojoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // MicroCMSからデータ取得（並列実行、個別にエラーハンドリング）
  const [quizCategories, articlesData, articleCategories] = await Promise.all([
    getQuizCategories().catch(() => []),
    getArticles({ limit: 100 }).catch(() => ({ contents: [], totalCount: 0, offset: 0, limit: 100 })),
    getArticleCategories().catch(() => []),
  ]);

  // 各クイズカテゴリの問題数を取得
  const safeQuizCategories = Array.isArray(quizCategories) ? quizCategories : [];
  const categoriesWithCount = await Promise.all(
    safeQuizCategories.map(async (cat) => {
      const questions = await getQuizQuestions({
        categoryId: cat.id,
        limit: 0,
      });
      return {
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        icon: cat.icon,
        description: cat.description || "",
        color: cat.color || "",
        order: cat.order || 0,
        questionCount: questions.totalCount,
      };
    })
  );

  // クイズカテゴリのIDセット（記事のカテゴリと一致するものがあるかチェック用）
  const quizCategoryIds = new Set(safeQuizCategories.map((c) => c.id));

  // 記事データをシリアライズ可能な形に変換
  const articles = articlesData.contents.map((article) => {
    const categoryId = article.category?.id || "";
    // 記事カテゴリIDと一致するクイズカテゴリが存在する場合のみクイズ連携
    const hasMatchingQuiz = quizCategoryIds.has(categoryId);
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
      hasQuiz: hasMatchingQuiz,
    };
  });

  // 記事カテゴリをシリアライズ
  const artCategories = (Array.isArray(articleCategories) ? articleCategories : []).map((cat) => ({
    id: cat.id,
    name: cat.name,
    icon: cat.icon || "",
    order: cat.order || 0,
  }));

  return (
    <DojoClient
      userId={user.id}
      quizCategories={categoriesWithCount}
      articles={articles}
      articleCategories={artCategories}
    />
  );
}
