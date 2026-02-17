"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/contexts/ThemeContext";
import AvatarPicker from "@/components/ui/AvatarPicker";
import HandleInput from "@/components/ui/HandleInput";
import { DEFAULT_AVATAR } from "@/lib/constants/avatars";

type Props = {
  initialName: string;
  initialBio: string;
  avatarUrl: string | null;
  avatarEmoji: string | null;
  userHandle: string | null;
};

export default function ProfileEditForm({ initialName, initialBio, avatarUrl, avatarEmoji, userHandle }: Props) {
  const { isDark } = useTheme();
  const [name, setName] = useState(initialName);
  const [bio, setBio] = useState(initialBio);
  const [selectedAvatar, setSelectedAvatar] = useState(avatarEmoji || DEFAULT_AVATAR);
  const [handle, setHandle] = useState(userHandle || "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

  const cardBg = isDark ? "bg-slate-900 border-slate-700" : "bg-white border-gray-100";
  const textSecondary = isDark ? "text-slate-400" : "text-gray-600";
  const textMuted = isDark ? "text-slate-500" : "text-gray-400";
  const inputBg = isDark ? "bg-slate-800 border-slate-700 text-slate-100" : "bg-white border-gray-200 text-gray-900";
  const inputFocus = isDark ? "focus:ring-amber-500" : "focus:ring-green-500";
  const btnPrimary = isDark ? "bg-amber-500 text-slate-900 hover:bg-amber-400" : "bg-green-600 text-white hover:bg-green-700";
  const btnSecondary = isDark ? "bg-slate-700 text-slate-300 hover:bg-slate-600" : "bg-gray-100 text-gray-600 hover:bg-gray-200";

  const handleSave = async () => {
    if (!name.trim()) {
      setMessage("表示名は必須です");
      return;
    }
    if (!handle || handle.length < 3) {
      setMessage("ユーザーID（3文字以上）は必須です");
      return;
    }
    setLoading(true);
    setMessage("");

    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        display_name: name.trim(),
        bio: bio.trim(),
        avatar_emoji: selectedAvatar,
        user_handle: handle,
      }),
    });

    if (res.ok) {
      setMessage("✅ 保存しました！");
      setTimeout(() => {
        router.push("/mypage");
        router.refresh();
      }, 1000);
    } else {
      const data = await res.json();
      setMessage("❌ " + (data.error ?? "保存に失敗しました"));
    }
    setLoading(false);
  };

  return (
    <div className={`rounded-2xl border p-6 space-y-5 ${cardBg}`}>
      {/* アバター選択 */}
      <AvatarPicker selected={selectedAvatar} onSelect={setSelectedAvatar} />

      {/* 表示名 */}
      <div>
        <label className={`block text-sm font-bold mb-1 ${textSecondary}`}>表示名 *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={20}
          placeholder="予想太郎"
          className={`w-full border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:border-transparent outline-none ${inputBg} ${inputFocus}`}
        />
        <p className={`text-xs mt-1 ${textMuted}`}>{name.length}/20文字</p>
      </div>

      {/* ユーザーID */}
      <div>
        <label className={`block text-sm font-bold mb-1 ${textSecondary}`}>ユーザーID *</label>
        <HandleInput value={handle} onChange={setHandle} />
      </div>

      {/* 自己紹介 */}
      <div>
        <label className={`block text-sm font-bold mb-1 ${textSecondary}`}>自己紹介</label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={200}
          rows={3}
          placeholder="自己紹介を書いてみよう..."
          className={`w-full border rounded-xl px-4 py-3 text-sm resize-none focus:ring-2 focus:border-transparent outline-none ${inputBg} ${inputFocus}`}
        />
        <p className={`text-xs mt-1 ${textMuted}`}>{bio.length}/200文字</p>
      </div>

      {message && (
        <div className={`text-sm p-3 rounded-lg ${
          message.startsWith("✅") 
            ? isDark ? "bg-green-500/20 text-green-400" : "bg-green-50 text-green-700"
            : isDark ? "bg-red-500/20 text-red-400" : "bg-red-50 text-red-600"
        }`}>
          {message}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={() => router.back()}
          className={`flex-1 py-3 font-medium rounded-xl transition-colors ${btnSecondary}`}
        >
          キャンセル
        </button>
        <button
          onClick={handleSave}
          disabled={loading || !name.trim() || handle.length < 3}
          className={`flex-1 py-3 font-bold rounded-xl disabled:opacity-40 transition-colors ${btnPrimary}`}
        >
          {loading ? "保存中..." : "保存する"}
        </button>
      </div>
    </div>
  );
}
