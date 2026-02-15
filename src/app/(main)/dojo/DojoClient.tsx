"use client";

import { useState } from "react";
import Link from "next/link";
import { useTheme } from "@/contexts/ThemeContext";

type Props = {
  userId: string;
};

// 仮のカテゴリデータ
const QUIZ_CATEGORIES = [
  { id: "basics", name: "競馬の基礎", icon: "📚", description: "初心者向け基本知識", questionCount: 20, difficulty: "初級" },
  { id: "jockeys", name: "騎手", icon: "🏇", description: "騎手に関する問題", questionCount: 15, difficulty: "中級" },
  { id: "trainers", name: "調教師", icon: "👨‍🏫", description: "調教師に関する問題", questionCount: 15, difficulty: "中級" },
  { id: "courses", name: "競馬場", icon: "🏟️", description: "コースの特徴など", questionCount: 12, difficulty: "中級" },
  { id: "history", name: "競馬の歴史", icon: "📜", description: "名馬・名レースの歴史", questionCount: 25, difficulty: "上級" },
  { id: "betting", name: "馬券の種類", icon: "🎫", description: "馬券の買い方と配当", questionCount: 10, difficulty: "初級" },
];

// 仮の記事データ
const ARTICLES = [
  { id: "1", title: "初心者必見！競馬の基本ルール", category: "入門", readTime: 5, thumbnail: "📖" },
  { id: "2", title: "馬券の種類と買い方完全ガイド", category: "馬券", readTime: 8, thumbnail: "🎫" },
  { id: "3", title: "コース特性を理解して的中率UP", category: "分析", readTime: 6, thumbnail: "📊" },
  { id: "4", title: "血統から予想する方法", category: "血統", readTime: 10, thumbnail: "🧬" },
];

export default function DojoClient({ userId }: Props) {
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<"quiz" | "articles">("quiz");

  const cardBg = isDark ? "bg-slate-900 border-slate-700" : "bg-white border-gray-200";
  const textPrimary = isDark ? "text-slate-100" : "text-gray-900";
  const textSecondary = isDark ? "text-slate-400" : "text-gray-500";
  const textMuted = isDark ? "text-slate-500" : "text-gray-400";
  const tabActive = isDark ? "bg-amber-500 text-slate-900" : "bg-green-600 text-white";
  const tabInactive = isDark
    ? "bg-slate-800 text-slate-300 border border-slate-700 hover:border-amber-500/50"
    : "bg-white text-gray-600 border border-gray-200 hover:border-green-300";
  const accentColor = isDark ? "text-amber-400" : "text-green-600";
  const highlightBg = isDark ? "bg-gradient-to-br from-amber-500/20 to-orange-500/20 border-amber-500/30" : "bg-gradient-to-br from-green-50 to-emerald-50 border-green-200";

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h1 className={`text-xl font-black ${textPrimary}`}>📚 競馬道場</h1>
        <Link
          href="/dojo/my-progress"
          className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors ${
            isDark ? "border-amber-500 text-amber-400 hover:bg-amber-500/10" : "border-green-500 text-green-600 hover:bg-green-50"
          }`}
        >
          📊 学習記録
        </Link>
      </div>

      {/* デイリーチャレンジ */}
      <div className={`rounded-2xl border p-5 ${highlightBg}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🔥</span>
            <div>
              <h2 className={`font-black ${textPrimary}`}>今日のチャレンジ</h2>
              <p className={`text-xs ${textSecondary}`}>毎日5問のクイズに挑戦！</p>
            </div>
          </div>
          <div className={`text-right`}>
            <div className={`text-2xl font-black ${accentColor}`}>0/5</div>
            <div className={`text-xs ${textMuted}`}>正解数</div>
          </div>
        </div>
        <Link
          href="/dojo/daily"
          className={`block w-full py-3 rounded-xl font-bold text-center transition-colors ${
            isDark ? "bg-amber-500 text-slate-900 hover:bg-amber-400" : "bg-green-600 text-white hover:bg-green-700"
          }`}
        >
          🎯 チャレンジ開始
        </Link>
        <p className={`text-xs text-center mt-2 ${textMuted}`}>
          正解数に応じてポイント獲得！連続日数でボーナス🎁
        </p>
      </div>

      {/* タブ切り替え */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab("quiz")}
          className={`flex-1 py-2.5 rounded-full text-sm font-bold transition-all ${
            activeTab === "quiz" ? tabActive : tabInactive
          }`}
        >
          🧠 クイズ
        </button>
        <button
          onClick={() => setActiveTab("articles")}
          className={`flex-1 py-2.5 rounded-full text-sm font-bold transition-all ${
            activeTab === "articles" ? tabActive : tabInactive
          }`}
        >
          📰 記事
        </button>
      </div>

      {/* クイズタブ */}
      {activeTab === "quiz" && (
        <div className="space-y-3">
          <p className={`text-sm ${textSecondary}`}>カテゴリを選んで検定に挑戦しよう！</p>
          <div className="grid grid-cols-2 gap-3">
            {QUIZ_CATEGORIES.map((cat) => (
              <Link
                key={cat.id}
                href={`/dojo/quiz/${cat.id}`}
                className={`rounded-2xl border p-4 transition-all hover:shadow-md ${cardBg} ${
                  isDark ? "hover:border-amber-500/50" : "hover:border-green-300"
                }`}
              >
                <div className="text-3xl mb-2">{cat.icon}</div>
                <h3 className={`font-bold text-sm ${textPrimary}`}>{cat.name}</h3>
                <p className={`text-xs mt-1 ${textMuted}`}>{cat.description}</p>
                <div className="flex items-center justify-between mt-3">
                  <span className={`text-xs ${textSecondary}`}>{cat.questionCount}問</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    cat.difficulty === "初級" 
                      ? isDark ? "bg-green-500/20 text-green-400" : "bg-green-100 text-green-700"
                      : cat.difficulty === "中級"
                      ? isDark ? "bg-yellow-500/20 text-yellow-400" : "bg-yellow-100 text-yellow-700"
                      : isDark ? "bg-red-500/20 text-red-400" : "bg-red-100 text-red-700"
                  }`}>
                    {cat.difficulty}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 記事タブ */}
      {activeTab === "articles" && (
        <div className="space-y-3">
          <p className={`text-sm ${textSecondary}`}>競馬の知識を深める記事</p>
          <div className={`rounded-2xl border overflow-hidden ${cardBg}`}>
            {ARTICLES.map((article, index) => (
              <Link
                key={article.id}
                href={`/dojo/articles/${article.id}`}
                className={`flex items-center gap-4 px-5 py-4 transition-colors ${
                  index !== ARTICLES.length - 1 ? `border-b ${isDark ? "border-slate-700" : "border-gray-100"}` : ""
                } ${isDark ? "hover:bg-slate-800" : "hover:bg-gray-50"}`}
              >
                <span className="text-3xl">{article.thumbnail}</span>
                <div className="flex-1 min-w-0">
                  <h3 className={`font-bold text-sm truncate ${textPrimary}`}>{article.title}</h3>
                  <div className={`flex items-center gap-2 mt-1 ${textMuted}`}>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? "bg-slate-700" : "bg-gray-100"}`}>
                      {article.category}
                    </span>
                    <span className="text-xs">📖 {article.readTime}分</span>
                  </div>
                </div>
                <span className={isDark ? "text-slate-500" : "text-gray-400"}>›</span>
              </Link>
            ))}
          </div>
          <Link
            href="/dojo/articles"
            className={`block text-center text-sm font-bold py-3 ${accentColor}`}
          >
            すべての記事を見る →
          </Link>
        </div>
      )}

      {/* 実績セクション */}
      <div className={`rounded-2xl border p-5 ${cardBg}`}>
        <h2 className={`font-bold mb-3 ${textPrimary}`}>🏅 あなたの称号</h2>
        <div className="flex items-center gap-4">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl ${isDark ? "bg-slate-800" : "bg-gray-100"}`}>
            🔰
          </div>
          <div>
            <div className={`font-bold ${textPrimary}`}>競馬初心者</div>
            <div className={`text-xs ${textSecondary}`}>クイズに挑戦して称号をゲットしよう！</div>
            <div className={`text-xs mt-1 ${accentColor}`}>次の称号まで: あと10問正解</div>
          </div>
        </div>
      </div>
    </div>
  );
}
