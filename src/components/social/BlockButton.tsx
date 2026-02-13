"use client";
import { useState } from "react";

export default function BlockButton({ targetUserId, initialBlocked }: { targetUserId: string; initialBlocked: boolean }) {
  const [blocked, setBlocked] = useState(initialBlocked);
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    const msg = blocked ? "ブロックを解除しますか？" : "このユーザーをブロックしますか？\nブロックすると相互フォローが解除され、相手のコメントがタイムラインに表示されなくなります。";
    if (!confirm(msg)) return;
    setLoading(true);
    try {
      const res = await fetch("/api/blocks", { method: blocked ? "DELETE" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ blocked_id: targetUserId }) });
      if (res.ok) { setBlocked(!blocked); if (!blocked) window.location.reload(); }
    } catch {}
    setLoading(false);
  };

  return (
    <button onClick={handleToggle} disabled={loading}
      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${blocked ? "bg-gray-200 text-gray-600 hover:bg-gray-300" : "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"} disabled:opacity-50`}>
      {loading ? "..." : blocked ? "ブロック解除" : "🚫 ブロック"}
    </button>
  );
}
