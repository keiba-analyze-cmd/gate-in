"use client";

import { useState, useEffect } from "react";

type DiagnosisResult = {
  style_type: string;
  style_icon: string;
  style_description: string;
  stats: {
    total_votes: number;
    hit_count: number;
    hit_rate: number;
    avg_odds: number;
    avg_points: number;
    perfect_count: number;
    biggest_hit: number;
  };
  traits: { label: string; value: number }[];
};

export default function StyleDiagnosisClient() {
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ message: string; required?: number; current?: number } | null>(null);
  const [showResult, setShowResult] = useState(false);

  const runDiagnosis = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/diagnosis");
      const data = await res.json();

      if (!res.ok) {
        setError({
          message: data.error,
          required: data.required,
          current: data.current,
        });
      } else {
        setResult(data);
        setShowResult(true);
      }
    } catch {
      setError({ message: "診断に失敗しました" });
    }

    setLoading(false);
  };

  const handleShare = () => {
    if (!result) return;

    const text = `【予想スタイル診断】\n${result.style_icon} ${result.style_type}\n\n的中率: ${result.stats.hit_rate}%\n平均オッズ: ${result.stats.avg_odds}倍\n\n#GateIn #競馬`;

    if (navigator.share) {
      navigator.share({
        title: "予想スタイル診断結果",
        text,
      });
    } else {
      navigator.clipboard.writeText(text);
      alert("クリップボードにコピーしました！");
    }
  };

  if (!showResult) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
        <div className="text-6xl mb-4">🎯</div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">あなたの予想スタイルは？</h2>
        <p className="text-sm text-gray-600 mb-6">
          過去の予想データを分析して、<br />
          あなたの予想傾向を診断します
        </p>

        {error && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 text-left">
            <p className="text-sm text-yellow-800 font-bold mb-1">⚠️ {error.message}</p>
            {error.required && error.current !== undefined && (
              <p className="text-xs text-yellow-700">
                現在: {error.current}回 → あと{error.required - error.current}回投票が必要です
              </p>
            )}
          </div>
        )}

        <button
          onClick={runDiagnosis}
          disabled={loading}
          className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50"
        >
          {loading ? "診断中..." : "診断する"}
        </button>
      </div>
    );
  }

  if (!result) return null;

  return (
    <div className="space-y-4">
      {/* 結果カード */}
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-2xl p-6 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400"></div>

        <div className="text-6xl mb-3">{result.style_icon}</div>
        <div className="text-sm text-purple-600 font-bold mb-1">あなたは...</div>
        <div className="text-3xl font-black text-gray-800 mb-2">{result.style_type}</div>
        <p className="text-sm text-gray-600 leading-relaxed">{result.style_description}</p>
      </div>

      {/* スタッツ */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">平均オッズ</div>
          <div className="text-2xl font-black text-purple-600">{result.stats.avg_odds}倍</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">的中率</div>
          <div className="text-2xl font-black text-blue-600">{result.stats.hit_rate}%</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">平均獲得P</div>
          <div className="text-2xl font-black text-green-600">{result.stats.avg_points}P</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">完全的中</div>
          <div className="text-2xl font-black text-yellow-600">{result.stats.perfect_count}回</div>
        </div>
      </div>

      {/* 傾向グラフ */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <h3 className="text-sm font-bold text-gray-700 mb-3">📊 あなたの傾向</h3>
        <div className="space-y-3">
          {result.traits.map((trait) => (
            <div key={trait.label}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-600">{trait.label}</span>
                <span className="text-gray-400">{trait.value}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-400 to-pink-400 rounded-full transition-all duration-500"
                  style={{ width: `${trait.value}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 詳細データ */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <h3 className="text-sm font-bold text-gray-700 mb-3">📈 詳細データ</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex justify-between py-2 border-b border-gray-50">
            <span className="text-gray-500">総投票数</span>
            <span className="font-bold text-gray-800">{result.stats.total_votes}回</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-50">
            <span className="text-gray-500">的中数</span>
            <span className="font-bold text-gray-800">{result.stats.hit_count}回</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-50">
            <span className="text-gray-500">最大獲得</span>
            <span className="font-bold text-green-600">+{result.stats.biggest_hit}P</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-50">
            <span className="text-gray-500">完全的中</span>
            <span className="font-bold text-yellow-600">{result.stats.perfect_count}回</span>
          </div>
        </div>
      </div>

      {/* シェアボタン */}
      <button
        onClick={handleShare}
        className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all"
      >
        📣 結果をシェア
      </button>

      {/* 再診断ボタン */}
      <button
        onClick={() => {
          setShowResult(false);
          setResult(null);
        }}
        className="w-full py-3 border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50 transition-all"
      >
        もう一度診断する
      </button>
    </div>
  );
}
