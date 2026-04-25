"use client";

import { useState, useEffect } from "react";
import { useTheme } from "@/contexts/ThemeContext";

type AIPrediction = {
  predictor_id: string;
  predictor_name: string;
  predictor_type: string;
  predictor_catchphrase: string;
  predictor_color: string;
  umaban: number;
  horse_name: string;
  score: string;
  reason_key: string;
  gap?: string;
  sire_name?: string;
  weight_change?: number;
};

type Props = {
  raceId: string;
  hasVoted: boolean;
  isFinished: boolean;
};

const PREDICTOR_ICONS: Record<string, string> = {
  hayate: "⚡",
  gantetsu: "🪨",
  kazan: "🌋",
  hakusen: "🧬",
  hibari: "🐦",
};

const REASON_TEXT: Record<string, (p: AIPrediction) => string> = {
  idm_jockey: (p) => `スピード指数と騎手力の総合評価でトップ。スコア${p.score}は抜けている。`,
  sogo_dominant: (p) => `総合力が2位に${p.gap}pt差をつけて圧倒。この差なら軸として信頼できる。`,
  midrange_value: (p) => `実力上位だが人気が甘い。妙味スコア${p.score}はこのレースで最高値。`,
  sire_condition: (p) => `父${p.sire_name}はこの条件で好成績。血統適性×実力のスコア${p.score}。`,
  weight_stable: (p) => {
    const wc = p.weight_change;
    if (wc === null || wc === undefined) return `体調面に問題なし。IDM${p.score}でトップ評価。`;
    if (wc === 0) return `馬体重変動なし。仕上がり万全でIDM${p.score}。`;
    return `馬体重${wc > 0 ? "+" : ""}${wc}kgは許容範囲。IDM${p.score}で最上位。`;
  },
};

export default function AIPredictorTab({ raceId, hasVoted, isFinished }: Props) {
  const { isDark } = useTheme();
  const [predictions, setPredictions] = useState<AIPrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/races/${raceId}/ai-predictions`);
        const data = await res.json();
        if (data.locked) { setLocked(true); setLoading(false); return; }
        if (data.error) { setError(data.message || data.error); setLoading(false); return; }
        setPredictions(data.predictions ?? []);
      } catch (e) {
        setError("AI予想の読み込みに失敗しました");
      }
      setLoading(false);
    }
    load();
  }, [raceId]);

  const cardBg = isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200";
  const textPrimary = isDark ? "text-slate-100" : "text-gray-800";
  const textSecondary = isDark ? "text-slate-400" : "text-gray-500";

  if (locked) {
    return (
      <div className={`rounded-2xl border p-8 text-center ${cardBg}`}>
        <div className="text-4xl mb-3">🔒</div>
        <p className={`font-bold ${textPrimary}`}>AI予想は投票後に閲覧できます</p>
        <p className={`text-sm mt-1 ${textSecondary}`}>まず自分の予想を投票してみましょう！</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`rounded-2xl border p-8 text-center ${cardBg}`}>
        <div className="animate-pulse text-2xl mb-2">🤖</div>
        <p className={textSecondary}>AI予想家が分析中...</p>
      </div>
    );
  }

  if (error || predictions.length === 0) {
    return (
      <div className={`rounded-2xl border p-8 text-center ${cardBg}`}>
        <div className="text-2xl mb-2">📊</div>
        <p className={textSecondary}>{error || "このレースのAI予想データはまだありません"}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className={`rounded-2xl border p-4 ${cardBg}`}>
        <h2 className={`font-bold mb-1 ${textPrimary}`}>🤖 AI予想家の◎</h2>
        <p className={`text-xs ${textSecondary}`}>5体のAI予想家がそれぞれ◎（本命）を1頭選びました</p>
      </div>

      {predictions.map((p) => {
        const icon = PREDICTOR_ICONS[p.predictor_id] || "🤖";
        const reasonFn = REASON_TEXT[p.reason_key];
        const reason = reasonFn ? reasonFn(p) : `スコア${p.score}で選出。`;

        return (
          <div
            key={p.predictor_id}
            className={`rounded-2xl border overflow-hidden ${cardBg}`}
          >
            {/* ヘッダー */}
            <div
              className="px-4 py-3 flex items-center gap-3"
              style={{ backgroundColor: p.predictor_color + "15", borderBottom: `2px solid ${p.predictor_color}40` }}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold"
                style={{ backgroundColor: p.predictor_color + "25", color: p.predictor_color }}
              >
                {icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={`font-bold text-sm ${textPrimary}`}>{p.predictor_name}</span>
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                    style={{ backgroundColor: p.predictor_color + "20", color: p.predictor_color }}
                  >
                    {p.predictor_type}
                  </span>
                </div>
                <p className={`text-xs ${textSecondary}`}>「{p.predictor_catchphrase}」</p>
              </div>
            </div>

            {/* 予想内容 */}
            <div className="px-4 py-3">
              <div className="flex items-center gap-3 mb-2">
                <span
                  className="text-lg font-black px-2.5 py-0.5 rounded"
                  style={{ backgroundColor: p.predictor_color + "15", color: p.predictor_color }}
                >
                  ◎
                </span>
                <div>
                  <span className={`font-bold ${textPrimary}`}>
                    {p.umaban}番 {p.horse_name}
                  </span>
                </div>
              </div>
              <p className={`text-sm leading-relaxed ${textSecondary}`}>
                {reason}
              </p>
            </div>
          </div>
        );
      })}

      {/* 注意書き */}
      <div className={`text-center py-2 ${textSecondary}`}>
        <p className="text-[10px]">※ AI予想はJRDBデータに基づく参考情報です。投資判断にはご注意ください。</p>
      </div>
    </div>
  );
}
