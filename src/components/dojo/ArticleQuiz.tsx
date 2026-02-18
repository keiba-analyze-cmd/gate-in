"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useTheme } from "@/contexts/ThemeContext";

type QuizQuestion = {
  id: string;
  question: string;
  choice1: string;
  choice2: string;
  choice3: string;
  choice4: string;
  correctIndex: number;
  explanation: string;
  level: string[];
};

type Props = {
  articleId: string;
  categoryId: string;
  categoryName: string;
};

type Phase = "loading" | "ready" | "answering" | "result" | "empty";

export default function ArticleQuiz({
  articleId,
  categoryId,
  categoryName,
}: Props) {
  const { isDark } = useTheme();
  const [phase, setPhase] = useState<Phase>("loading");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);

  // クイズ取得
  useEffect(() => {
    async function fetchQuizzes() {
      try {
        const res = await fetch(
          `/api/article-quiz?articleId=${articleId}&categoryId=${categoryId}&limit=5`
        );
        const data = await res.json();
        if (data.quizzes && data.quizzes.length > 0) {
          setQuestions(data.quizzes);
          setAnswers(new Array(data.quizzes.length).fill(null));
          setPhase("ready");
        } else {
          setPhase("empty");
        }
      } catch {
        setPhase("empty");
      }
    }
    fetchQuizzes();
  }, [articleId, categoryId]);

  const currentQ = questions[currentIdx];

  const handleSelect = useCallback(
    (choiceIdx: number) => {
      if (isRevealed) return;
      setSelectedAnswer(choiceIdx);
    },
    [isRevealed]
  );

  const handleConfirm = useCallback(() => {
    if (selectedAnswer === null) return;
    setIsRevealed(true);
    const isCorrect = selectedAnswer === currentQ.correctIndex;
    if (isCorrect) setCorrectCount((prev) => prev + 1);
    setAnswers((prev) => {
      const next = [...prev];
      next[currentIdx] = selectedAnswer;
      return next;
    });
  }, [selectedAnswer, currentQ, currentIdx]);

  const handleNext = useCallback(() => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx((prev) => prev + 1);
      setSelectedAnswer(null);
      setIsRevealed(false);
    } else {
      setPhase("result");
    }
  }, [currentIdx, questions.length]);

  const handleRetry = useCallback(() => {
    setCurrentIdx(0);
    setSelectedAnswer(null);
    setIsRevealed(false);
    setCorrectCount(0);
    setAnswers(new Array(questions.length).fill(null));
    setPhase("ready");
  }, [questions.length]);

  const handleStart = useCallback(() => {
    setPhase("answering");
  }, []);

  // スタイル
  const cardBg = isDark
    ? "bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/30"
    : "bg-gradient-to-br from-green-50 to-emerald-50 border-green-200";
  const textPrimary = isDark ? "text-slate-100" : "text-gray-900";
  const textSecondary = isDark ? "text-slate-400" : "text-gray-500";
  const btnPrimary = isDark
    ? "bg-amber-500 hover:bg-amber-400 text-slate-900"
    : "bg-green-600 hover:bg-green-700 text-white";

  // ---------- empty (クイズなし → 道場誘導CTA) ----------
  if (phase === "empty") {
    return (
      <div className={`rounded-2xl border p-5 ${cardBg}`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className={`font-bold ${textPrimary}`}>
              🧠 もっと学びたい？
            </h3>
            <p className={`text-sm ${textSecondary} mt-1`}>
              道場コースでクイズに挑戦して理解を深めよう
            </p>
          </div>
          <Link
            href="/dojo"
            className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${btnPrimary}`}
          >
            道場へ →
          </Link>
        </div>
      </div>
    );
  }
  if (phase === "loading") {
      return (
        <div className={`rounded-2xl border p-5 ${cardBg}`}>
          <div className="flex items-center gap-2">
            <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
            <span className={`text-sm ${textSecondary}`}>
              クイズを読み込み中...
            </span>
          </div>
        </div>
      );
  }

  // ---------- ready (開始前) ----------
  if (phase === "ready") {
    return (
      <div className={`rounded-2xl border p-5 ${cardBg}`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className={`font-bold ${textPrimary}`}>
              🧠 理解度チェック！
            </h3>
            <p className={`text-sm ${textSecondary} mt-1`}>
              この記事の内容からランダム{questions.length}問
            </p>
          </div>
          <button
            onClick={handleStart}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${btnPrimary}`}
          >
            挑戦する →
          </button>
        </div>
      </div>
    );
  }

  // ---------- result ----------
  if (phase === "result") {
    const score = Math.round((correctCount / questions.length) * 100);
    const emoji = score >= 80 ? "🎉" : score >= 60 ? "👍" : "📚";
    const message =
      score >= 80
        ? "素晴らしい！よく理解できています"
        : score >= 60
        ? "いい調子！もう少しで完璧です"
        : "もう一度記事を読んで再挑戦してみましょう";

    return (
      <div className={`rounded-2xl border p-6 ${cardBg}`}>
        <div className="text-center mb-4">
          <div className="text-4xl mb-2">{emoji}</div>
          <h3 className={`text-lg font-black ${textPrimary}`}>
            {correctCount}/{questions.length}問正解（{score}%）
          </h3>
          <p className={`text-sm ${textSecondary} mt-1`}>{message}</p>
        </div>

        {/* 問題ごとの結果 */}
        <div className="flex justify-center gap-2 mb-5">
          {questions.map((q, i) => {
            const isCorrect = answers[i] === q.correctIndex;
            return (
              <div
                key={q.id}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  isCorrect
                    ? isDark
                      ? "bg-green-500/20 text-green-400 border border-green-500/40"
                      : "bg-green-100 text-green-700 border border-green-300"
                    : isDark
                    ? "bg-red-500/20 text-red-400 border border-red-500/40"
                    : "bg-red-100 text-red-700 border border-red-300"
                }`}
              >
                {isCorrect ? "○" : "×"}
              </div>
            );
          })}
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleRetry}
            className={`flex-1 py-2.5 rounded-xl font-bold text-sm border transition-colors ${
              isDark
                ? "border-slate-600 text-slate-300 hover:bg-slate-800"
                : "border-gray-300 text-gray-600 hover:bg-gray-50"
            }`}
          >
            もう一度挑戦
          </button>
          <Link
            href="/dojo"
            className={`flex-1 py-2.5 rounded-xl font-bold text-sm text-center transition-all ${btnPrimary}`}
          >
            道場でもっと学ぶ →
          </Link>
        </div>
      </div>
    );
  }

  // ---------- answering ----------
  const choices = [
    currentQ.choice1,
    currentQ.choice2,
    currentQ.choice3,
    currentQ.choice4,
  ].filter(Boolean);

  return (
    <div className={`rounded-2xl border p-5 ${cardBg}`}>
      {/* プログレス */}
      <div className="flex items-center justify-between mb-4">
        <span className={`text-xs font-bold ${textSecondary}`}>
          🧠 理解度チェック
        </span>
        <span className={`text-xs font-mono ${textSecondary}`}>
          {currentIdx + 1} / {questions.length}
        </span>
      </div>

      {/* プログレスバー */}
      <div
        className={`w-full h-1.5 rounded-full mb-4 ${
          isDark ? "bg-slate-700" : "bg-gray-200"
        }`}
      >
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            isDark ? "bg-amber-500" : "bg-green-500"
          }`}
          style={{
            width: `${((currentIdx + (isRevealed ? 1 : 0)) / questions.length) * 100}%`,
          }}
        />
      </div>

      {/* 問題文 */}
      <p className={`text-sm font-bold leading-relaxed mb-4 ${textPrimary}`}>
        {currentQ.question}
      </p>

      {/* 選択肢 */}
      <div className="space-y-2 mb-4">
        {choices.map((choice, idx) => {
          const choiceIdx = idx + 1;
          const isSelected = selectedAnswer === choiceIdx;
          const isCorrect = choiceIdx === currentQ.correctIndex;

          let choiceStyle = "";
          if (isRevealed) {
            if (isCorrect) {
              choiceStyle = isDark
                ? "border-green-500 bg-green-500/15 text-green-300"
                : "border-green-500 bg-green-50 text-green-800";
            } else if (isSelected && !isCorrect) {
              choiceStyle = isDark
                ? "border-red-500 bg-red-500/15 text-red-300"
                : "border-red-500 bg-red-50 text-red-800";
            } else {
              choiceStyle = isDark
                ? "border-slate-700 text-slate-500 opacity-50"
                : "border-gray-200 text-gray-400 opacity-50";
            }
          } else if (isSelected) {
            choiceStyle = isDark
              ? "border-amber-500 bg-amber-500/10 text-slate-100"
              : "border-green-500 bg-green-50 text-gray-900";
          } else {
            choiceStyle = isDark
              ? "border-slate-600 text-slate-300 hover:border-amber-500/50 hover:bg-slate-800/50"
              : "border-gray-200 text-gray-700 hover:border-green-300 hover:bg-gray-50";
          }

          return (
            <button
              key={idx}
              onClick={() => handleSelect(choiceIdx)}
              disabled={isRevealed}
              className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all ${choiceStyle}`}
            >
              <span className="font-bold mr-2 opacity-50">
                {String.fromCharCode(65 + idx)}.
              </span>
              {choice}
              {isRevealed && isCorrect && (
                <span className="ml-2">✓</span>
              )}
              {isRevealed && isSelected && !isCorrect && (
                <span className="ml-2">✗</span>
              )}
            </button>
          );
        })}
      </div>

      {/* 解説 */}
      {isRevealed && currentQ.explanation && (
        <div
          className={`rounded-xl p-3 mb-4 text-xs leading-relaxed ${
            isDark
              ? "bg-slate-800/80 text-slate-300 border border-slate-700"
              : "bg-white text-gray-600 border border-gray-200"
          }`}
        >
          <span className="font-bold">💡 解説: </span>
          <span
            dangerouslySetInnerHTML={{
              __html: currentQ.explanation.replace(/<\/?p>/g, ""),
            }}
          />
        </div>
      )}

      {/* ボタン */}
      {!isRevealed ? (
        <button
          onClick={handleConfirm}
          disabled={selectedAnswer === null}
          className={`w-full py-2.5 rounded-xl font-bold text-sm transition-all ${
            selectedAnswer !== null
              ? btnPrimary
              : isDark
              ? "bg-slate-700 text-slate-500 cursor-not-allowed"
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
          }`}
        >
          回答する
        </button>
      ) : (
        <button
          onClick={handleNext}
          className={`w-full py-2.5 rounded-xl font-bold text-sm transition-all ${btnPrimary}`}
        >
          {currentIdx < questions.length - 1 ? "次の問題 →" : "結果を見る →"}
        </button>
      )}
    </div>
  );
}
