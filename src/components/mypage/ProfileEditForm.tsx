"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  initialName: string;
  initialBio: string;
  avatarUrl: string | null;
};

export default function ProfileEditForm({ initialName, initialBio, avatarUrl }: Props) {
  const [name, setName] = useState(initialName);
  const [bio, setBio] = useState(initialBio);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

  const handleSave = async () => {
    if (!name.trim()) {
      setMessage("表示名は必須です");
      return;
    }
    setLoading(true);
    setMessage("");

    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ display_name: name.trim(), bio: bio.trim() }),
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
    <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
      {/* アバター */}
      <div className="flex items-center gap-4">
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="w-20 h-20 rounded-full" />
        ) : (
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center text-3xl">🏇</div>
        )}
        <p className="text-xs text-gray-400">
          アバターはログインサービス（Google/X）の画像が使われます
        </p>
      </div>

      {/* 表示名 */}
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-1">表示名 *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={20}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
        />
        <p className="text-xs text-gray-400 mt-1">{name.length}/20文字</p>
      </div>

      {/* 自己紹介 */}
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-1">自己紹介</label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={200}
          rows={3}
          placeholder="自己紹介を書いてみよう..."
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
        />
        <p className="text-xs text-gray-400 mt-1">{bio.length}/200文字</p>
      </div>

      {message && (
        <div className={`text-sm p-3 rounded-lg ${
          message.startsWith("✅") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
        }`}>
          {message}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={() => router.back()}
          className="flex-1 py-3 bg-gray-100 text-gray-600 font-medium rounded-xl hover:bg-gray-200 transition-colors"
        >
          キャンセル
        </button>
        <button
          onClick={handleSave}
          disabled={loading || !name.trim()}
          className="flex-1 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 disabled:opacity-40 transition-colors"
        >
          {loading ? "保存中..." : "保存する"}
        </button>
      </div>
    </div>
  );
}
