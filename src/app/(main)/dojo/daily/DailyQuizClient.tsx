"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "@/contexts/ThemeContext";

type Question = {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  category: string;
};

// 仮のクイズデータ（将来的にはmicroCMS/DBから取得）
const SAMPLE_QUESTIONS: Question[] = [
  {
    id: "1",
    question: "日本ダービーが行われる競馬場はどこ？",
    options: ["中山競馬場", "東京競馬場", "阪神競馬場", "京都競馬場"],
    correctIndex: 1,
    explanation: "日本ダービー（東京優駿）は毎年5月末に東京競馬場の芝2400mで行われます。",
    category: "競馬場"
  },
  {
    id: "2",
    question: "JRAの「G1」レースは年間何レース開催される？",
    options: ["18レース", "22レース", "24レース", "26レース"],
    correctIndex: 2,
    explanation: "JRAのG1レースは平地22レース＋障害2レースの計24レースが開催されます。",
    category: "基礎知識"
  },
  {
    id: "3",
    question: "競走馬の年齢の数え方で正しいのは？",
    options: ["誕生日で加齢", "毎年1月1日で加齢", "毎年4月1日で加齢", "出走日で加齢"],
    correctIndex: 1,
    explanation: "日本の競馬では、全ての馬が毎年1月1日に一斉に1歳年を取ります。",
    category: "基礎知識"
  },
  {
    id: "4",
    question: "「三冠馬」になるために必要なレースの組み合わせは？",
    options: [
      "桜花賞・オークス・秋華賞",
      "皐月賞・日本ダービー・菊花賞",
      "皐月賞・日本ダービー・有馬記念",
      "日本ダービー・菊花賞・天皇賞(秋)"
    ],
    correctIndex: 1,
    explanation: "牡馬の三冠は皐月賞（中山2000m）、日本ダービー（東京2400m）、菊花賞（京都3000m）です。",
    category: "基礎知識"
  },
  {
    id: "5",
    question: "馬券の「ワイド」で的中となる条件は？",
    options: [
      "選んだ馬が1着になる",
      "選んだ2頭が1-2着になる",
      "選んだ2頭が3着以内に入る",
      "選んだ3頭が全て3着以内に入る"
    ],
    correctIndex: 2,
    explanation: "ワイドは選んだ2頭が両方とも3着以内に入れば的中となります。",
    category: "馬券"
  },
];

type Props = {
  userId: string;
};

export default function DailyQuizClient({ userId }: Props) {
  const { isDark } = useTheme();
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15);

  const currentQuestion = SAMPLE_QUESTIONS[currentIndex];
  const totalQuestions = SAMPLE_QUESTIONS.length;

  // タイマー
  useEffect(() => {
    if (isAnswered || isFinished) return;
    if (timeLeft <= 0) {
      handleAnswer(-1); // 時間切れ
      return;
    }
    const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, isAnswered, isFinished]);

  const cardBg = isDark ? "bg-slate-900 border-slate-700" : "bg-white border-gray-200";
  const textPrimary = isDark ? "text-slate-100" : "text-gray-900";
  const textSecondary = isDark ? "text-slate-400" : "text-gray-500";
  const textMuted = isDark ? "text-slate-500" : "text-gray-400";
  const accentColor = isDark ? "text-amber-400" : "text-green-600";
  const btnPrimary = isDark ? "bg-amber-500 hover:bg-amber-400 text-slate-900" : "bg-green-600 hover:bg-green-700 text-white";

  const handleAnswer = (index: number) => {
    if (isAnswered) return;
    setSelectedAnswer(index);
    setIsAnswered(true);
    if (index === currentQuestion.correctIndex) {
      setCorrectCount(correctCount + 1);
    }
  };

  const handleNext = () => {
    if (currentIndex + 1 >= totalQuestions) {
      setIsFinished(true);
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

  // 結果画面
  if (isFinished) {
    const percentage = Math.round((correctCount / totalQuestions) * 100);
    const earnedPoints = correctCount * 10;
    const resultEmoji = percentage >= 80 ? "🎉" : percentage >= 60 ? "👍" : percentage >= 40 ? "💪" : "📚";
    const resultMessage = percentage >= 80 ? "素晴らしい！" : percentage >= 60 ? "いい調子！" : percentage >= 40 ? "惜しい！" : "また挑戦しよう！";

    return (
      <div className="max-w-lg mx-auto space-y-4">
        <div className={`rounded-2xl border p-6 text-center ${cardBg}`}>
          <div className="text-6xl mb-4">{resultEmoji}</div>
          <h1 className={`text-2xl font-black mb-2 ${textPrimary}`}>{resultMessage}</h1>
          <p className={`text-sm mb-6 ${textSecondary}`}>今日のチャレンジ完了！</p>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className={`p-3 rounded-xl ${isDark ? "bg-slate-800" : "bg-gray-50"}`}>
              <div className={`text-2xl font-black ${accentColor}`}>{correctCount}/{totalQuestions}</div>
              <div className={`text-xs ${textMuted}`}>正解数</div>
            </div>
            <div className={`p-3 rounded-xl ${isDark ? "bg-slate-800" : "bg-gray-50"}`}>
              <div className={`text-2xl font-black ${accentColor}`}>{percentage}%</div>
              <div className={`text-xs ${textMuted}`}>正解率</div>
            </div>
            <div className={`p-3 rounded-xl ${isDark ? "bg-slate-800" : "bg-gray-50"}`}>
              <div className={`text-2xl font-black ${accentColor}`}>+{earnedPoints}P</div>
              <div className={`text-xs ${textMuted}`}>獲得ポイント</div>
            </div>
          </div>

          <div className="space-y-2">
            <button
              onClick={() => router.push("/dojo")}
              className={`w-full py-3 rounded-xl font-bold transition-colors ${btnPrimary}`}
            >
              道場トップに戻る
            </button>
            <Link
              href="/dojo/quiz/basics"
              className={`block w-full py-3 rounded-xl font-bold border transition-colors ${
                isDark ? "border-slate-600 text-slate-300 hover:bg-slate-800" : "border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              他のクイズに挑戦 →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-4">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <Link href="/dojo" className={`text-sm ${textMuted} hover:${accentColor}`}>
          ← 道場に戻る
        </Link>
        <span className={`text-sm font-bold ${textPrimary}`}>🔥 デイリーチャレンジ</span>
      </div>

      {/* 進捗バー */}
      <div className={`rounded-xl p-3 ${isDark ? "bg-slate-800" : "bg-gray-100"}`}>
        <div className="flex items-center justify-between mb-2">
          <span className={`text-xs font-medium ${textSecondary}`}>問題 {currentIndex + 1} / {totalQuestions}</span>
          <span className={`text-xs font-bold ${correctCount > 0 ? accentColor : textMuted}`}>
            正解: {correctCount}問
          </span>
        </div>
        <div className={`h-2 rounded-full overflow-hidden ${isDark ? "bg-slate-700" : "bg-gray-200"}`}>
          <div
            className={`h-full transition-all duration-300 ${isDark ? "bg-amber-500" : "bg-green-500"}`}
            style={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }}
          />
        </div>
      </div>

      {/* タイマー */}
      <div className="flex justify-center">
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${
          timeLeft <= 5
            ? isDark ? "bg-red-500/20 text-red-400" : "bg-red-100 text-red-600"
            : isDark ? "bg-slate-800 text-slate-300" : "bg-gray-100 text-gray-700"
        }`}>
          <span>⏱</span>
          <span className="font-bold">{timeLeft}秒</span>
        </div>
      </div>

      {/* 問題カード */}
      <div className={`rounded-2xl border p-5 ${cardBg}`}>
        <div className={`text-xs mb-2 ${textMuted}`}>#{currentQuestion.category}</div>
        <h2 className={`text-lg font-bold mb-6 ${textPrimary}`}>{currentQuestion.question}</h2>

        <div className="space-y-3">
          {currentQuestion.options.map((option, index) => (
            <button
              key={index}
              onClick={() => handleAnswer(index)}
              disabled={isAnswered}
              className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${getOptionStyle(index)}`}
            >
              <div className="flex items-center gap-3">
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                  isDark ? "bg-slate-700 text-slate-300" : "bg-gray-200 text-gray-700"
                }`}>
                  {String.fromCharCode(65 + index)}
                </span>
                <span className={`font-medium ${isAnswered ? "" : textPrimary}`}>{option}</span>
                {isAnswered && index === currentQuestion.correctIndex && (
                  <span className="ml-auto text-lg">✅</span>
                )}
                {isAnswered && index === selectedAnswer && index !== currentQuestion.correctIndex && (
                  <span className="ml-auto text-lg">❌</span>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* 解説（回答後） */}
        {isAnswered && (
          <div className={`mt-4 p-4 rounded-xl ${isDark ? "bg-slate-800" : "bg-blue-50"}`}>
            <div className={`text-xs font-bold mb-1 ${isDark ? "text-blue-400" : "text-blue-600"}`}>💡 解説</div>
            <p className={`text-sm ${isDark ? "text-slate-300" : "text-gray-700"}`}>{currentQuestion.explanation}</p>
          </div>
        )}
      </div>

      {/* 次へボタン */}
      {isAnswered && (
        <button
          onClick={handleNext}
          className={`w-full py-3 rounded-xl font-bold transition-colors ${btnPrimary}`}
        >
          {currentIndex + 1 >= totalQuestions ? "結果を見る 🎯" : "次の問題へ →"}
        </button>
      )}
    </div>
  );
}
