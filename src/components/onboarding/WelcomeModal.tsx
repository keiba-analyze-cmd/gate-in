"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { getRank } from "@/lib/constants/ranks";

type SuggestedUser = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  rank_id: string;
  is_verified: boolean;
  cumulative_points: number;
  win_rate: number;
};

export default function WelcomeModal() {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem("gate-in-onboarding");
    if (!seen) setShow(true);
  }, []);

  // おすすめユーザーを取得
  useEffect(() => {
    if (show && step === 4) {
      setLoading(true);
      fetch("/api/onboarding/suggested-users")
        .then(res => res.json())
        .then(data => {
          setSuggestedUsers(data.users ?? []);
          // デフォルトで全員選択
          setSelectedUsers(new Set((data.users ?? []).map((u: SuggestedUser) => u.id)));
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [show, step]);

  const toggleUser = (userId: string) => {
    const newSet = new Set(selectedUsers);
    if (newSet.has(userId)) {
      newSet.delete(userId);
    } else {
      newSet.add(userId);
    }
    setSelectedUsers(newSet);
  };

  const handleFollow = async () => {
    if (selectedUsers.size === 0) {
      dismiss();
      return;
    }
    
    setFollowLoading(true);
    try {
      await fetch("/api/onboarding/bulk-follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_ids: Array.from(selectedUsers) }),
      });
    } catch {}
    setFollowLoading(false);
    dismiss();
  };

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
      desc: "◎ 本命（1頭）、○ 対抗（0〜2頭）、△ 抑え（0〜5頭）、⚠️ 危険馬を選びます。",
    },
    {
      icon: "💰",
      title: "的中でポイントゲット",
      desc: "人気薄の馬を当てるほど高ポイント！完全的中で+200Pボーナスも。",
    },
    {
      icon: "🏆",
      title: "月間大会で豪華景品",
      desc: "毎月のランキング上位者にAmazonギフト券をプレゼント！",
    },
    {
      icon: "👥",
      title: "予想家をフォローしよう",
      desc: "フォローすると予想がタイムラインに表示されます。",
      isFollowStep: true,
    },
  ];

  const s = steps[step];
  const isFollowStep = s.isFollowStep;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
        {!isFollowStep ? (
          // 通常のステップ
          <div className="text-center">
            <div className="text-5xl mb-3">{s.icon}</div>
            <h2 className="text-lg font-black text-gray-800 mb-2">{s.title}</h2>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">{s.desc}</p>
          </div>
        ) : (
          // フォローステップ
          <div>
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">{s.icon}</div>
              <h2 className="text-lg font-black text-gray-800 mb-1">{s.title}</h2>
              <p className="text-xs text-gray-500">{s.desc}</p>
            </div>

            {loading ? (
              <div className="py-8 text-center text-gray-400 text-sm">読み込み中...</div>
            ) : suggestedUsers.length === 0 ? (
              <div className="py-8 text-center text-gray-400 text-sm">おすすめユーザーがいません</div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {suggestedUsers.map(user => {
                  const rank = getRank(user.rank_id);
                  const isSelected = selectedUsers.has(user.id);
                  return (
                    <button
                      key={user.id}
                      onClick={() => toggleUser(user.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                        isSelected 
                          ? "border-green-500 bg-green-50" 
                          : "border-gray-100 hover:border-gray-200"
                      }`}
                    >
                      {user.avatar_url ? (
                        <Image src={user.avatar_url} alt="" width={40} height={40} className="w-10 h-10 rounded-full" unoptimized />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-lg">🏇</div>
                      )}
                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-sm text-gray-800">{user.display_name}</span>
                          {user.is_verified && <span className="text-blue-500 text-xs">✓</span>}
                        </div>
                        <div className="text-xs text-gray-400">
                          {rank?.icon} {user.cumulative_points.toLocaleString()}P • 的中率{user.win_rate}%
                        </div>
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        isSelected ? "bg-green-500 border-green-500 text-white" : "border-gray-300"
                      }`}>
                        {isSelected && <span className="text-xs">✓</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            <p className="text-xs text-center text-gray-400 mt-3">
              {selectedUsers.size}人選択中
            </p>
          </div>
        )}

        {/* ドットインジケーター */}
        <div className="flex justify-center gap-1.5 mb-4 mt-4">
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
              onClick={handleFollow}
              disabled={followLoading}
              className="flex-1 py-3 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 disabled:opacity-50"
            >
              {followLoading ? "..." : selectedUsers.size > 0 ? `${selectedUsers.size}人フォローして始める 🏇` : "始める！ 🏇"}
            </button>
          )}
        </div>

        <button onClick={dismiss} className="w-full mt-3 text-xs text-gray-400 hover:text-gray-600">
          スキップ
        </button>
      </div>
    </div>
  );
}
