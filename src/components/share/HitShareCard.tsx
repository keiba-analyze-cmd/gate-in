"use client";

import { useRef, useState } from "react";
import html2canvas from "html2canvas";

type Props = {
  raceName: string;
  raceDate: string;
  courseName: string;
  grade?: string | null;
  earnedPoints: number;
  isPerfect: boolean;
  winPick?: { postNumber: number; horseName: string };
  placePicks?: { postNumber: number; horseName: string }[];
  userName: string;
  onClose: () => void;
};

export default function HitShareCard({
  raceName,
  raceDate,
  courseName,
  grade,
  earnedPoints,
  isPerfect,
  winPick,
  placePicks,
  userName,
  onClose,
}: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

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
    link.download = `gatein-hit-${Date.now()}.png`;
    link.href = imageUrl;
    link.click();
  };

  // Xでシェア
  const shareToX = () => {
    const text = isPerfect
      ? `💎 完全的中！+${earnedPoints}P獲得！\n\n${raceName}で予想が的中しました！\n\n#ゲートイン #競馬予想 #的中報告`
      : `🎉 的中！+${earnedPoints}P獲得！\n\n${raceName}で予想が的中しました！\n\n#ゲートイン #競馬予想 #的中報告`;
    const url = "https://www.gate-in.jp";
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, "_blank");
  };

  // グレードの色
  const gradeColors: Record<string, string> = {
    G1: "from-yellow-500 to-amber-600",
    G2: "from-red-500 to-rose-600",
    G3: "from-green-500 to-emerald-600",
  };
  const gradeBg = grade ? gradeColors[grade] ?? "from-gray-500 to-gray-600" : "";

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-800">📸 的中報告をシェア</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>

        {/* カードプレビュー */}
        <div className="p-4">
          <div
            ref={cardRef}
            className="rounded-2xl overflow-hidden shadow-xl"
            style={{ background: "linear-gradient(135deg, #16a34a 0%, #15803d 50%, #166534 100%)" }}
          >
            {/* カード上部 */}
            <div className="p-5 text-white">
              {/* ロゴ */}
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">🏇</span>
                <span className="font-black text-lg">ゲートイン！</span>
              </div>

              {/* 的中バッジ */}
              <div className="text-center mb-4">
                <div className={`inline-block px-6 py-2 rounded-full ${isPerfect ? "bg-yellow-400 text-yellow-900" : "bg-white/20 text-white"} font-black text-lg`}>
                  {isPerfect ? "💎 完全的中！" : "🎉 的中！"}
                </div>
              </div>

              {/* レース情報 */}
              <div className="bg-white/10 rounded-xl p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  {grade && (
                    <span className={`text-xs font-black px-2 py-0.5 rounded bg-gradient-to-r ${gradeBg} text-white`}>
                      {grade}
                    </span>
                  )}
                  <span className="text-white/80 text-sm">{courseName}</span>
                </div>
                <div className="font-black text-xl">{raceName}</div>
                <div className="text-white/60 text-xs mt-1">{raceDate}</div>
              </div>

              {/* 予想内容 */}
              <div className="space-y-2 mb-4">
                {winPick && (
                  <div className="flex items-center gap-2">
                    <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded">◎本命</span>
                    <span className="font-bold">{winPick.postNumber} {winPick.horseName}</span>
                  </div>
                )}
                {placePicks && placePicks.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded">○対抗</span>
                    <span className="text-sm">
                      {placePicks.map(p => `${p.postNumber} ${p.horseName}`).join(", ")}
                    </span>
                  </div>
                )}
              </div>

              {/* 獲得ポイント */}
              <div className="text-center bg-white/20 rounded-xl py-4">
                <div className="text-white/80 text-sm mb-1">獲得ポイント</div>
                <div className="text-4xl font-black text-yellow-300">+{earnedPoints} P</div>
              </div>
            </div>

            {/* カード下部（ユーザー情報） */}
            <div className="bg-white/10 px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm">🏇</div>
                <span className="font-bold text-white/90 text-sm">{userName}</span>
              </div>
              <span className="text-white/50 text-xs">gate-in.jp</span>
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
