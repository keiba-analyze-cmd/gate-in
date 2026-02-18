// src/app/(main)/dojo/page.tsx
import { Metadata } from "next";
// cookies は createClient 内部で処理
import { createClient } from "@/lib/supabase/server";
import DojoClient from "./DojoClient";
import {
  getQuizCategories,
  getArticles,
  getArticleCategories,
  getQuizQuestions,
} from "@/lib/microcms";

export const metadata: Metadata = {
  title: "競馬道場 | クイズで学ぶ競馬知識",
  description:
    "競馬の血統・コース攻略・騎手・調教の知識をカテゴリ別に学べる競馬道場。クイズで理解度をチェックしながら、競馬の実力を磨きましょう。",
  alternates: {
    canonical: "https://gate-in.jp/dojo",
  },
};

export default async function DojoPage() {
  // Supabase + microCMS データを並列取得
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [
    quizCategories,
    articlesData,
    articleCategories,
    progressResult,
    articleReadResult,
    dailyResult,
  ] = await Promise.all([
    getQuizCategories().catch(() => []),
    getArticles({ limit: 100 }).catch(() => ({
      contents: [],
      totalCount: 0,
      offset: 0,
      limit: 100,
    })),
    getArticleCategories().catch(() => []),
    // 道場進捗（ログイン時のみ）
    user
      ? supabase
          .from("dojo_progress")
          .select("course_id, stage_id, stars, best_score, attempts, cleared_at")
          .eq("user_id", user.id)
      : Promise.resolve({ data: [] }),
    // 記事読了数（ログイン時のみ）
    user
      ? supabase
          .from("dojo_article_reads")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
      : Promise.resolve({ count: 0 }),
    // デイリーチャレンジ（ログイン時のみ）
    user
      ? supabase
          .from("dojo_daily")
          .select("completed, challenge_date")
          .eq("user_id", user.id)
          .order("challenge_date", { ascending: false })
          .limit(30)
      : Promise.resolve({ data: [] }),
  ]);

  // クイズカテゴリ + 問題数
  const safeQuizCategories = Array.isArray(quizCategories)
    ? quizCategories
    : [];
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

  // クイズカテゴリIDセット
  const quizCategoryIds = new Set(safeQuizCategories.map((c) => c.id));

  // 記事データシリアライズ
  const articles = articlesData.contents.map((article) => {
    const categoryId = article.category?.id || "";
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

  // 記事カテゴリ
  const artCategories = (
    Array.isArray(articleCategories) ? articleCategories : []
  ).map((cat) => ({
    id: cat.id,
    name: cat.name,
    icon: cat.icon || "",
    order: cat.order || 0,
  }));

  // 進捗データ
  const progressRows = (progressResult as any)?.data ?? [];

  // 記事読了数
  const articleReadCount = (articleReadResult as any)?.count ?? 0;

  // デイリーストリーク計算
  const dailyData = ((dailyResult as any)?.data ?? []) as {
    completed: boolean;
    challenge_date: string;
  }[];
  const today = new Date().toISOString().split("T")[0];
  const dailyCompleted = dailyData.some(
    (d) => d.challenge_date === today && d.completed
  );

  let dailyStreak = 0;
  if (dailyData.length > 0) {
    const date = new Date();
    for (let i = 0; i < 30; i++) {
      const dateStr = date.toISOString().split("T")[0];
      const found = dailyData.find(
        (d) => d.challenge_date === dateStr && d.completed
      );
      if (found) {
        dailyStreak++;
        date.setDate(date.getDate() - 1);
      } else {
        // 今日がまだ未完了の場合は昨日からカウント
        if (i === 0 && !dailyCompleted) {
          date.setDate(date.getDate() - 1);
          continue;
        }
        break;
      }
    }
  }

  return (
    <DojoClient
      userId={user?.id ?? ""}
      quizCategories={categoriesWithCount}
      articles={articles}
      articleCategories={artCategories}
      progressRows={progressRows}
      articleReadCount={articleReadCount}
      dailyStreak={dailyStreak}
      dailyCompleted={dailyCompleted}
    />
  );
}
