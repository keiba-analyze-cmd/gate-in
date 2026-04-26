"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

type AIColumn = {
  id: string;
  predictor_id: string;
  title: string;
  body: string;
  column_type: "preview" | "review";
  target_date: string;
  published_at: string;
};

type Predictor = {
  id: string;
  name: string;
  type: string;
  color: string;
};

const PREDICTOR_INFO: Record<string, Predictor> = {
  hayate: { id: "hayate", name: "ハヤテ", type: "データ分析", color: "#1E40AF" },
  kazan: { id: "kazan", name: "カザン", type: "穴馬予測", color: "#DC2626" },
  hakusen: { id: "hakusen", name: "ハクセン", type: "血統分析", color: "#059669" },
  hibari: { id: "hibari", name: "ヒバリ", type: "当日データ", color: "#D97706" },
  gantetsu: { id: "gantetsu", name: "ガンテツ", type: "軸馬特化", color: "#475569" },
};

const TYPE_LABELS = {
  preview: { label: "プレビュー", icon: "🔮", bg: "bg-indigo-50 dark:bg-indigo-950", text: "text-indigo-700 dark:text-indigo-300" },
  review: { label: "振り返り", icon: "📝", bg: "bg-amber-50 dark:bg-amber-950", text: "text-amber-700 dark:text-amber-300" },
};

// ─── コンパクトカード（トップ・一覧用）──────────────────
export function AIColumnCard({ column }: { column: AIColumn }) {
  const predictor = PREDICTOR_INFO[column.predictor_id];
  const typeInfo = TYPE_LABELS[column.column_type];
  const previewText = column.body.replace(/[#*\n]/g, " ").trim().slice(0, 120);

  return (
    <Link
      href={`/predictors/${column.predictor_id}?tab=columns`}
      className="block bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden hover:shadow-lg transition-shadow"
    >
      {/* ヘッダー帯 */}
      <div
        className="px-4 py-2.5 flex items-center gap-3"
        style={{ backgroundColor: predictor?.color + "15" }}
      >
        <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100 shrink-0">
          <Image
            src={`/images/predictors/${column.predictor_id}.png`}
            alt={predictor?.name || ""}
            width={32}
            height={32}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-gray-900 dark:text-gray-100">
              {predictor?.name}
            </span>
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ color: predictor?.color, backgroundColor: predictor?.color + "20" }}
            >
              {predictor?.type}
            </span>
          </div>
        </div>
        <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${typeInfo.bg} ${typeInfo.text}`}>
          {typeInfo.icon} {typeInfo.label}
        </span>
      </div>

      {/* 本文プレビュー */}
      <div className="px-4 py-3">
        <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100 mb-1 line-clamp-1">
          {column.title}
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
          {previewText}…
        </p>
        <div className="flex items-center justify-between mt-2">
          <span className="text-[10px] text-gray-400">
            {new Date(column.target_date).toLocaleDateString("ja-JP", {
              month: "short",
              day: "numeric",
              weekday: "short",
            })}
          </span>
          <span className="text-[10px] text-gray-400 flex items-center gap-1">
            続きを読む →
          </span>
        </div>
      </div>
    </Link>
  );
}

// ─── フル表示カード（詳細ページ用）─────────────────────
export function AIColumnFull({ column }: { column: AIColumn }) {
  const predictor = PREDICTOR_INFO[column.predictor_id];
  const typeInfo = TYPE_LABELS[column.column_type];

  // 簡易マークダウン→HTML変換
  const renderBody = (text: string) => {
    return text.split("\n").map((line, i) => {
      if (line.startsWith("## ")) {
        return (
          <h3 key={i} className="font-black text-base text-gray-900 dark:text-gray-100 mt-4 mb-2">
            {line.replace("## ", "")}
          </h3>
        );
      }
      if (line.startsWith("### ")) {
        return (
          <h4 key={i} className="font-bold text-sm text-gray-800 dark:text-gray-200 mt-3 mb-1">
            {line.replace("### ", "")}
          </h4>
        );
      }
      if (line.startsWith("- ")) {
        return (
          <li key={i} className="text-sm text-gray-700 dark:text-gray-300 ml-4 mb-1">
            {line.replace("- ", "")}
          </li>
        );
      }
      if (line.trim() === "") {
        return <div key={i} className="h-2" />;
      }
      // 太字 **text**
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      return (
        <p key={i} className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-1">
          {parts.map((part, j) => {
            if (part.startsWith("**") && part.endsWith("**")) {
              return (
                <strong key={j} className="font-bold text-gray-900 dark:text-gray-100">
                  {part.slice(2, -2)}
                </strong>
              );
            }
            return part;
          })}
        </p>
      );
    });
  };

  return (
    <article className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden">
      {/* ヘッダー */}
      <div
        className="px-5 py-4 flex items-center gap-3"
        style={{ backgroundColor: predictor?.color + "12" }}
      >
        <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 shrink-0">
          <Image
            src={`/images/predictors/${column.predictor_id}.png`}
            alt={predictor?.name || ""}
            width={40}
            height={40}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-black text-gray-900 dark:text-gray-100">
              {predictor?.name}
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${typeInfo.bg} ${typeInfo.text}`}>
              {typeInfo.icon} {typeInfo.label}
            </span>
          </div>
          <span className="text-xs text-gray-500">
            {new Date(column.target_date).toLocaleDateString("ja-JP", {
              year: "numeric",
              month: "long",
              day: "numeric",
              weekday: "long",
            })}
          </span>
        </div>
      </div>

      {/* タイトル */}
      <div className="px-5 pt-4 pb-2">
        <h2 className="text-lg font-black text-gray-900 dark:text-gray-100">
          {column.title}
        </h2>
      </div>

      {/* 本文 */}
      <div className="px-5 pb-5">
        {renderBody(column.body)}
      </div>

      {/* フッター */}
      <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
        <span className="text-[10px] text-gray-400">
          {new Date(column.published_at).toLocaleString("ja-JP", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
          に公開
        </span>
        <Link
          href={`/predictors/${column.predictor_id}`}
          className="text-xs font-bold"
          style={{ color: predictor?.color }}
        >
          {predictor?.name}のプロフィール →
        </Link>
      </div>
    </article>
  );
}

// ─── コラム一覧セクション（トップページ用）─────────────
export function AIColumnSection({ columns }: { columns: AIColumn[] }) {
  if (columns.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-black text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <span>📰</span>
          AIコラム
        </h2>
        <Link
          href="/predictors"
          className="text-xs font-bold text-green-600 dark:text-green-400"
        >
          すべて見る →
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {columns.slice(0, 4).map((column) => (
          <AIColumnCard key={column.id} column={column} />
        ))}
      </div>
    </section>
  );
}
