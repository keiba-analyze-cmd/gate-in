"use client";

import { useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";

type Props = {
  voteId: string;
  initialCount?: number;
  initialLiked?: boolean;
};

export default function LikeButton({ voteId, initialCount = 0, initialLiked = false }: Props) {
  const { isDark } = useTheme();
  const [count, setCount] = useState(initialCount);
  const [isLiked, setIsLiked] = useState(initialLiked);
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);

    const wasLiked = isLiked;
    setIsLiked(!wasLiked);
    setCount(wasLiked ? count - 1 : count + 1);

    try {
      const res = await fetch(`/api/votes/${voteId}/like`, { method: "POST" });
      if (!res.ok) {
        setIsLiked(wasLiked);
        setCount(wasLiked ? count : count - 1);
      }
    } catch {
      setIsLiked(wasLiked);
      setCount(wasLiked ? count : count - 1);
    }

    setLoading(false);
  };

  const likedStyle = isDark 
    ? "bg-pink-500/20 text-pink-400" 
    : "bg-pink-100 text-pink-600";
  
  const unlikedStyle = isDark 
    ? "bg-slate-700 text-slate-400 hover:bg-slate-600" 
    : "bg-gray-100 text-gray-500 hover:bg-gray-200";

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all ${
        isLiked ? likedStyle : unlikedStyle
      } ${loading ? "opacity-50" : ""}`}
    >
      <span className={`transition-transform ${isLiked ? "scale-110" : ""}`}>
        {isLiked ? "❤️" : "🤍"}
      </span>
      {count > 0 && <span>{count}</span>}
    </button>
  );
}
