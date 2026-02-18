// src/app/(main)/dojo/articles/ArticlesListClient.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "@/contexts/ThemeContext";

type ArticleData = {
  id: string;
  title: string;
  slug: string;
  emoji: string;
  excerpt: string;
  readTime: number;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  hasQuiz: boolean;
  publishedAt: string;
};

type CategoryData = {
  id: string;
  name: string;
  icon: string;
  order: number;
};

type Props = {
  articles: ArticleData[];
  categories: CategoryData[];
  totalCount: number;
  initialCategoryId: string;
};

export default function ArticlesListClient({
  articles,
  categories,
  totalCount,
  initialCategoryId,
}: Props) {
  const { isDark } = useTheme();
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState(
    initialCategoryId || "all"
  );

  const filteredArticles =
    selectedCategory === "all"
      ? articles
      : articles.filter((a) => a.categoryId === selectedCategory);

  const sortedCategories = [...categories].sort((a, b) => a.order - b.order);

  const cardBg = isDark
    ? "bg-slate-900 border-slate-700"
    : "bg-white border-gray-200";
  const textPrimary = isDark ? "text-slate-100" : "text-gray-900";
  const textSecondary = isDark ? "text-slate-400" : "text-gray-500";
  const textMuted = isDark ? "text-slate-500" : "text-gray-400";
  const chipActive = isDark
    ? "bg-amber-500 text-slate-900"
    : "bg-green-600 text-white";
  const chipInactive = isDark
    ? "bg-slate-800 text-slate-300 border-slate-700"
    : "bg-white text-gray-600 border-gray-200";
  const quizTag = isDark
    ? "bg-amber-500/20 text-amber-400"
    : "bg-amber-100 text-amber-700";

  const handleCategoryChange = (catId: string) => {
    setSelectedCategory(catId);
    if (catId === "all") {
      router.push("/dojo/articles");
    } else {
      router.push(`/dojo/articles?category=${catId}`);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-8">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className={`text-xl font-black ${textPrimary}`}>📰 学習記事</h1>
          <span className={`text-xs ${textMuted}`}>
            ({totalCount}件)
          </span>
        </div>
        <Link href="/dojo" className={`text-sm ${textMuted}`}>
          ← 道場に戻る
        </Link>
      </div>

      {/* カテゴリフィルター */}
      <div
        className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide"
        style={{ scrollbarWidth: "none" }}
      >
        <button
          onClick={() => handleCategoryChange("all")}
          className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap border transition-all ${
            selectedCategory === "all" ? chipActive : chipInactive
          }`}
        >
          すべて
        </button>
        {sortedCategories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => handleCategoryChange(cat.id)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap border transition-all ${
              selectedCategory === cat.id ? chipActive : chipInactive
            }`}
          >
            {cat.icon} {cat.name}
          </button>
        ))}
      </div>

      {/* 記事一覧 */}
      {filteredArticles.length === 0 ? (
        <div className={`rounded-2xl border p-8 text-center ${cardBg}`}>
          <span className="text-4xl block mb-2">📭</span>
          <p className={`text-sm ${textSecondary}`}>
            この カテゴリの記事を準備中です...
          </p>
        </div>
      ) : (
        <div className={`rounded-2xl border overflow-hidden ${cardBg}`}>
          {filteredArticles.map((article, index) => (
            <Link
              key={article.id}
              href={`/dojo/articles/${article.id}`}
              className={`flex gap-4 p-4 transition-colors ${
                index !== filteredArticles.length - 1
                  ? `border-b ${
                      isDark ? "border-slate-700" : "border-gray-100"
                    }`
                  : ""
              } ${isDark ? "hover:bg-slate-800" : "hover:bg-gray-50"}`}
            >
              <div
                className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl shrink-0 ${
                  isDark ? "bg-slate-800" : "bg-gray-100"
                }`}
              >
                {article.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className={`font-bold text-sm mb-1 ${textPrimary}`}>
                  {article.title}
                </h3>
                {article.excerpt && (
                  <p className={`text-xs line-clamp-2 mb-2 ${textMuted}`}>
                    {article.excerpt}
                  </p>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      isDark
                        ? "bg-slate-700 text-slate-300"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {article.categoryIcon} {article.categoryName}
                  </span>
                  {article.readTime > 0 && (
                    <span className={`text-xs ${textMuted}`}>
                      📖 {article.readTime}分
                    </span>
                  )}
                  {article.hasQuiz && (
                    <span className={`text-xs px-1.5 py-0.5 rounded ${quizTag}`}>
                      🎯 クイズ付き
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
