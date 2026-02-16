import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DojoClient from "./DojoClient";
import {
  getQuizCategories,
  getArticles,
  getQuizQuestions,
} from "@/lib/microcms";

export default async function DojoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // MicroCMSからデータ取得（並列実行）
  const [quizCategories, articlesData] = await Promise.all([
    getQuizCategories(),
    getArticles({ limit: 5 }),
  ]);

  // 各カテゴリの問題数を取得
  const categoriesWithCount = await Promise.all(
    quizCategories.map(async (cat) => {
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

  // 記事データをシリアライズ可能な形に変換
  const articles = articlesData.contents.map((article) => ({
    id: article.id,
    title: article.title,
    slug: article.slug,
    emoji: article.emoji || "📖",
    excerpt: article.excerpt || "",
    readTime: article.readTime || 5,
    categoryName: article.category?.name || "",
    categoryIcon: article.category?.icon || "",
    hasQuiz: article.hasQuiz || false,
  }));

  return (
    <DojoClient
      userId={user.id}
      quizCategories={categoriesWithCount}
      articles={articles}
    />
  );
}
