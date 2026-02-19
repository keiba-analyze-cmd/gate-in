"use client";

// src/components/votes/VoteVisibilitySelector.tsx
// 予想の公開設定セレクター

import { useState } from "react";

export type Visibility = "public" | "private";

type Props = {
  value: Visibility;
  onChange: (value: Visibility) => void;
};

export function VoteVisibilitySelector({ value, onChange }: Props) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-bold text-gray-700 block">
        🌍 公開設定
      </label>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onChange("public")}
          className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-colors border-2 ${
            value === "public"
              ? "border-green-500 bg-green-50 text-green-700"
              : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <span>🌍</span>
            <span>全体に公開</span>
          </div>
          <p className="text-xs mt-1 font-normal opacity-70">
            タイムライン・ランキング対象
          </p>
        </button>
        <button
          type="button"
          onClick={() => onChange("private")}
          className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-colors border-2 ${
            value === "private"
              ? "border-gray-500 bg-gray-50 text-gray-700"
              : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <span>🔒</span>
            <span>非公開</span>
          </div>
          <p className="text-xs mt-1 font-normal opacity-70">
            自分だけの記録
          </p>
        </button>
      </div>
    </div>
  );
}

// 予想メモ入力コンポーネント
type MemoProps = {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
};

export function VoteMemoInput({ value, onChange, maxLength = 500 }: MemoProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-bold text-gray-700 block">
        📝 予想理由（任意）
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={maxLength}
        rows={3}
        placeholder="なぜこの予想にしたか記録しておくと振り返りに役立ちます"
        className="w-full border border-gray-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
      />
      <p className="text-xs text-gray-400 text-right">
        {value.length}/{maxLength}
      </p>
    </div>
  );
}
