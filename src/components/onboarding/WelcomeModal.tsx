"use client";

import { useState, useEffect } from "react";

export default function WelcomeModal() {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const seen = localStorage.getItem("gate-in-onboarding");
    if (!seen) setShow(true);
  }, []);

  const dismiss = () => {
    setShow(false);
    localStorage.setItem("gate-in-onboarding", "done");
  };

  if (!show) return null;

  const steps = [
    {
      icon: "🏇",
      title: "ようこそ ゲートイン！へ",
      desc: "競馬予想でポイントを稼ぎ、月間ランキング上位を目指しましょう！",
    },
    {
      icon: "🎯",
      title: "3つの予想を投票",
      desc: "◎ 1着予想（1頭）、○ 複勝予想（0〜2頭）、△ 危険馬（0〜1頭）を選びます。",
    },
    {
      icon: "💰",
      title: "的中でポイントゲット",
      desc: "人気薄の馬を当てるほど高ポイント！完全的中で+300Pボーナスも。",
    },
    {
      icon: "🏆",
      title: "月間大会で豪華景品",
      desc: "毎月のランキング上位者にAmazonギフト券をプレゼント！",
    },
  ];

  const s = steps[step];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl text-center">
        <div className="text-5xl mb-3">{s.icon}</div>
        <h2 className="text-lg font-black text-gray-800 mb-2">{s.title}</h2>
        <p className="text-sm text-gray-500 mb-6 leading-relaxed">{s.desc}</p>

        {/* ドットインジケーター */}
        <div className="flex justify-center gap-1.5 mb-4">
          {steps.map((_, i) => (
            <div key={i} className={`w-2 h-2 rounded-full ${i === step ? "bg-green-600" : "bg-gray-200"}`} />
          ))}
        </div>

        <div className="flex gap-2">
          {step > 0 && (
            <button
              onClick={() => setStep(step - 1)}
              className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50"
            >
              戻る
            </button>
          )}
          {step < steps.length - 1 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="flex-1 py-3 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700"
            >
              次へ
            </button>
          ) : (
            <button
              onClick={dismiss}
              className="flex-1 py-3 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700"
            >
              始める！ 🏇
            </button>
          )}
        </div>

        <button onClick={dismiss} className="mt-3 text-xs text-gray-400 hover:text-gray-600">
          スキップ
        </button>
      </div>
    </div>
  );
}
