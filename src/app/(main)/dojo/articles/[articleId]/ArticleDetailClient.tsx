"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useTheme } from "@/contexts/ThemeContext";
import ArticleQuiz from "@/components/dojo/ArticleQuiz";
import RelatedArticles from "@/components/dojo/RelatedArticles";

type Props = {
  articleId: string;
  title: string;
  emoji: string;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  readTime: number;
  content: string;
  hasQuiz: boolean;
  quizCategoryId?: string;
  tags: string[];
  publishedAt: string;
};

function processArticleHtml(html: string, isDark: boolean): string {
  let processed = html;

  // 馬券のポイント ハイライトボックス
  processed = processed.replace(
    /<p>(<strong>(?:💡\s*)?馬券のポイント[：:]<\/strong>)([\s\S]*?)<\/p>/g,
    (_match, label, content) => {
      const bgStyle = isDark
        ? "background: linear-gradient(135deg, rgba(245,158,11,0.15), rgba(249,115,22,0.1)); border: 1px solid rgba(245,158,11,0.3); color: #fde68a;"
        : "background: linear-gradient(135deg, rgba(16,185,129,0.08), rgba(5,150,105,0.05)); border: 1px solid rgba(16,185,129,0.3); color: #065f46;";
      return `<div style="${bgStyle} border-radius: 12px; padding: 16px; margin: 16px 0; font-size: 14px; line-height: 1.7;">${label}${content}</div>`;
    }
  );

  // テーブルスタイル
  const tableBorder = isDark ? "#334155" : "#e5e7eb";
  const headerBg = isDark ? "#1e293b" : "#f1f5f9";
  const headerColor = isDark ? "#e2e8f0" : "#1e293b";
  const cellColor = isDark ? "#cbd5e1" : "#475569";
  const cellBorder = isDark ? "#1e293b" : "#f1f5f9";
  const rowEvenBg = isDark
    ? "rgba(245,158,11,0.05)"
    : "rgba(16,185,129,0.05)";

  processed = processed.replace(
    /<table>([\s\S]*?)<\/table>/g,
    (_match, tableInner) => {
      let inner: string = tableInner;

      inner = inner.replace(
        /<tr>([\s\S]*?)<\/tr>/g,
        (trMatch: string, trInner: string) => {
          if (/<th[\s>]/.test(trInner)) {
            let thIdx = 0;
            const styledTh = trInner.replace(
              /<th([^>]*)>/g,
              (_m: string, attrs: string) => {
                const align = thIdx === 0 ? "left" : "center";
                thIdx++;
                return `<th${attrs} style="padding: 10px 14px; text-align: ${align}; font-weight: 700; font-size: 12px; color: ${headerColor}; border-bottom: 2px solid ${tableBorder}; white-space: nowrap;">`;
              }
            );
            return `<tr style="background: ${headerBg};">${styledTh}</tr>`;
          }
          return trMatch;
        }
      );

      let dataRowIdx = 0;
      inner = inner.replace(
        /<tr>([\s\S]*?)<\/tr>/g,
        (trMatch: string, trInner: string) => {
          if (trMatch.includes('style="background:')) return trMatch;
          if (!/<td[\s>]/.test(trInner)) return trMatch;

          dataRowIdx++;
          const bgStyle =
            dataRowIdx % 2 === 0
              ? ` style="background: ${rowEvenBg};"`
              : "";

          let tdIdx = 0;
          const styledTd = trInner.replace(
            /<td([^>]*)>/g,
            (_m: string, attrs: string) => {
              const align = tdIdx === 0 ? "left" : "center";
              tdIdx++;
              return `<td${attrs} style="padding: 10px 14px; text-align: ${align}; color: ${cellColor}; border-bottom: 1px solid ${cellBorder}; white-space: nowrap;">`;
            }
          );

          return `<tr${bgStyle}>${styledTd}</tr>`;
        }
      );

      return `<div style="overflow-x: auto; margin: 16px 0; border-radius: 12px; border: 1px solid ${tableBorder};"><table style="width: 100%; border-collapse: collapse; font-size: 13px;">${inner}</table></div>`;
    }
  );

  return processed;
}

export default function ArticleDetailClient({
  articleId,
  title,
  emoji,
  categoryId,
  categoryName,
  categoryIcon,
  readTime,
  content,
  hasQuiz,
  quizCategoryId,
  tags,
  publishedAt,
}: Props) {
  const { isDark } = useTheme();

  const cardBg = isDark
    ? "bg-slate-900 border-slate-700"
    : "bg-white border-gray-200";
  const textPrimary = isDark ? "text-slate-100" : "text-gray-900";
  const textMuted = isDark ? "text-slate-500" : "text-gray-400";
  const btnPrimary = isDark
    ? "bg-amber-500 hover:bg-amber-400 text-slate-900"
    : "bg-green-600 hover:bg-green-700 text-white";

  const formattedDate = new Date(publishedAt).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const processedContent = useMemo(
    () => processArticleHtml(content, isDark),
    [content, isDark]
  );

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Link href="/dojo/articles" className={`text-sm ${textMuted}`}>
        ← 記事一覧に戻る
      </Link>

      <div className={`rounded-2xl border p-6 ${cardBg}`}>
        {/* メタ情報 */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {categoryName && (
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                isDark
                  ? "bg-slate-700 text-slate-300"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {categoryIcon} {categoryName}
            </span>
          )}
          <span className={`text-xs ${textMuted}`}>
            📖 {readTime}分で読める
          </span>
          <span className={`text-xs ${textMuted}`}>📅 {formattedDate}</span>
        </div>

        {/* タイトル */}
        <div className="flex items-start gap-3 mb-6">
          <span className="text-3xl shrink-0">{emoji}</span>
          <h1 className={`text-xl font-black ${textPrimary}`}>{title}</h1>
        </div>

        {/* 本文 */}
        <div
          className={`
            article-content prose max-w-none
            ${isDark ? "prose-invert" : ""}
            
            [&_h2]:text-lg [&_h2]:font-black [&_h2]:mt-8 [&_h2]:mb-4
            ${isDark ? "[&_h2]:text-slate-100" : "[&_h2]:text-gray-900"}
            
            [&_h3]:text-base [&_h3]:font-bold [&_h3]:mt-6 [&_h3]:mb-3
            ${isDark ? "[&_h3]:text-slate-100" : "[&_h3]:text-gray-900"}
            
            [&_p]:text-sm [&_p]:leading-relaxed [&_p]:mb-4
            ${isDark ? "[&_p]:text-slate-300" : "[&_p]:text-gray-700"}
            
            [&_strong]:font-bold
            ${isDark ? "[&_strong]:text-slate-100" : "[&_strong]:text-gray-900"}
            
            [&_a]:underline
            ${isDark ? "[&_a]:text-amber-400" : "[&_a]:text-green-600"}
            
            [&_blockquote]:border-l-4 [&_blockquote]:pl-4 [&_blockquote]:py-2 [&_blockquote]:my-4 [&_blockquote]:rounded-r-xl
            ${
              isDark
                ? "[&_blockquote]:border-amber-500 [&_blockquote]:bg-slate-800/50"
                : "[&_blockquote]:border-green-500 [&_blockquote]:bg-gray-50"
            }
            
            [&_ul]:my-3 [&_ul]:pl-4 [&_li]:mb-1 [&_li]:text-sm
            ${isDark ? "[&_li]:text-slate-300" : "[&_li]:text-gray-700"}
            
            [&_ol]:my-3 [&_ol]:pl-4
          `}
          dangerouslySetInnerHTML={{ __html: processedContent }}
        />
      </div>

      {/* タグ */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className={`text-xs px-3 py-1.5 rounded-full font-medium ${
                isDark
                  ? "bg-slate-800 text-slate-300"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* ① 記事ミニクイズ — コース進捗に依存しない、誰でも挑戦可能 */}
      {hasQuiz && quizCategoryId && (
        <ArticleQuiz
          articleId={articleId}
          categoryId={quizCategoryId}
          categoryName={categoryName}
        />
      )}

      {/* ② 関連記事 — 同カテゴリの記事を自動表示（SEO内部リンク） */}
      {categoryId && (
        <RelatedArticles
          currentArticleId={articleId}
          categoryId={categoryId}
          categoryName={categoryName}
        />
      )}

      <div className="flex gap-2">
        <Link
          href="/dojo/articles"
          className={`flex-1 py-3 rounded-xl font-bold text-center border transition-colors ${
            isDark
              ? "border-slate-600 text-slate-300 hover:bg-slate-800"
              : "border-gray-200 text-gray-600 hover:bg-gray-50"
          }`}
        >
          他の記事を読む
        </Link>
        <Link
          href="/dojo"
          className={`flex-1 py-3 rounded-xl font-bold text-center ${btnPrimary}`}
        >
          道場トップへ
        </Link>
      </div>
    </div>
  );
}
