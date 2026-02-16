"use client";

import { useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";

type Props = {
  targetUserId: string;
  initialFollowing: boolean;
};

export default function FollowButton({ targetUserId, initialFollowing }: Props) {
  const { isDark } = useTheme();
  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    setLoading(true);
    const res = await fetch("/api/follows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ following_id: targetUserId }),
    });
    if (res.ok) {
      const { action } = await res.json();
      setIsFollowing(action === "followed");
    }
    setLoading(false);
  };

  const followingStyle = isDark
    ? "bg-slate-700 text-slate-300 hover:bg-red-500/20 hover:text-red-400"
    : "bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600";

  const notFollowingStyle = isDark
    ? "bg-amber-500 text-slate-900 hover:bg-amber-400"
    : "bg-green-600 text-white hover:bg-green-700";

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
        isFollowing ? followingStyle : notFollowingStyle
      } disabled:opacity-50`}
    >
      {loading ? "..." : isFollowing ? "フォロー中" : "フォロー"}
    </button>
  );
}
