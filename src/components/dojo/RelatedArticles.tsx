"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useTheme } from "@/contexts/ThemeContext";

type RelatedArticle = {
  id: string;
  title: string;
  emoji: string;
  category: { name: string; icon: string } | null;
};

type Props = {
  currentArticleId: string;
  categoryId: string;
  categoryName: string;
};

export default function RelatedArticles({
  currentArticleId,
  categoryId,
  categoryName,
}: Props) {
  const { isDark } = useTheme();
  const [articles, setArticles] = useState<RelatedArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRelated() {
      try {
        const res = await fetch(
          `/api/related-articles?articleId=${currentArticleId}&categoryId=${categoryId}&limit=5`
        );
        const data = await res.json();
        setArticles(data.articles || []);
      } catch {
        // 静かに失敗
      } finally {
        setLoading(false);
      }
    }
    if (categoryId) fetchRelated();
    else setLoading(false);
  }, [currentArticleId, categoryId]);

  if (loading || articles.length === 0) return null;

  const cardBg = isDark ? "bg-slate-900 border-slate-700" : "bg-white border-gray-200";
  const textPrimary = isDark ? "text-slate-100" : "text-gray-900";
  const textSecondary = isDark ? "text-slate-400" : "text-gray-500";
  const hoverBg = isDark ? "hover:bg-slate-800" : "hover:bg-gray-50";

  return (
    <div className={`rounded-2xl border p-5 ${cardBg}`}>
      <h3 className={`font-bold mb-3 ${textPrimary}`}>
        📚 {categoryName}の関連記事
      </h3>
      <div className="space-y-1">
        {articles.map((article) => (
          <Link
            key={article.id}
            href={`/dojo/articles/${article.id}`}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${hoverBg}`}
          >
            <span className="text-lg shrink-0">{article.emoji || "📖"}</span>
            <span className={`text-sm font-medium line-clamp-2 ${textSecondary}`}>
              {article.title}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
