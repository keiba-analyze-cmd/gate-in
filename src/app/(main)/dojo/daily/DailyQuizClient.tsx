// src/app/(main)/dojo/daily/DailyQuizClient.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "@/contexts/ThemeContext";
import { useDojoXp } from "@/hooks/useDojoXp";
import AchievementPopup from "@/components/dojo/AchievementPopup";

type Question = {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  category: string;
};

type Props = {
  userId: string;
  questions: Question[];
  alreadyCompleted: boolean;
  previousScore: number;
  streak: number;
};

export default function DailyQuizClient({
  userId,
  questions,
  alreadyCompleted,
  previousScore,
  streak,
}: Props) {
  const { isDark } = useTheme();
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15);
  const [isSaving, setIsSaving] = useState(false);
  const { awardXp, achievements, showPopup, closePopup } = useDojoXp();

  const totalQuestions = questions.length;
  const currentQuestion = questions[currentIndex];

  // タイマー
  useEffect(() => {
    if (isAnswered || isFinished || alreadyCompleted) return;
    if (timeLeft <= 0) {
      handleAnswer(-1); // 時間切れ
      return;
    }
    const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, isAnswered, isFinished, alreadyCompleted]);

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
  const btnSecondary = isDark
    ? "border-slate-600 text-slate-300 hover:bg-slate-800"
    : "border-gray-200 text-gray-600 hover:bg-gray-50";

  const handleAnswer = (index: number) => {
    if (isAnswered) return;
    setSelectedAnswer(index);
    setIsAnswered(true);
    if (index === currentQuestion.correctIndex) {
      setCorrectCount((c) => c + 1);
    }
  };

  const handleNext = async () => {
    if (currentIndex + 1 >= totalQuestions) {
      setIsFinished(true);
      // 結果を保存
      setIsSaving(true);
      try {
        await fetch("/api/dojo/daily", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ score: correctCount }),
        });
      } catch (e) {
        console.error("デイリー保存エラー:", e);
      }
      // XP付与
      try {
        await awardXp("daily_complete", { correctCount, total: totalQuestions, streak });
      } catch (e) {
        console.error("XP付与エラー:", e);
      }
      setIsSaving(false);
    } else {
      setCurrentIndex(currentIndex + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
      setTimeLeft(15);
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
        ? "bg-green-500/20 border-green-500 text-green-400"
        : "bg-green-100 border-green-500 text-green-700";
    }
    if (index === selectedAnswer && index !== currentQuestion.correctIndex) {
      return isDark
        ? "bg-red-500/20 border-red-500 text-red-400"
        : "bg-red-100 border-red-500 text-red-700";
    }
    return isDark
      ? "bg-slate-800 border-slate-700 opacity-50"
      : "bg-gray-50 border-gray-200 opacity-50";
  };

  // ── 既に完了済み ──
  if (alreadyCompleted) {
    return (
      <div className="max-w-lg mx-auto space-y-4">
        <Link href="/dojo" className={`text-sm ${textMuted}`}>
          ← 道場に戻る
        </Link>
        <div className={`rounded-2xl border p-6 text-center ${cardBg}`}>
          <div className="text-5xl mb-3">✅</div>
          <h1 className={`text-xl font-black mb-2 ${textPrimary}`}>
            今日のチャレンジは完了済み！
          </h1>
          <p className={`text-sm mb-4 ${textSecondary}`}>
            スコア: {previousScore}/{totalQuestions}問正解
          </p>

          {/* ストリーク */}
          <div
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 ${
              isDark
                ? "bg-amber-500/20 text-amber-400"
                : "bg-orange-100 text-orange-600"
            }`}
          >
            <span>🔥</span>
            <span className="font-bold">{streak}日連続チャレンジ中！</span>
          </div>

          <div className="space-y-2">
            <button
              onClick={() => router.push("/dojo")}
              className={`w-full py-3 rounded-xl font-bold transition-colors ${btnPrimary}`}
            >
              🥋 道場に戻る
            </button>
            <p className={`text-xs ${textMuted}`}>
              明日またチャレンジしてストリークを伸ばそう！
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── 問題0件 ──
  if (questions.length === 0) {
    return (
      <div className="max-w-lg mx-auto space-y-4">
        <Link href="/dojo" className={`text-sm ${textMuted}`}>
          ← 道場に戻る
        </Link>
        <div className={`rounded-2xl border p-6 text-center ${cardBg}`}>
          <div className="text-5xl mb-4">📝</div>
          <h1 className={`text-xl font-black mb-2 ${textPrimary}`}>
            問題を準備中...
          </h1>
          <Link
            href="/dojo"
            className={`block w-full py-3 rounded-xl font-bold text-center ${btnPrimary}`}
          >
            道場に戻る
          </Link>
        </div>
      </div>
    );
  }

  // ── 結果画面 ──
  if (isFinished) {
    const percentage = Math.round((correctCount / totalQuestions) * 100);
    const earnedPoints = correctCount * 10;
    const streakBonus = streak >= 7 ? 20 : streak >= 3 ? 10 : 0;
    const totalPoints = earnedPoints + streakBonus;
    const resultEmoji =
      percentage >= 80
        ? "🎉"
        : percentage >= 60
          ? "👍"
          : percentage >= 40
            ? "💪"
            : "📚";
    const resultMessage =
      percentage >= 80
        ? "素晴らしい！"
        : percentage >= 60
          ? "いい調子！"
          : percentage >= 40
            ? "惜しい！"
            : "また挑戦しよう！";

    return (
      <>
      <div className="max-w-lg mx-auto space-y-4">
        <div className={`rounded-2xl border p-6 text-center ${cardBg}`}>
          <div className="text-6xl mb-4">{resultEmoji}</div>
          <h1 className={`text-2xl font-black mb-2 ${textPrimary}`}>
            {resultMessage}
          </h1>
          <p className={`text-sm mb-4 ${textSecondary}`}>
            今日のチャレンジ完了！
          </p>

          {/* ストリーク */}
          <div
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4 ${
              isDark
                ? "bg-amber-500/20 text-amber-400"
                : "bg-orange-100 text-orange-600"
            }`}
          >
            <span>🔥</span>
            <span className="font-bold">{streak + 1}日連続！</span>
          </div>

          {/* スコア */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div
              className={`p-3 rounded-xl ${
                isDark ? "bg-slate-800" : "bg-gray-50"
              }`}
            >
              <div className={`text-2xl font-black ${accentColor}`}>
                {correctCount}/{totalQuestions}
              </div>
              <div className={`text-xs ${textMuted}`}>正解数</div>
            </div>
            <div
              className={`p-3 rounded-xl ${
                isDark ? "bg-slate-800" : "bg-gray-50"
              }`}
            >
              <div className={`text-2xl font-black ${accentColor}`}>
                {percentage}%
              </div>
              <div className={`text-xs ${textMuted}`}>正解率</div>
            </div>
            <div
              className={`p-3 rounded-xl ${
                isDark ? "bg-slate-800" : "bg-gray-50"
              }`}
            >
              <div className={`text-2xl font-black ${accentColor}`}>
                +{totalPoints}P
              </div>
              <div className={`text-xs ${textMuted}`}>
                {streakBonus > 0
                  ? `(+${streakBonus}ボーナス)`
                  : "獲得ポイント"}
              </div>
            </div>
          </div>

          {isSaving && (
            <p className={`text-xs mb-3 ${textMuted}`}>記録を保存中...</p>
          )}

          <div className="space-y-2">
            <button
              onClick={() => router.push("/dojo")}
              className={`w-full py-3 rounded-xl font-bold transition-colors ${btnPrimary}`}
            >
              🥋 道場に戻る
            </button>
            <Link
              href="/dojo/articles"
              className={`block w-full py-3 rounded-xl font-bold border transition-colors text-center ${btnSecondary}`}
            >
              📖 記事を読んで学ぶ →
            </Link>
          </div>
        </div>
      </div>
      {showPopup && <AchievementPopup achievements={achievements} onClose={closePopup} />}
      </>
    );
  }

  // ── クイズ出題画面 ──
  return (
    <div className="max-w-lg mx-auto space-y-4">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <Link href="/dojo" className={`text-sm ${textMuted}`}>
          ← やめる
        </Link>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${
              isDark
                ? "bg-amber-500/20 text-amber-400"
                : "bg-orange-100 text-orange-600"
            }`}
          >
            🔥 {streak}日連続
          </span>
          <span className={`text-sm font-bold ${textPrimary}`}>
            デイリーチャレンジ
          </span>
        </div>
      </div>

      {/* 進捗バー */}
      <div
        className={`rounded-xl p-3 ${
          isDark ? "bg-slate-800" : "bg-gray-100"
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <span className={`text-xs font-medium ${textSecondary}`}>
            問題 {currentIndex + 1} / {totalQuestions}
          </span>
          <span
            className={`text-xs font-bold ${
              correctCount > 0 ? accentColor : textMuted
            }`}
          >
            正解: {correctCount}問
          </span>
        </div>
        <div
          className={`h-2 rounded-full overflow-hidden ${
            isDark ? "bg-slate-700" : "bg-gray-200"
          }`}
        >
          <div
            className={`h-full transition-all duration-300 ${
              isDark ? "bg-amber-500" : "bg-green-500"
            }`}
            style={{
              width: `${((currentIndex + 1) / totalQuestions) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* タイマー */}
      <div className="flex justify-center">
        <div
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${
            timeLeft <= 5
              ? isDark
                ? "bg-red-500/20 text-red-400"
                : "bg-red-100 text-red-600"
              : isDark
                ? "bg-slate-800 text-slate-300"
                : "bg-gray-100 text-gray-700"
          }`}
        >
          <span>⏱</span>
          <span className="font-bold">{timeLeft}秒</span>
        </div>
      </div>

      {/* 問題カード */}
      <div className={`rounded-2xl border p-5 ${cardBg}`}>
        <div className={`text-xs mb-2 ${textMuted}`}>
          #{currentQuestion.category}
        </div>
        <h2 className={`text-lg font-bold mb-6 ${textPrimary}`}>
          {currentQuestion.question}
        </h2>

        <div className="space-y-3">
          {currentQuestion.options.map((option, index) => (
            <button
              key={index}
              onClick={() => handleAnswer(index)}
              disabled={isAnswered}
              className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${getOptionStyle(index)}`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                    isDark
                      ? "bg-slate-700 text-slate-300"
                      : "bg-gray-200 text-gray-700"
                  }`}
                >
                  {String.fromCharCode(65 + index)}
                </span>
                <span
                  className={`font-medium ${isAnswered ? "" : textPrimary}`}
                >
                  {option}
                </span>
                {isAnswered && index === currentQuestion.correctIndex && (
                  <span className="ml-auto text-lg">✅</span>
                )}
                {isAnswered &&
                  index === selectedAnswer &&
                  index !== currentQuestion.correctIndex && (
                    <span className="ml-auto text-lg">❌</span>
                  )}
              </div>
            </button>
          ))}
        </div>

        {/* 解説 */}
        {isAnswered && currentQuestion.explanation && (
          <div
            className={`mt-4 p-4 rounded-xl ${
              isDark ? "bg-slate-800" : "bg-blue-50"
            }`}
          >
            <div
              className={`text-xs font-bold mb-1 ${
                isDark ? "text-blue-400" : "text-blue-600"
              }`}
            >
              💡 解説
            </div>
            <div
              className={`text-sm leading-relaxed ${
                isDark ? "text-slate-300" : "text-gray-700"
              } [&_strong]:font-bold [&_a]:underline`}
              dangerouslySetInnerHTML={{
                __html: currentQuestion.explanation,
              }}
            />
          </div>
        )}
      </div>

      {/* 次へボタン */}
      {isAnswered && (
        <button
          onClick={handleNext}
          className={`w-full py-3 rounded-xl font-bold transition-colors ${btnPrimary}`}
        >
          {currentIndex + 1 >= totalQuestions
            ? "結果を見る 🎯"
            : "次の問題へ →"}
        </button>
      )}
    </div>
  );
}
