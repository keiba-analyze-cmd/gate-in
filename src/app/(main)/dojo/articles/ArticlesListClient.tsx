"use client";

import { useState } from "react";
import Link from "next/link";
import { useTheme } from "@/contexts/ThemeContext";

const CATEGORIES = ["すべて", "入門", "馬券", "分析", "血統", "データ"];

const ARTICLES = [
  { id: "1", title: "初心者必見！競馬の基本ルール", category: "入門", readTime: 5, thumbnail: "📖", excerpt: "競馬を始めるなら、まずはルールを理解しましょう。馬券の買い方からレースの見方まで。" },
  { id: "2", title: "馬券の種類と買い方完全ガイド", category: "馬券", readTime: 8, thumbnail: "🎫", excerpt: "単勝・複勝から三連単まで、全ての馬券の種類と特徴を解説。" },
  { id: "3", title: "コース特性を理解して的中率UP", category: "分析", readTime: 6, thumbnail: "📊", excerpt: "東京・中山・阪神など主要競馬場のコース特性と攻略法。" },
  { id: "4", title: "血統から予想する方法", category: "血統", readTime: 10, thumbnail: "🧬", excerpt: "サンデーサイレンス系、ディープインパクト産駒など血統の基礎知識。" },
  { id: "5", title: "オッズの見方と人気馬の取捨", category: "馬券", readTime: 7, thumbnail: "💰", excerpt: "オッズから期待値を読み解き、本命・穴馬を見極める方法。" },
  { id: "6", title: "パドックで馬の状態を見抜く", category: "分析", readTime: 5, thumbnail: "👀", excerpt: "パドックでチェックすべきポイントと馬体の見方を解説。" },
  { id: "7", title: "データ派のための指数活用術", category: "データ", readTime: 12, thumbnail: "🔢", excerpt: "スピード指数・上がり指数の見方と活用方法。" },
  { id: "8", title: "重馬場・不良馬場の攻略法", category: "分析", readTime: 6, thumbnail: "🌧️", excerpt: "馬場状態が予想に与える影響と得意馬の見つけ方。" },
];

export default function ArticlesListClient() {
  const { isDark } = useTheme();
  const [selectedCategory, setSelectedCategory] = useState("すべて");

  const filteredArticles = selectedCategory === "すべて"
    ? ARTICLES
    : ARTICLES.filter(a => a.category === selectedCategory);

  const cardBg = isDark ? "bg-slate-900 border-slate-700" : "bg-white border-gray-200";
  const textPrimary = isDark ? "text-slate-100" : "text-gray-900";
  const textSecondary = isDark ? "text-slate-400" : "text-gray-500";
  const textMuted = isDark ? "text-slate-500" : "text-gray-400";
  const chipActive = isDark ? "bg-amber-500 text-slate-900" : "bg-green-600 text-white";
  const chipInactive = isDark ? "bg-slate-800 text-slate-300 border-slate-700" : "bg-white text-gray-600 border-gray-200";

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className={`text-xl font-black ${textPrimary}`}>📰 学習記事</h1>
        <Link href="/dojo" className={`text-sm ${textMuted}`}>← 道場に戻る</Link>
      </div>

      {/* カテゴリフィルター */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap border transition-all ${
              selectedCategory === cat ? chipActive : chipInactive
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* 記事一覧 */}
      <div className={`rounded-2xl border overflow-hidden ${cardBg}`}>
        {filteredArticles.map((article, index) => (
          <Link
            key={article.id}
            href={`/dojo/articles/${article.id}`}
            className={`flex gap-4 p-4 transition-colors ${
              index !== filteredArticles.length - 1 ? `border-b ${isDark ? "border-slate-700" : "border-gray-100"}` : ""
            } ${isDark ? "hover:bg-slate-800" : "hover:bg-gray-50"}`}
          >
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl shrink-0 ${isDark ? "bg-slate-800" : "bg-gray-100"}`}>
              {article.thumbnail}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className={`font-bold text-sm mb-1 ${textPrimary}`}>{article.title}</h3>
              <p className={`text-xs line-clamp-2 mb-2 ${textMuted}`}>{article.excerpt}</p>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? "bg-slate-700 text-slate-300" : "bg-gray-100 text-gray-600"}`}>
                  {article.category}
                </span>
                <span className={`text-xs ${textMuted}`}>📖 {article.readTime}分</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {filteredArticles.length === 0 && (
        <div className={`text-center py-8 ${textMuted}`}>
          このカテゴリの記事はまだありません
        </div>
      )}
    </div>
  );
}
