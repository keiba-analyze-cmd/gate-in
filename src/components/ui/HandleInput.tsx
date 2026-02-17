"use client";

import { useState, useEffect, useCallback } from "react";
import { validateHandle, normalizeHandle } from "@/lib/constants/handles";

type Props = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

export default function HandleInput({ value, onChange, className = "" }: Props) {
  const [status, setStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");
  const [message, setMessage] = useState("");

  const checkAvailability = useCallback(async (handle: string) => {
    const normalized = normalizeHandle(handle);
    const validation = validateHandle(normalized);

    if (!validation.ok) {
      setStatus("invalid");
      setMessage(validation.error!);
      return;
    }

    setStatus("checking");
    setMessage("確認中...");

    try {
      const res = await fetch(`/api/profile/check-handle?handle=${encodeURIComponent(normalized)}`);
      const data = await res.json();

      if (data.available) {
        setStatus("available");
        setMessage("✅ 使用できます");
      } else {
        setStatus("taken");
        setMessage("❌ " + (data.error || "既に使われています"));
      }
    } catch {
      setStatus("invalid");
      setMessage("確認に失敗しました");
    }
  }, []);

  useEffect(() => {
    if (!value || value.length < 3) {
      setStatus("idle");
      setMessage(value ? "3文字以上入力してください" : "");
      return;
    }

    const timer = setTimeout(() => checkAvailability(value), 500);
    return () => clearTimeout(timer);
  }, [value, checkAvailability]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // 英小文字・数字・アンダースコアのみ許可
    const raw = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "");
    onChange(raw.slice(0, 20));
  };

  const statusColor =
    status === "available" ? "text-green-600" :
    status === "taken" || status === "invalid" ? "text-red-500" :
    status === "checking" ? "text-blue-500" :
    "text-gray-400";

  return (
    <div>
      <div className={`flex items-center border rounded-xl overflow-hidden ${
        status === "available" ? "border-green-400" :
        status === "taken" || status === "invalid" ? "border-red-400" :
        "border-gray-300"
      } ${className}`}>
        <span className="pl-4 pr-1 text-gray-400 text-sm font-mono">@</span>
        <input
          type="text"
          value={value}
          onChange={handleChange}
          placeholder="keiba_taro"
          maxLength={20}
          className="flex-1 px-2 py-3 text-sm font-mono outline-none bg-transparent"
        />
      </div>
      {message && (
        <p className={`text-xs mt-1 ${statusColor}`}>{message}</p>
      )}
      {!message && value && (
        <p className="text-xs mt-1 text-gray-400">{value.length}/20文字</p>
      )}
    </div>
  );
}
