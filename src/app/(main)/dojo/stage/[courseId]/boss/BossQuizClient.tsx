// src/app/(main)/dojo/stage/[courseId]/boss/BossQuizClient.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
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
  questions: Question[];
  totalQuestions: number;
  bestScore: number;
  cleared: boolean;
  attempts: number;
};

export default function BossQuizClient({
  userId,
  courseId,
  courseName,
  courseEmoji,
  questions,
  totalQuestions,
  bestScore,
  cleared: initialCleared,
  attempts: initialAttempts,
}: Props) {
  const { isDark } = useTheme();

  const [started, setStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isNewBest, setIsNewBest] = useState(false);
  const [bossCleared, setBossCleared] = useState(false);
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
    ? "bg-red-600 hover:bg-red-500 text-white"
    : "bg-red-600 hover:bg-red-700 text-white";
  const btnSecondary = isDark
    ? "border-slate-600 text-slate-300 hover:bg-slate-800"
    : "border-gray-200 text-gray-600 hover:bg-gray-50";
  const bossGrad = isDark
    ? "from-red-950/50 to-orange-950/30"
    : "from-red-50 to-orange-50";
  const bossBorder = isDark ? "border-red-700" : "border-red-300";

  const currentQuestion = questions[currentIndex];
  const passThreshold = Math.ceil(totalQuestions * 0.7); // 70%で合格

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
      const passed = correctCount >= passThreshold;
      setBossCleared(passed);
      setIsNewBest(correctCount > bestScore);
      setIsFinished(true);

      // 進捗を保存
      setIsSaving(true);
      try {
        await fetch("/api/dojo/boss", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            courseId,
            score: correctCount,
            cleared: passed,
          }),
        });
      } catch (e) {
        console.error("BOSS進捗保存エラー:", e);
      }
      // XP付与
      if (passed) {
        try {
          await awardXp("boss_clear", { courseId, correctCount, total: questions.length });
        } catch (e) {
          console.error("XP付与エラー:", e);
        }
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
    setIsNewBest(false);
    setBossCleared(false);
  };

  const getOptionStyle = (index: number) => {
    if (!isAnswered) {
      return isDark
        ? "bg-slate-800 border-slate-600 hover:border-red-500/50"
        : "bg-gray-50 border-gray-200 hover:border-red-300";
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
          <div className="text-5xl mb-4">👹</div>
          <h1 className={`text-xl font-black mb-2 ${textPrimary}`}>
            BOSS問題を準備中...
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

  // ── 開始前画面 ──
  if (!started) {
    return (
      <div className="max-w-lg mx-auto space-y-4">
        <Link href="/dojo" className={`text-sm ${textMuted}`}>
          ← 道場に戻る
        </Link>
        <div
          className={`rounded-2xl border-2 p-6 text-center bg-gradient-to-b ${bossGrad} ${bossBorder}`}
        >
          {/* BOSSアイコン */}
          <div className="text-6xl mb-3">👹</div>
          <div
            className={`inline-block text-xs font-black px-3 py-1 rounded-full mb-3 ${
              isDark
                ? "bg-red-500/20 text-red-400"
                : "bg-red-100 text-red-600"
            }`}
          >
            {courseEmoji} {courseName} — BOSS STAGE
          </div>
          <h1 className={`text-2xl font-black mb-2 ${textPrimary}`}>
            総まとめ検定
          </h1>
          <p className={`text-sm mb-4 ${textSecondary}`}>
            全範囲から{totalQuestions}問出題！コースの集大成に挑め！
          </p>

          {/* 合格条件 */}
          <div
            className={`rounded-xl p-3 mb-4 text-xs text-left ${
              isDark ? "bg-slate-800/80" : "bg-white/80"
            }`}
          >
            <div className={`font-bold mb-1 ${textPrimary}`}>
              🏁 合格条件
            </div>
            <div className={`space-y-0.5 ${textSecondary}`}>
              <div>
                ✅ {passThreshold}問以上正解（{totalQuestions}問中）で合格
              </div>
              <div>⏱ 制限時間なし — じっくり考えてOK</div>
              <div>📚 全10ステージの範囲から出題</div>
            </div>
          </div>

          {/* ベスト記録 */}
          {initialAttempts > 0 && (
            <div
              className={`rounded-xl p-3 mb-4 text-xs ${
                isDark ? "bg-slate-800/80" : "bg-white/80"
              }`}
            >
              <div className={textMuted}>
                ベスト: {bestScore}/{totalQuestions}問正解 •{" "}
                {initialCleared ? "✅ 合格済" : "❌ 未合格"} •{" "}
                {initialAttempts}回挑戦
              </div>
            </div>
          )}

          <button
            onClick={() => setStarted(true)}
            className={`w-full py-3.5 rounded-xl font-bold text-base ${btnPrimary}`}
          >
            👹 BOSS に挑む！
          </button>
        </div>
      </div>
    );
  }

  // ── 結果画面 ──
  if (isFinished) {
    const percentage = Math.round(
      (correctCount / questions.length) * 100
    );

    return (
      <>
      <div className="max-w-lg mx-auto space-y-4">
        <div
          className={`rounded-2xl border-2 p-6 text-center bg-gradient-to-b ${bossGrad} ${bossBorder}`}
        >
          {/* 結果アイコン */}
          <div className="text-6xl mb-3">
            {bossCleared ? "🏆" : "💀"}
          </div>

          <div
            className={`inline-block text-xs font-black px-3 py-1 rounded-full mb-3 ${
              isDark
                ? "bg-red-500/20 text-red-400"
                : "bg-red-100 text-red-600"
            }`}
          >
            BOSS STAGE — {courseName}
          </div>

          <h1 className={`text-2xl font-black mb-1 ${textPrimary}`}>
            {bossCleared ? "BOSS 撃破！" : "BOSS に敗北..."}
          </h1>

          {/* スコア */}
          <p className={`text-lg font-bold mb-4 ${textSecondary}`}>
            {correctCount}/{questions.length}問正解（{percentage}%）
          </p>

          {/* クリア時の演出 */}
          {bossCleared && (
            <div
              className={`rounded-xl p-4 mb-4 ${
                isDark
                  ? "bg-amber-500/20 border border-amber-500/30"
                  : "bg-yellow-50 border border-yellow-200"
              }`}
            >
              <span className="text-3xl">🎊</span>
              <p className={`text-sm font-bold mt-1 ${accentColor}`}>
                {courseName} コース完全制覇！
              </p>
              <p className={`text-xs mt-1 ${textMuted}`}>
                おめでとうございます！次のコースに挑戦しよう！
              </p>
            </div>
          )}

          {/* ベスト更新 */}
          {isNewBest && (
            <div
              className={`rounded-xl p-3 mb-4 ${
                isDark
                  ? "bg-green-500/20 border border-green-500/30"
                  : "bg-green-50 border border-green-200"
              }`}
            >
              <p className={`text-sm font-bold ${isDark ? "text-green-400" : "text-green-600"}`}>
                🎊 ベスト記録更新！
              </p>
            </div>
          )}

          {isSaving && (
            <p className={`text-xs mb-3 ${textMuted}`}>記録を保存中...</p>
          )}

          {/* ボタン群 */}
          <div className="space-y-2">
            {!bossCleared && (
              <button
                onClick={handleRetry}
                className={`w-full py-3 rounded-xl font-bold ${btnPrimary}`}
              >
                👹 再挑戦する
              </button>
            )}
            {bossCleared && (
              <button
                onClick={handleRetry}
                className={`w-full py-3 rounded-xl font-bold border ${btnSecondary}`}
              >
                🔄 もう一度挑戦
              </button>
            )}
            <Link
              href="/dojo"
              className={`block w-full py-3 rounded-xl font-bold text-center ${
                bossCleared ? btnPrimary : `border ${btnSecondary}`
              }`}
            >
              {bossCleared ? "🥋 道場に戻る" : "道場に戻る"}
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
        <span
          className={`text-sm font-bold ${
            isDark ? "text-red-400" : "text-red-600"
          }`}
        >
          👹 BOSS — {courseName}
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
          <span className={isDark ? "text-red-400" : "text-red-600"}>
            正解: {correctCount}
          </span>
        </div>
        <div
          className={`h-2 rounded-full ${
            isDark ? "bg-slate-700" : "bg-gray-200"
          }`}
        >
          <div
            className={`h-full rounded-full transition-all ${
              isDark ? "bg-red-500" : "bg-red-500"
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
            <div
              className={`text-xs font-bold mb-1 ${
                isDark ? "text-red-400" : "text-red-600"
              }`}
            >
              📖 解説
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
