"use client";

import { AVATAR_OPTIONS, DEFAULT_AVATAR } from "@/lib/constants/avatars";

type Props = {
  selected: string;
  onSelect: (emoji: string) => void;
  size?: "sm" | "md";
};

export default function AvatarPicker({ selected, onSelect, size = "md" }: Props) {
  const currentEmoji = selected || DEFAULT_AVATAR;
  const gridCols = size === "sm" ? "grid-cols-7" : "grid-cols-7 sm:grid-cols-10";
  const cellSize = size === "sm" ? "w-9 h-9 text-lg" : "w-10 h-10 text-xl";

  return (
    <div className="space-y-3">
      {/* 現在のアバター */}
      <div className="flex items-center gap-3">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-3xl border-2 border-green-300">
          {currentEmoji}
        </div>
        <div>
          <div className="text-sm font-bold text-gray-700">アバターを選択</div>
          <div className="text-xs text-gray-400">好きなアイコンをタップ</div>
        </div>
      </div>

      {/* 選択グリッド */}
      <div className={`grid ${gridCols} gap-1.5`}>
        {AVATAR_OPTIONS.map((avatar) => (
          <button
            key={avatar.emoji}
            type="button"
            onClick={() => onSelect(avatar.emoji)}
            title={avatar.label}
            className={`${cellSize} rounded-lg flex items-center justify-center transition-all ${
              currentEmoji === avatar.emoji
                ? "bg-green-100 border-2 border-green-500 scale-105"
                : "bg-gray-50 border border-gray-200 hover:bg-gray-100"
            }`}
          >
            {avatar.emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
