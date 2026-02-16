"use client";

import React from "react";
import Link from "next/link";
import { useTheme } from "@/contexts/ThemeContext";

type Props = {
  articleId: string;
  title: string;
  category: string;
  readTime: number;
  content: string;
  relatedQuiz?: string;
};

export default function ArticleDetailClient({ articleId, title, category, readTime, content, relatedQuiz }: Props) {
  const { isDark } = useTheme();

  const cardBg = isDark ? "bg-slate-900 border-slate-700" : "bg-white border-gray-200";
  const textPrimary = isDark ? "text-slate-100" : "text-gray-900";
  const textSecondary = isDark ? "text-slate-400" : "text-gray-500";
  const textMuted = isDark ? "text-slate-500" : "text-gray-400";
  const accentColor = isDark ? "text-amber-400" : "text-green-600";
  const btnPrimary = isDark ? "bg-amber-500 hover:bg-amber-400 text-slate-900" : "bg-green-600 hover:bg-green-700 text-white";

  // 簡易Markdownパーサー
  const renderContent = (text: string) => {
    const lines = text.trim().split("\n");
    const elements: React.ReactNode[] = [];
    let inTable = false;
    let tableRows: string[][] = [];

    lines.forEach((line, i) => {
      // 見出し
      if (line.startsWith("## ")) {
        elements.push(
          <h2 key={i} className={`text-lg font-black mt-6 mb-3 ${textPrimary}`}>
            {line.replace("## ", "")}
          </h2>
        );
      } else if (line.startsWith("### ")) {
        elements.push(
          <h3 key={i} className={`text-base font-bold mt-4 mb-2 ${textPrimary}`}>
            {line.replace("### ", "")}
          </h3>
        );
      }
      // リスト
      else if (line.startsWith("- **")) {
        const match = line.match(/- \*\*(.+?)\*\*: (.+)/);
        if (match) {
          elements.push(
            <div key={i} className={`flex gap-2 mb-2 ${textSecondary}`}>
              <span className={accentColor}>•</span>
              <span><strong className={textPrimary}>{match[1]}</strong>: {match[2]}</span>
            </div>
          );
        }
      } else if (line.startsWith("- ")) {
        elements.push(
          <div key={i} className={`flex gap-2 mb-1 ${textSecondary}`}>
            <span className={accentColor}>•</span>
            <span>{line.replace("- ", "")}</span>
          </div>
        );
      }
      // 番号リスト
      else if (/^\d+\. \*\*/.test(line)) {
        const match = line.match(/(\d+)\. \*\*(.+?)\*\* - (.+)/);
        if (match) {
          elements.push(
            <div key={i} className={`flex gap-2 mb-2 ${textSecondary}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isDark ? "bg-amber-500/20 text-amber-400" : "bg-green-100 text-green-700"}`}>
                {match[1]}
              </span>
              <span><strong className={textPrimary}>{match[2]}</strong> - {match[3]}</span>
            </div>
          );
        }
      }
      // テーブル
      else if (line.startsWith("|")) {
        if (!inTable) {
          inTable = true;
          tableRows = [];
        }
        if (!line.includes("---")) {
          tableRows.push(line.split("|").filter(Boolean).map(s => s.trim()));
        }
      } else if (inTable && !line.startsWith("|")) {
        inTable = false;
        if (tableRows.length > 0) {
          elements.push(
            <div key={`table-${i}`} className={`overflow-x-auto my-4 rounded-xl border ${isDark ? "border-slate-700" : "border-gray-200"}`}>
              <table className="w-full text-sm">
                <thead className={isDark ? "bg-slate-800" : "bg-gray-50"}>
                  <tr>
                    {tableRows[0].map((cell, ci) => (
                      <th key={ci} className={`px-4 py-2 text-left font-bold ${textPrimary}`}>{cell}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableRows.slice(1).map((row, ri) => (
                    <tr key={ri} className={isDark ? "border-t border-slate-700" : "border-t border-gray-100"}>
                      {row.map((cell, ci) => (
                        <td key={ci} className={`px-4 py-2 ${textSecondary}`}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
      }
      // 通常段落
      else if (line.trim() && !line.startsWith("|")) {
        elements.push(
          <p key={i} className={`mb-3 leading-relaxed ${textSecondary}`}>
            {line}
          </p>
        );
      }
    });

    return elements;
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Link href="/dojo/articles" className={`text-sm ${textMuted}`}>← 記事一覧に戻る</Link>

      <div className={`rounded-2xl border p-6 ${cardBg}`}>
        <div className="flex items-center gap-2 mb-3">
          <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? "bg-slate-700 text-slate-300" : "bg-gray-100 text-gray-600"}`}>
            {category}
          </span>
          <span className={`text-xs ${textMuted}`}>📖 {readTime}分で読める</span>
        </div>
        <h1 className={`text-xl font-black mb-6 ${textPrimary}`}>{title}</h1>

        <div className="article-content">
          {renderContent(content)}
        </div>
      </div>

      {/* 関連クイズCTA */}
      {relatedQuiz && (
        <div className={`rounded-2xl border p-5 ${isDark ? "bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/30" : "bg-gradient-to-br from-green-50 to-emerald-50 border-green-200"}`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className={`font-bold ${textPrimary}`}>🧠 理解度をチェック！</h3>
              <p className={`text-sm ${textSecondary}`}>この記事に関連するクイズに挑戦</p>
            </div>
            <Link href={`/dojo/quiz/${relatedQuiz}`} className={`px-4 py-2 rounded-xl font-bold text-sm ${btnPrimary}`}>
              クイズに挑戦 →
            </Link>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <Link href="/dojo/articles" className={`flex-1 py-3 rounded-xl font-bold text-center border transition-colors ${isDark ? "border-slate-600 text-slate-300 hover:bg-slate-800" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
          他の記事を読む
        </Link>
        <Link href="/dojo" className={`flex-1 py-3 rounded-xl font-bold text-center ${btnPrimary}`}>
          道場トップへ
        </Link>
      </div>
    </div>
  );
}
