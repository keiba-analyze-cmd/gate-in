"use client";

import { useState } from "react";
import Link from "next/link";
import { useTheme } from "@/contexts/ThemeContext";

type Question = {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

type Props = {
  userId: string;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  questions: Question[];
};

export default function CategoryQuizClient({
  userId,
  categoryId,
  categoryName,
  categoryIcon,
  questions,
}: Props) {
  const { isDark } = useTheme();

  const [started, setStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  const cardBg = isDark
    ? "bg-slate-900 border-slate-700"
    : "bg-white border-gray-200";
  const textPrimary = isDark ? "text-slate-100" : "text-gray-900";
  const textSecondary = isDark ? "text-slate-400" : "text-gray-500";
  const textMuted = isDark ? "text-slate-500" : "text-gray-400";
  const accentColor = isDark ? "text-amber-400" : "text-green-600";
  const btnPrimary = isDark
    ? "bg-amber-500 hover:bg-amber-400 text-slate-900"
    : "bg-green-600 hover:bg-green-700 text-white";

  const currentQuestion = questions[currentIndex];

  const handleAnswer = (index: number) => {
    if (isAnswered) return;
    setSelectedAnswer(index);
    setIsAnswered(true);
    if (index === currentQuestion.correctIndex) {
      setCorrectCount(correctCount + 1);
    }
  };

  const handleNext = () => {
    if (currentIndex + 1 >= questions.length) {
      setIsFinished(true);
    } else {
      setCurrentIndex(currentIndex + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
    }
  };

  const getOptionStyle = (index: number) => {
    if (!isAnswered) {
      return isDark
        ? "bg-slate-800 border-slate-600 hover:border-amber-500/50"
        : "bg-gray-50 border-gray-200 hover:border-green-300";
    }
    if (index === currentQuestion.correctIndex) {
      return isDark
        ? "bg-green-500/20 border-green-500"
        : "bg-green-100 border-green-500";
    }
    if (index === selectedAnswer) {
      return isDark
        ? "bg-red-500/20 border-red-500"
        : "bg-red-100 border-red-500";
    }
    return isDark
      ? "bg-slate-800 border-slate-700 opacity-50"
      : "bg-gray-50 border-gray-200 opacity-50";
  };

  // 問題が0件の場合
  if (questions.length === 0) {
    return (
      <div className="max-w-lg mx-auto space-y-4">
        <Link href="/dojo" className={`text-sm ${textMuted}`}>
          ← 道場に戻る
        </Link>
        <div className={`rounded-2xl border p-6 text-center ${cardBg}`}>
          <div className="text-5xl mb-4">{categoryIcon}</div>
          <h1 className={`text-2xl font-black mb-2 ${textPrimary}`}>
            {categoryName}
          </h1>
          <p className={`text-sm mb-6 ${textSecondary}`}>
            問題を準備中です...しばらくお待ちください。
          </p>
          <Link
            href="/dojo"
            className={`block w-full py-3 rounded-xl font-bold ${btnPrimary}`}
          >
            道場に戻る
          </Link>
        </div>
      </div>
    );
  }

  // 開始前画面
  if (!started) {
    return (
      <div className="max-w-lg mx-auto space-y-4">
        <Link href="/dojo" className={`text-sm ${textMuted}`}>
          ← 道場に戻る
        </Link>
        <div className={`rounded-2xl border p-6 text-center ${cardBg}`}>
          <div className="text-5xl mb-4">{categoryIcon}</div>
          <h1 className={`text-2xl font-black mb-2 ${textPrimary}`}>
            {categoryName}
          </h1>
          <p className={`text-sm mb-6 ${textSecondary}`}>
            全{questions.length}問のクイズに挑戦！
          </p>
          <button
            onClick={() => setStarted(true)}
            className={`w-full py-3 rounded-xl font-bold ${btnPrimary}`}
          >
            🎯 検定スタート
          </button>
        </div>
      </div>
    );
  }

  // 結果画面
  if (isFinished) {
    const percentage = Math.round((correctCount / questions.length) * 100);
    const passed = percentage >= 70;

    return (
      <div className="max-w-lg mx-auto space-y-4">
        <div className={`rounded-2xl border p-6 text-center ${cardBg}`}>
          <div className="text-5xl mb-4">{passed ? "🎉" : "📚"}</div>
          <h1 className={`text-2xl font-black mb-2 ${textPrimary}`}>
            {passed ? "合格！" : "不合格..."}
          </h1>
          <p className={`mb-6 ${textSecondary}`}>
            {correctCount}/{questions.length}問正解（{percentage}%）
          </p>
          {passed && (
            <div
              className={`p-4 rounded-xl mb-4 ${
                isDark ? "bg-amber-500/20" : "bg-yellow-50"
              }`}
            >
              <span className="text-2xl">🏅</span>
              <p className={`text-sm font-bold mt-1 ${accentColor}`}>
                「{categoryName}マスター」獲得！
              </p>
            </div>
          )}
          <div className="space-y-2">
            <button
              onClick={() => {
                setStarted(false);
                setCurrentIndex(0);
                setCorrectCount(0);
                setIsFinished(false);
              }}
              className={`w-full py-3 rounded-xl font-bold ${btnPrimary}`}
            >
              もう一度挑戦
            </button>
            <Link
              href="/dojo"
              className={`block w-full py-3 rounded-xl font-bold border ${
                isDark
                  ? "border-slate-600 text-slate-300"
                  : "border-gray-200 text-gray-600"
              }`}
            >
              道場に戻る
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // クイズ画面
  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <Link href="/dojo" className={`text-sm ${textMuted}`}>
          ← 道場に戻る
        </Link>
        <span className={`text-sm font-bold ${textPrimary}`}>
          {categoryIcon} {categoryName}
        </span>
      </div>

      <div
        className={`rounded-xl p-3 ${isDark ? "bg-slate-800" : "bg-gray-100"}`}
      >
        <div className="flex justify-between text-xs mb-2">
          <span className={textSecondary}>
            問題 {currentIndex + 1}/{questions.length}
          </span>
          <span className={accentColor}>正解: {correctCount}</span>
        </div>
        <div
          className={`h-2 rounded-full ${
            isDark ? "bg-slate-700" : "bg-gray-200"
          }`}
        >
          <div
            className={`h-full rounded-full transition-all ${
              isDark ? "bg-amber-500" : "bg-green-500"
            }`}
            style={{
              width: `${((currentIndex + 1) / questions.length) * 100}%`,
            }}
          />
        </div>
      </div>

      <div className={`rounded-2xl border p-5 ${cardBg}`}>
        <h2 className={`text-lg font-bold mb-6 ${textPrimary}`}>
          {currentQuestion.question}
        </h2>
        <div className="space-y-3">
          {currentQuestion.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => handleAnswer(i)}
              disabled={isAnswered}
              className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${getOptionStyle(
                i
              )}`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                    isDark ? "bg-slate-700" : "bg-gray-200"
                  }`}
                >
                  {String.fromCharCode(65 + i)}
                </span>
                <span className={textPrimary}>{opt}</span>
                {isAnswered && i === currentQuestion.correctIndex && (
                  <span className="ml-auto">✅</span>
                )}
                {isAnswered &&
                  i === selectedAnswer &&
                  i !== currentQuestion.correctIndex && (
                    <span className="ml-auto">❌</span>
                  )}
              </div>
            </button>
          ))}
        </div>

        {/* 解説（MicroCMSリッチエディタのHTMLを表示） */}
        {isAnswered && currentQuestion.explanation && (
          <div
            className={`mt-4 p-4 rounded-xl ${
              isDark ? "bg-slate-800" : "bg-blue-50"
            }`}
          >
            <div
              className={`text-sm leading-relaxed ${
                isDark ? "text-slate-300" : "text-gray-700"
              } [&_strong]:font-bold [&_a]:underline ${
                isDark ? "[&_a]:text-amber-400" : "[&_a]:text-green-600"
              }`}
              dangerouslySetInnerHTML={{
                __html: currentQuestion.explanation,
              }}
            />
          </div>
        )}
      </div>

      {isAnswered && (
        <button
          onClick={handleNext}
          className={`w-full py-3 rounded-xl font-bold ${btnPrimary}`}
        >
          {currentIndex + 1 >= questions.length
            ? "結果を見る"
            : "次の問題へ →"}
        </button>
      )}
    </div>
  );
}
