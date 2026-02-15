"use client";

import { useState } from "react";

type Badge = {
  id: string;
  name: string;
  icon: string;
  description: string;
};

type Props = {
  earnedBadges: Badge[];
  featuredBadgeId: string | null;
  featuredBadge: Badge | null;
};

export default function BadgeGrid({ earnedBadges, featuredBadgeId, featuredBadge }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(featuredBadgeId);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/profile/featured-badge", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ badgeId: selectedId }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => {
          setSaved(false);
          setIsOpen(false);
          window.location.reload();
        }, 1000);
      }
    } catch {}
    setSaving(false);
  };

  const currentBadge = selectedId 
    ? earnedBadges.find(b => b.id === selectedId)
    : null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <h2 className="font-bold text-gray-800 mb-1">⭐ お気に入りバッジ</h2>
      <p className="text-xs text-gray-400 mb-3">プロフィールに表示するバッジを選択できます</p>

      {/* 現在のお気に入り */}
      <div className="flex items-center justify-between bg-yellow-50 rounded-xl p-4 border border-yellow-200">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{featuredBadge?.icon ?? "❓"}</span>
          <div>
            <div className="font-bold text-gray-800">
              {featuredBadge?.name ?? "未設定"}
            </div>
            <div className="text-xs text-gray-500">
              {featuredBadge?.description ?? "バッジを選択してプロフィールに表示しましょう"}
            </div>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(true)}
          className="px-4 py-2 bg-yellow-500 text-white text-sm font-bold rounded-lg hover:bg-yellow-600 transition-colors"
        >
          {featuredBadge ? "変更" : "設定"}
        </button>
      </div>

      {/* 選択モーダル */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setIsOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-800 mb-4 text-center">
              ⭐ お気に入りバッジを選択
            </h3>

            {earnedBadges.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                まだバッジを獲得していません
              </p>
            ) : (
              <div className="space-y-2 mb-6">
                {/* 設定解除オプション */}
                <button
                  onClick={() => setSelectedId(null)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                    selectedId === null
                      ? "bg-gray-100 border-gray-400 ring-2 ring-gray-300"
                      : "bg-gray-50 border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <span className="text-2xl">❌</span>
                  <div className="flex-1 text-left">
                    <div className="font-bold text-sm text-gray-800">設定しない</div>
                    <div className="text-xs text-gray-500">お気に入りバッジを非表示にする</div>
                  </div>
                  {selectedId === null && (
                    <span className="text-green-600">✓</span>
                  )}
                </button>

                {/* 獲得済みバッジ一覧 */}
                {earnedBadges.map((badge) => (
                  <button
                    key={badge.id}
                    onClick={() => setSelectedId(badge.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                      selectedId === badge.id
                        ? "bg-yellow-50 border-yellow-400 ring-2 ring-yellow-200"
                        : "bg-gray-50 border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <span className="text-2xl">{badge.icon}</span>
                    <div className="flex-1 text-left">
                      <div className="font-bold text-sm text-gray-800">{badge.name}</div>
                      <div className="text-xs text-gray-500">{badge.description}</div>
                    </div>
                    {selectedId === badge.id && (
                      <span className="text-yellow-600">✓</span>
                    )}
                  </button>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setIsOpen(false)}
                className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleSave}
                disabled={saving || earnedBadges.length === 0}
                className="flex-1 py-3 bg-yellow-500 text-white rounded-xl text-sm font-bold hover:bg-yellow-600 transition-colors disabled:opacity-50"
              >
                {saved ? "✓ 保存しました" : saving ? "保存中..." : "保存する"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
