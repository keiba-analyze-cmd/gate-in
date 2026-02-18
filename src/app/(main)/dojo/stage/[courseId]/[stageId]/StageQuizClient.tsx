// src/app/(main)/dojo/stage/[courseId]/[stageId]/StageQuizClient.tsx
"use client";

import { useState } from "react";
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
};

type Props = {
  userId: string;
  courseId: string;
  courseName: string;
  courseEmoji: string;
  stageId: number;
  stageTopic: string;
  totalQuestions: number;
  questions: Question[];
  bestScore: number;
  bestStars: number;
  attempts: number;
};

// 星の計算ロジック
function calcStars(correct: number, total: number): number {
  const rate = correct / total;
  if (rate >= 1.0) return 3; // 全問正解
  if (rate >= 0.8) return 2; // 80%以上
  if (rate >= 0.6) return 1; // 60%以上
  return 0; // 不合格
}

export default function StageQuizClient({
  userId,
  courseId,
  courseName,
  courseEmoji,
  stageId,
  stageTopic,
  totalQuestions,
  questions,
  bestScore,
  bestStars,
  attempts: initialAttempts,
}: Props) {
  const { isDark } = useTheme();
  const router = useRouter();

  const [started, setStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [earnedStars, setEarnedStars] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isNewBest, setIsNewBest] = useState(false);
  const { awardXp, achievements, showPopup, closePopup } = useDojoXp();

  // テーマスタイル
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

  const currentQuestion = questions[currentIndex];

  const handleAnswer = (index: number) => {
    if (isAnswered) return;
    setSelectedAnswer(index);
    setIsAnswered(true);
    if (index === currentQuestion.correctIndex) {
      setCorrectCount((c) => c + 1);
    }
  };

  const handleNext = async () => {
    if (currentIndex + 1 >= questions.length) {
      // クイズ終了 → 結果を計算・保存
      const finalCorrect =
        correctCount +
        (selectedAnswer === currentQuestion.correctIndex ? 0 : 0); // correctCountは既に加算済み
      const stars = calcStars(correctCount, questions.length);
      setEarnedStars(stars);
      setIsNewBest(correctCount > bestScore);
      setIsFinished(true);

      // 進捗を保存
      setIsSaving(true);
      try {
        await fetch("/api/dojo/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            courseId,
            stageId,
            score: correctCount,
            stars,
          }),
        });
      } catch (e) {
        console.error("進捗保存エラー:", e);
      }
      // XP付与
      try {
        await awardXp("stage_clear", { courseId, stageId, stars, correctCount, total: questions.length });
      } catch (e) {
        console.error("XP付与エラー:", e);
      }
      setIsSaving(false);
    } else {
      setCurrentIndex(currentIndex + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
    }
  };

  const handleRetry = () => {
    setStarted(true);
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setCorrectCount(0);
    setIsFinished(false);
    setEarnedStars(0);
    setIsNewBest(false);
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
          <p className={`text-sm mb-6 ${textSecondary}`}>
            このステージのクイズはまだ準備中です。
          </p>
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

  // ── 開始前画面 ──
  if (!started) {
    return (
      <div className="max-w-lg mx-auto space-y-4">
        <Link href="/dojo" className={`text-sm ${textMuted}`}>
          ← 道場に戻る
        </Link>
        <div className={`rounded-2xl border p-6 text-center ${cardBg}`}>
          {/* ステージ情報 */}
          <div
            className={`inline-block text-xs font-black px-3 py-1 rounded-full mb-3 ${
              isDark
                ? "bg-amber-500/20 text-amber-400"
                : "bg-green-100 text-green-700"
            }`}
          >
            {courseEmoji} {courseName} — STAGE {stageId}
          </div>
          <h1 className={`text-2xl font-black mb-2 ${textPrimary}`}>
            {stageTopic}
          </h1>
          <p className={`text-sm mb-4 ${textSecondary}`}>
            全{questions.length}問に挑戦！
          </p>

          {/* 星の基準 */}
          <div
            className={`rounded-xl p-3 mb-4 text-xs ${
              isDark ? "bg-slate-800" : "bg-gray-50"
            }`}
          >
            <div className={`font-bold mb-1 ${textPrimary}`}>⭐ 星の獲得条件</div>
            <div className={`space-y-0.5 ${textSecondary}`}>
              <div>★☆☆ — 60%以上正解（{Math.ceil(questions.length * 0.6)}問）</div>
              <div>★★☆ — 80%以上正解（{Math.ceil(questions.length * 0.8)}問）</div>
              <div>★★★ — 全問正解（{questions.length}問）</div>
            </div>
          </div>

          {/* ベスト記録 */}
          {initialAttempts > 0 && (
            <div
              className={`rounded-xl p-3 mb-4 ${
                isDark ? "bg-slate-800" : "bg-gray-50"
              }`}
            >
              <div className={`text-xs ${textMuted}`}>
                ベスト: {bestScore}/{totalQuestions}問正解 •{" "}
                {"⭐".repeat(bestStars)}{"☆".repeat(3 - bestStars)} •{" "}
                {initialAttempts}回挑戦
              </div>
            </div>
          )}

          <button
            onClick={() => setStarted(true)}
            className={`w-full py-3.5 rounded-xl font-bold text-base ${btnPrimary}`}
          >
            🎯 ステージ{stageId} スタート！
          </button>
        </div>
      </div>
    );
  }

  // ── 結果画面 ──
  if (isFinished) {
    const percentage = Math.round((correctCount / questions.length) * 100);
    const passed = earnedStars >= 1;

    return (
      <>
      <div className="max-w-lg mx-auto space-y-4">
        <div className={`rounded-2xl border p-6 text-center ${cardBg}`}>
          {/* ステージ情報 */}
          <div
            className={`inline-block text-xs font-black px-3 py-1 rounded-full mb-3 ${
              isDark
                ? "bg-amber-500/20 text-amber-400"
                : "bg-green-100 text-green-700"
            }`}
          >
            STAGE {stageId} — {stageTopic}
          </div>

          {/* 結果アイコン */}
          <div className="text-5xl mb-2">
            {earnedStars === 3 ? "🏆" : earnedStars === 2 ? "🎉" : passed ? "✅" : "📚"}
          </div>
          <h1 className={`text-2xl font-black mb-1 ${textPrimary}`}>
            {passed ? "ステージクリア！" : "もう一度挑戦しよう"}
          </h1>

          {/* スコア */}
          <p className={`text-lg font-bold mb-3 ${textSecondary}`}>
            {correctCount}/{questions.length}問正解（{percentage}%）
          </p>

          {/* 星表示 */}
          <div className="flex justify-center gap-3 mb-4">
            {[1, 2, 3].map((i) => (
              <span
                key={i}
                className={`text-4xl transition-all duration-500 ${
                  i <= earnedStars ? "scale-110" : "opacity-30 scale-90"
                }`}
                style={{ transitionDelay: `${i * 200}ms` }}
              >
                ⭐
              </span>
            ))}
          </div>

          {/* ベスト更新通知 */}
          {isNewBest && (
            <div
              className={`rounded-xl p-3 mb-4 ${
                isDark
                  ? "bg-amber-500/20 border border-amber-500/30"
                  : "bg-yellow-50 border border-yellow-200"
              }`}
            >
              <span className="text-lg">🎊</span>
              <p className={`text-sm font-bold ${accentColor}`}>
                ベスト記録更新！
              </p>
            </div>
          )}

          {/* 保存中表示 */}
          {isSaving && (
            <p className={`text-xs mb-3 ${textMuted}`}>記録を保存中...</p>
          )}

          {/* ボタン群 */}
          <div className="space-y-2">
            {!passed && (
              <button
                onClick={handleRetry}
                className={`w-full py-3 rounded-xl font-bold ${btnPrimary}`}
              >
                🔄 もう一度挑戦
              </button>
            )}
            {passed && earnedStars < 3 && (
              <button
                onClick={handleRetry}
                className={`w-full py-3 rounded-xl font-bold ${btnPrimary}`}
              >
                ⭐ さらに上の星を目指す
              </button>
            )}
            {passed && (
              <Link
                href="/dojo"
                className={`block w-full py-3 rounded-xl font-bold text-center ${btnPrimary}`}
              >
                {earnedStars === 3 ? "🎯 道場に戻る" : "次のステージへ →"}
              </Link>
            )}
            <Link
              href="/dojo"
              className={`block w-full py-3 rounded-xl font-bold text-center border ${btnSecondary}`}
            >
              道場に戻る
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
        <span className={`text-sm font-bold ${textPrimary}`}>
          STAGE {stageId} — {stageTopic}
        </span>
      </div>

      {/* プログレスバー */}
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

      {/* 問題カード */}
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
              className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${getOptionStyle(i)}`}
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

        {/* 解説 */}
        {isAnswered && currentQuestion.explanation && (
          <div
            className={`mt-4 p-4 rounded-xl ${
              isDark ? "bg-slate-800" : "bg-blue-50"
            }`}
          >
            <div className={`text-xs font-bold mb-1 ${accentColor}`}>
              📖 解説
            </div>
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

      {/* 次へボタン */}
      {isAnswered && (
        <button
          onClick={handleNext}
          className={`w-full py-3 rounded-xl font-bold ${btnPrimary}`}
        >
          {currentIndex + 1 >= questions.length
            ? "結果を見る 🏁"
            : "次の問題へ →"}
        </button>
      )}
    </div>
  );
}
