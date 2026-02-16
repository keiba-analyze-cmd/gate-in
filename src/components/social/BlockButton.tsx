"use client";

import { useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";

type Props = {
  targetUserId: string;
  initialBlocked: boolean;
};

export default function BlockButton({ targetUserId, initialBlocked }: Props) {
  const { isDark } = useTheme();
  const [blocked, setBlocked] = useState(initialBlocked);
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    const msg = blocked
      ? "ブロックを解除しますか？"
      : "このユーザーをブロックしますか？\nブロックすると相互フォローが解除され、相手のコメントがタイムラインに表示されなくなります。";
    if (!confirm(msg)) return;
    setLoading(true);
    try {
      const res = await fetch("/api/blocks", {
        method: blocked ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blocked_id: targetUserId }),
      });
      if (res.ok) {
        setBlocked(!blocked);
        if (!blocked) window.location.reload();
      }
    } catch {}
    setLoading(false);
  };

  const blockedStyle = isDark
    ? "bg-slate-700 text-slate-400 hover:bg-slate-600"
    : "bg-gray-200 text-gray-600 hover:bg-gray-300";

  const notBlockedStyle = isDark
    ? "bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30"
    : "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200";

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`px-2 py-1.5 text-[10px] font-bold rounded-lg transition-colors ${
        blocked ? blockedStyle : notBlockedStyle
      } disabled:opacity-50`}
    >
      {loading ? "..." : blocked ? "解除" : "🚫"}
    </button>
  );
}
