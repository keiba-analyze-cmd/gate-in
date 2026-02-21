"use client";

import { useRef, useState } from "react";
import html2canvas from "html2canvas";

type Pick = {
  pick_type: string;
  post_number: number;
  horse_name: string;
};

type Props = {
  raceName: string;
  raceDate: string;
  courseName: string;
  grade?: string | null;
  picks: Pick[];
  userName: string;
  onClose: () => void;
};

export default function VoteShareCard({
  raceName,
  raceDate,
  courseName,
  grade,
  picks,
  userName,
  onClose,
}: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const winPick = picks.find(p => p.pick_type === "win");
  const placePicks = picks.filter(p => p.pick_type === "place");
  const backPicks = picks.filter(p => p.pick_type === "back");
  const dangerPick = picks.find(p => p.pick_type === "danger");

  // 画像生成
  const generateImage = async () => {
    if (!cardRef.current) return;
    setIsGenerating(true);

    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
      });
      const url = canvas.toDataURL("image/png");
      setImageUrl(url);
    } catch (error) {
      console.error("画像生成エラー:", error);
    }
    setIsGenerating(false);
  };

  // ダウンロード
  const downloadImage = () => {
    if (!imageUrl) return;
    const link = document.createElement("a");
    link.download = `gatein-vote-${Date.now()}.png`;
    link.href = imageUrl;
    link.click();
  };

  // Xでシェア
  const shareToX = () => {
    const pickText = [
      winPick ? `◎${winPick.post_number} ${winPick.horse_name}` : "",
      placePicks.length > 0 ? `○${placePicks.map(p => `${p.post_number} ${p.horse_name}`).join("、")}` : "",
    ].filter(Boolean).join("\n");

    const text = `🗳 ${raceName}を予想しました！\n\n${pickText}\n\nみんなも予想しよう👇\n#ゲートイン #競馬予想 ${grade ? `#${grade}` : ""}`;
    const url = "https://www.gate-in.jp";
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, "_blank");
  };

  // グレードの色（html2canvas対応のためRGB値で指定）
  const gradeGradients: Record<string, string> = {
    G1: "linear-gradient(to bottom right, #eab308, #d97706)",
    G2: "linear-gradient(to bottom right, #ef4444, #e11d48)",
    G3: "linear-gradient(to bottom right, #22c55e, #059669)",
  };
  const defaultGradient = "linear-gradient(to bottom right, #22c55e, #059669)";
  const gradientStyle = grade ? gradeGradients[grade] ?? defaultGradient : defaultGradient;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-800">📸 予想をシェア</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>

        {/* カードプレビュー */}
        <div className="p-4">
          <div
            ref={cardRef}
            className="rounded-2xl overflow-hidden shadow-xl"
            style={{ background: gradientStyle }}
          >
            {/* カード上部 */}
            <div className="p-5 text-white">
              {/* ロゴ */}
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">🏇</span>
                <span className="font-black text-lg">ゲートイン！</span>
              </div>

              {/* 予想バッジ */}
              <div className="text-center mb-4">
                <div 
                  className="inline-block px-6 py-2 rounded-full text-white font-black text-lg"
                  style={{ backgroundColor: "rgba(255, 255, 255, 0.2)" }}
                >
                  🗳 予想しました！
                </div>
              </div>

              {/* レース情報 */}
              <div 
                className="rounded-xl p-4 mb-4"
                style={{ backgroundColor: "rgba(255, 255, 255, 0.1)" }}
              >
                <div className="flex items-center gap-2 mb-2">
                  {grade && (
                    <span 
                      className="text-xs font-black px-2 py-0.5 rounded text-white"
                      style={{ backgroundColor: "rgba(255, 255, 255, 0.3)" }}
                    >
                      {grade}
                    </span>
                  )}
                  <span style={{ color: "rgba(255, 255, 255, 0.8)" }} className="text-sm">{courseName}</span>
                </div>
                <div className="font-black text-xl">{raceName}</div>
                <div style={{ color: "rgba(255, 255, 255, 0.6)" }} className="text-xs mt-1">{raceDate}</div>
              </div>

              {/* 予想内容 */}
              <div className="space-y-2 mb-4">
                {winPick && (
                  <div className="flex items-center gap-2">
                    <span 
                      className="text-white text-xs font-bold px-2 py-0.5 rounded"
                      style={{ backgroundColor: "#ef4444" }}
                    >
                      ◎本命
                    </span>
                    <span className="font-bold">{winPick.post_number} {winPick.horse_name}</span>
                  </div>
                )}
                {placePicks.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span 
                      className="text-white text-xs font-bold px-2 py-0.5 rounded"
                      style={{ backgroundColor: "#3b82f6" }}
                    >
                      ○対抗
                    </span>
                    <span className="text-sm">
                      {placePicks.map(p => `${p.post_number} ${p.horse_name}`).join(", ")}
                    </span>
                  </div>
                )}
                {backPicks.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span 
                      className="text-white text-xs font-bold px-2 py-0.5 rounded"
                      style={{ backgroundColor: "#eab308" }}
                    >
                      △抑え
                    </span>
                    <span className="text-sm" style={{ color: "rgba(255, 255, 255, 0.8)" }}>
                      {backPicks.map(p => `${p.post_number} ${p.horse_name}`).join(", ")}
                    </span>
                  </div>
                )}
                {dangerPick && (
                  <div className="flex items-center gap-2">
                    <span 
                      className="text-white text-xs font-bold px-2 py-0.5 rounded"
                      style={{ backgroundColor: "#6b7280" }}
                    >
                      ⚠️危険
                    </span>
                    <span className="text-sm" style={{ color: "rgba(255, 255, 255, 0.8)" }}>{dangerPick.post_number} {dangerPick.horse_name}</span>
                  </div>
                )}
              </div>
            </div>

            {/* カード下部（ユーザー情報） */}
            <div 
              className="px-5 py-3 flex items-center justify-between"
              style={{ backgroundColor: "rgba(255, 255, 255, 0.1)" }}
            >
              <div className="flex items-center gap-2">
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                  style={{ backgroundColor: "rgba(255, 255, 255, 0.2)" }}
                >
                  🏇
                </div>
                <span className="font-bold text-sm" style={{ color: "rgba(255, 255, 255, 0.9)" }}>{userName}</span>
              </div>
              <span className="text-xs" style={{ color: "rgba(255, 255, 255, 0.5)" }}>gate-in.jp</span>
            </div>
          </div>
        </div>

        {/* アクションボタン */}
        <div className="p-4 space-y-3 border-t border-gray-100">
          {!imageUrl ? (
            <button
              onClick={generateImage}
              disabled={isGenerating}
              className="w-full py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {isGenerating ? "生成中..." : "📸 画像を生成"}
            </button>
          ) : (
            <>
              <button
                onClick={downloadImage}
                className="w-full py-3 bg-gray-800 text-white font-bold rounded-xl hover:bg-gray-900 transition-colors"
              >
                💾 画像をダウンロード
              </button>
              <button
                onClick={shareToX}
                className="w-full py-3 bg-black text-white font-bold rounded-xl hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                Xでシェア
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
