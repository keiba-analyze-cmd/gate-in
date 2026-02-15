"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "@/contexts/ThemeContext";

type Question = {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

// カテゴリ別サンプル問題
const QUESTIONS_BY_CATEGORY: Record<string, Question[]> = {
  basics: [
    { id: "b1", question: "競走馬がデビューできる最低年齢は？", options: ["1歳", "2歳", "3歳", "4歳"], correctIndex: 1, explanation: "競走馬は2歳の6月からデビューできます。" },
    { id: "b2", question: "芝コースの「良」馬場とは？", options: ["雨で湿った状態", "乾いた最良の状態", "やや重い状態", "泥だらけの状態"], correctIndex: 1, explanation: "「良」は最も乾いた良好な状態を指します。" },
    { id: "b3", question: "「斤量」とは何を指す？", options: ["馬の体重", "騎手が背負う重量", "レースの距離", "賞金額"], correctIndex: 1, explanation: "斤量は騎手と馬具の合計重量で、ハンデ戦では馬の能力差を調整します。" },
  ],
  betting: [
    { id: "t1", question: "単勝馬券で的中となる条件は？", options: ["選んだ馬が3着以内", "選んだ馬が1着", "選んだ馬が2着以内", "選んだ馬が入着"], correctIndex: 1, explanation: "単勝は選んだ馬が1着になれば的中です。" },
    { id: "t2", question: "馬連と馬単の違いは？", options: ["着順の指定の有無", "選ぶ頭数", "配当の計算方法", "購入金額"], correctIndex: 0, explanation: "馬連は1-2着の組み合わせ、馬単は1-2着の順番まで当てる必要があります。" },
    { id: "t3", question: "三連複で選ぶ馬の数は？", options: ["2頭", "3頭", "4頭", "5頭"], correctIndex: 1, explanation: "三連複は1-2-3着に入る3頭を順不同で当てます。" },
  ],
  courses: [
    { id: "c1", question: "東京競馬場の芝コースの特徴は？", options: ["急坂がある", "平坦で直線が長い", "小回り", "ダートのみ"], correctIndex: 1, explanation: "東京競馬場は平坦で直線が525.9mと長いのが特徴です。" },
    { id: "c2", question: "中山競馬場で行われるG1レースは？", options: ["日本ダービー", "有馬記念", "天皇賞(秋)", "ジャパンカップ"], correctIndex: 1, explanation: "有馬記念は中山競馬場の芝2500mで行われます。" },
  ],
  jockeys: [
    { id: "j1", question: "JRA通算勝利数の最多記録を持つ騎手は？", options: ["武豊", "横山典弘", "岡部幸雄", "福永祐一"], correctIndex: 0, explanation: "武豊騎手はJRA通算4000勝以上を達成した唯一の騎手です。" },
    { id: "j2", question: "騎手がレース中に使う「鞭」の制限回数は？", options: ["制限なし", "5回まで", "10回まで", "状況による"], correctIndex: 3, explanation: "JRAでは馬の福祉を考慮し、過度な鞭の使用を制限しています。" },
  ],
  trainers: [
    { id: "tr1", question: "調教師の主な仕事は？", options: ["馬券販売", "馬の管理・調教", "レース実況", "馬場整備"], correctIndex: 1, explanation: "調教師は厩舎で馬の管理・調教を行い、レースに出走させます。" },
  ],
  history: [
    { id: "h1", question: "日本で初めてのG1三冠馬は？", options: ["シンザン", "セントライト", "ナリタブライアン", "ディープインパクト"], correctIndex: 1, explanation: "セントライトは1941年に史上初の三冠馬となりました。" },
    { id: "h2", question: "ディープインパクトの主な勝ち鞍でないものは？", options: ["日本ダービー", "有馬記念", "天皇賞(春)", "宝塚記念"], correctIndex: 3, explanation: "ディープインパクトは宝塚記念には出走していません。" },
  ],
};

type Props = {
  userId: string;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
};

export default function CategoryQuizClient({ userId, categoryId, categoryName, categoryIcon }: Props) {
  const { isDark } = useTheme();
  const router = useRouter();
  const questions = QUESTIONS_BY_CATEGORY[categoryId] || [];

  const [started, setStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  const cardBg = isDark ? "bg-slate-900 border-slate-700" : "bg-white border-gray-200";
  const textPrimary = isDark ? "text-slate-100" : "text-gray-900";
  const textSecondary = isDark ? "text-slate-400" : "text-gray-500";
  const textMuted = isDark ? "text-slate-500" : "text-gray-400";
  const accentColor = isDark ? "text-amber-400" : "text-green-600";
  const btnPrimary = isDark ? "bg-amber-500 hover:bg-amber-400 text-slate-900" : "bg-green-600 hover:bg-green-700 text-white";

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
      return isDark ? "bg-green-500/20 border-green-500" : "bg-green-100 border-green-500";
    }
    if (index === selectedAnswer) {
      return isDark ? "bg-red-500/20 border-red-500" : "bg-red-100 border-red-500";
    }
    return isDark ? "bg-slate-800 border-slate-700 opacity-50" : "bg-gray-50 border-gray-200 opacity-50";
  };

  // 開始前画面
  if (!started) {
    return (
      <div className="max-w-lg mx-auto space-y-4">
        <Link href="/dojo" className={`text-sm ${textMuted}`}>← 道場に戻る</Link>
        <div className={`rounded-2xl border p-6 text-center ${cardBg}`}>
          <div className="text-5xl mb-4">{categoryIcon}</div>
          <h1 className={`text-2xl font-black mb-2 ${textPrimary}`}>{categoryName}</h1>
          <p className={`text-sm mb-6 ${textSecondary}`}>全{questions.length}問のクイズに挑戦！</p>
          <button onClick={() => setStarted(true)} className={`w-full py-3 rounded-xl font-bold ${btnPrimary}`}>
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
            <div className={`p-4 rounded-xl mb-4 ${isDark ? "bg-amber-500/20" : "bg-yellow-50"}`}>
              <span className="text-2xl">🏅</span>
              <p className={`text-sm font-bold mt-1 ${accentColor}`}>「{categoryName}マスター」獲得！</p>
            </div>
          )}
          <div className="space-y-2">
            <button onClick={() => { setStarted(false); setCurrentIndex(0); setCorrectCount(0); setIsFinished(false); }}
              className={`w-full py-3 rounded-xl font-bold ${btnPrimary}`}>
              もう一度挑戦
            </button>
            <Link href="/dojo" className={`block w-full py-3 rounded-xl font-bold border ${isDark ? "border-slate-600 text-slate-300" : "border-gray-200 text-gray-600"}`}>
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
        <Link href="/dojo" className={`text-sm ${textMuted}`}>← 道場に戻る</Link>
        <span className={`text-sm font-bold ${textPrimary}`}>{categoryIcon} {categoryName}</span>
      </div>

      <div className={`rounded-xl p-3 ${isDark ? "bg-slate-800" : "bg-gray-100"}`}>
        <div className="flex justify-between text-xs mb-2">
          <span className={textSecondary}>問題 {currentIndex + 1}/{questions.length}</span>
          <span className={accentColor}>正解: {correctCount}</span>
        </div>
        <div className={`h-2 rounded-full ${isDark ? "bg-slate-700" : "bg-gray-200"}`}>
          <div className={`h-full rounded-full ${isDark ? "bg-amber-500" : "bg-green-500"}`}
            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }} />
        </div>
      </div>

      <div className={`rounded-2xl border p-5 ${cardBg}`}>
        <h2 className={`text-lg font-bold mb-6 ${textPrimary}`}>{currentQuestion.question}</h2>
        <div className="space-y-3">
          {currentQuestion.options.map((opt, i) => (
            <button key={i} onClick={() => handleAnswer(i)} disabled={isAnswered}
              className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${getOptionStyle(i)}`}>
              <div className="flex items-center gap-3">
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${isDark ? "bg-slate-700" : "bg-gray-200"}`}>
                  {String.fromCharCode(65 + i)}
                </span>
                <span className={textPrimary}>{opt}</span>
                {isAnswered && i === currentQuestion.correctIndex && <span className="ml-auto">✅</span>}
                {isAnswered && i === selectedAnswer && i !== currentQuestion.correctIndex && <span className="ml-auto">❌</span>}
              </div>
            </button>
          ))}
        </div>
        {isAnswered && (
          <div className={`mt-4 p-4 rounded-xl ${isDark ? "bg-slate-800" : "bg-blue-50"}`}>
            <p className={`text-sm ${isDark ? "text-slate-300" : "text-gray-700"}`}>💡 {currentQuestion.explanation}</p>
          </div>
        )}
      </div>

      {isAnswered && (
        <button onClick={handleNext} className={`w-full py-3 rounded-xl font-bold ${btnPrimary}`}>
          {currentIndex + 1 >= questions.length ? "結果を見る" : "次の問題へ →"}
        </button>
      )}
    </div>
  );
}
