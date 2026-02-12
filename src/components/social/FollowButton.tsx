"use client";

import { useState } from "react";

type Props = {
  targetUserId: string;
  initialFollowing: boolean;
};

export default function FollowButton({ targetUserId, initialFollowing }: Props) {
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

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${
        isFollowing
          ? "bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600"
          : "bg-green-600 text-white hover:bg-green-700"
      } disabled:opacity-50`}
    >
      {loading ? "..." : isFollowing ? "フォロー中" : "フォローする"}
    </button>
  );
}
