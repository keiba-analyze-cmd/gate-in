"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AvatarPicker from "@/components/ui/AvatarPicker";
import HandleInput from "@/components/ui/HandleInput";
import { DEFAULT_AVATAR } from "@/lib/constants/avatars";

const AGE_GROUPS = [
  { value: "", label: "選択してください" },
  { value: "10s", label: "10代" },
  { value: "20s", label: "20代" },
  { value: "30s", label: "30代" },
  { value: "40s", label: "40代" },
  { value: "50s", label: "50代" },
  { value: "60s", label: "60代以上" },
];

const GENDERS = [
  { value: "", label: "選択してください" },
  { value: "male", label: "男性" },
  { value: "female", label: "女性" },
  { value: "other", label: "その他" },
  { value: "prefer_not", label: "回答しない" },
];

const EXPERIENCES = [
  { value: "beginner", label: "🔰 初心者（始めたばかり）" },
  { value: "intermediate", label: "📗 中級者（1〜3年）" },
  { value: "advanced", label: "📘 上級者（3年以上）" },
  { value: "expert", label: "📕 ベテラン（10年以上）" },
];

const COURSES = [
  { value: "", label: "選択してください" },
  { value: "tokyo", label: "東京" },
  { value: "nakayama", label: "中山" },
  { value: "hanshin", label: "阪神" },
  { value: "kyoto", label: "京都" },
  { value: "chukyo", label: "中京" },
  { value: "kokura", label: "小倉" },
  { value: "niigata", label: "新潟" },
  { value: "fukushima", label: "福島" },
  { value: "sapporo", label: "札幌" },
  { value: "hakodate", label: "函館" },
];

export default function ProfileSetupPage() {
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [avatarEmoji, setAvatarEmoji] = useState(DEFAULT_AVATAR);
  const [gender, setGender] = useState("");
  const [ageGroup, setAgeGroup] = useState("");
  const [exp, setExp] = useState("beginner");
  const [course, setCourse] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("表示名を入力してください");
      return;
    }
    if (!handle || handle.length < 3) {
      setError("ユーザーID（3文字以上）を入力してください");
      return;
    }
    setLoading(true);
    setError("");

    const res = await fetch("/api/profile/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        display_name: name.trim(),
        user_handle: handle,
        avatar_emoji: avatarEmoji,
        gender: gender || null,
        age_group: ageGroup || null,
        horse_racing_exp: exp,
        favorite_course: course || null,
      }),
    });

    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error ?? "保存に失敗しました");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🏇</div>
          <h1 className="text-2xl font-black text-gray-800">ようこそ！</h1>
          <p className="text-sm text-gray-500 mt-1">プロフィールを設定しましょう</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
          {/* アバター選択 */}
          <AvatarPicker selected={avatarEmoji} onSelect={setAvatarEmoji} size="sm" />

          {/* 表示名（必須） */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">
              表示名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="予想太郎"
              maxLength={20}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none"
            />
            <p className="text-xs text-gray-400 mt-1">他のユーザーに表示されます（20文字以内）</p>
          </div>

          {/* ユーザーID（必須） */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">
              ユーザーID <span className="text-red-500">*</span>
            </label>
            <HandleInput value={handle} onChange={setHandle} />
            <p className="text-xs text-gray-400 mt-1">英小文字・数字・アンダースコア（3〜20文字）</p>
          </div>

          {/* 性別 */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">性別</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm bg-white focus:border-green-500 outline-none"
            >
              {GENDERS.map((g) => (
                <option key={g.value} value={g.value}>{g.label}</option>
              ))}
            </select>
          </div>

          {/* 年代 */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">年代</label>
            <select
              value={ageGroup}
              onChange={(e) => setAgeGroup(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm bg-white focus:border-green-500 outline-none"
            >
              {AGE_GROUPS.map((a) => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
          </div>

          {/* 競馬歴 */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">競馬歴</label>
            <div className="grid grid-cols-2 gap-2">
              {EXPERIENCES.map((e) => (
                <button
                  key={e.value}
                  onClick={() => setExp(e.value)}
                  className={`text-left px-3 py-2.5 rounded-xl text-sm border transition-colors ${
                    exp === e.value
                      ? "border-green-500 bg-green-50 text-green-700 font-bold"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {e.label}
                </button>
              ))}
            </div>
          </div>

          {/* お気に入り競馬場 */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">お気に入り競馬場</label>
            <select
              value={course}
              onChange={(e) => setCourse(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm bg-white focus:border-green-500 outline-none"
            >
              {COURSES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading || !name.trim() || handle.length < 3}
            className="w-full py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 disabled:opacity-40 transition-colors text-base"
          >
            {loading ? "保存中..." : "はじめる 🏇"}
          </button>

          <p className="text-xs text-gray-400 text-center">
            性別・年代は任意です。後から変更できます。
          </p>
        </div>
      </div>
    </div>
  );
}
