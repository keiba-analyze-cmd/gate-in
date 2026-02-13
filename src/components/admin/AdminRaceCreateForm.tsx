"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type EntryRow = {
  post_number: string;
  horse_name: string;
  jockey: string;
  gate_number: string;
  odds: string;
  popularity: string;
  weight: string;
  sex: string;
};

const EMPTY_ENTRY: EntryRow = {
  post_number: "",
  horse_name: "",
  jockey: "",
  gate_number: "",
  odds: "",
  popularity: "",
  weight: "",
  sex: "牡",
};

const COURSES = ["東京", "中山", "阪神", "京都", "小倉", "新潟", "福島", "札幌", "函館", "中京"];
const GRADES = [
  { value: "", label: "なし（一般）" },
  { value: "G1", label: "G1" },
  { value: "G2", label: "G2" },
  { value: "G3", label: "G3" },
  { value: "OP", label: "オープン" },
  { value: "L", label: "リステッド" },
];
const TRACK_TYPES = ["芝", "ダート", "障害"];

export default function AdminRaceCreateForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // レース情報
  const [name, setName] = useState("");
  const [grade, setGrade] = useState("");
  const [raceDate, setRaceDate] = useState("");
  const [postTime, setPostTime] = useState("");
  const [courseName, setCourseName] = useState("東京");
  const [trackType, setTrackType] = useState("芝");
  const [distance, setDistance] = useState("");
  const [raceNumber, setRaceNumber] = useState("");
  const [status, setStatus] = useState("voting_open");

  // 出走馬
  const [entries, setEntries] = useState<EntryRow[]>(
    Array.from({ length: 8 }, (_, i) => ({
      ...EMPTY_ENTRY,
      post_number: String(i + 1),
    }))
  );

  const updateEntry = (idx: number, field: keyof EntryRow, value: string) => {
    setEntries((prev) =>
      prev.map((e, i) => (i === idx ? { ...e, [field]: value } : e))
    );
  };

  const addRows = (count: number) => {
    const lastNum = entries.length > 0
      ? Math.max(...entries.map((e) => parseInt(e.post_number) || 0))
      : 0;
    const newRows = Array.from({ length: count }, (_, i) => ({
      ...EMPTY_ENTRY,
      post_number: String(lastNum + i + 1),
    }));
    setEntries((prev) => [...prev, ...newRows]);
  };

  const removeEntry = (idx: number) => {
    setEntries((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    setError("");
    setSuccess("");

    // バリデーション
    if (!name.trim()) { setError("レース名を入力してください"); return; }
    if (!raceDate) { setError("開催日を入力してください"); return; }
    if (!distance) { setError("距離を入力してください"); return; }
    if (!raceNumber) { setError("レース番号を入力してください"); return; }

    const validEntries = entries.filter((e) => e.horse_name.trim() && e.jockey.trim());
    if (validEntries.length === 0) {
      setError("出走馬を1頭以上入力してください（馬名と騎手は必須）");
      return;
    }

    // 馬番の重複チェック
    const postNums = validEntries.map((e) => e.post_number);
    if (new Set(postNums).size !== postNums.length) {
      setError("馬番が重複しています");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/admin/races", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          grade,
          race_date: raceDate,
          post_time: postTime ? `${raceDate}T${postTime}:00+09:00` : null,
          course_name: courseName,
          track_type: trackType,
          distance,
          race_number: raceNumber,
          status,
          entries: validEntries,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "登録に失敗しました");
        setLoading(false);
        return;
      }

      setSuccess(
        `✅ 「${data.race_name}」を登録しました（出走馬: ${data.entries_count}頭）`
      );

      // フォームリセット
      setName("");
      setGrade("");
      setDistance("");
      setRaceNumber("");
      setPostTime("");
      setEntries(
        Array.from({ length: 8 }, (_, i) => ({
          ...EMPTY_ENTRY,
          post_number: String(i + 1),
        }))
      );

      // 3秒後にページ更新
      setTimeout(() => router.refresh(), 2000);
    } catch {
      setError("ネットワークエラー");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ====== レース基本情報 ====== */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
        <h2 className="text-base font-bold text-gray-800">📝 レース基本情報</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* レース名 */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-gray-600 mb-1">
              レース名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: 天皇賞（春）"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
            />
          </div>

          {/* グレード */}
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">グレード</label>
            <select
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-green-500 outline-none"
            >
              {GRADES.map((g) => (
                <option key={g.value} value={g.value}>{g.label}</option>
              ))}
            </select>
          </div>

          {/* 開催日 */}
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">
              開催日 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={raceDate}
              onChange={(e) => setRaceDate(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500 outline-none"
            />
          </div>

          {/* 発走時刻 */}
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">発走時刻</label>
            <input
              type="time"
              value={postTime}
              onChange={(e) => setPostTime(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500 outline-none"
            />
          </div>

          {/* 競馬場 */}
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">
              競馬場 <span className="text-red-500">*</span>
            </label>
            <select
              value={courseName}
              onChange={(e) => setCourseName(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-green-500 outline-none"
            >
              {COURSES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* 馬場 */}
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">
              馬場 <span className="text-red-500">*</span>
            </label>
            <select
              value={trackType}
              onChange={(e) => setTrackType(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-green-500 outline-none"
            >
              {TRACK_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* 距離 */}
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">
              距離(m) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
              placeholder="例: 2000"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500 outline-none"
            />
          </div>

          {/* レース番号 */}
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">
              レース番号 <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={raceNumber}
              onChange={(e) => setRaceNumber(e.target.value)}
              placeholder="例: 11"
              min="1"
              max="12"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500 outline-none"
            />
          </div>

          {/* ステータス */}
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">ステータス</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-green-500 outline-none"
            >
              <option value="upcoming">準備中（upcoming）</option>
              <option value="voting_open">投票受付中（voting_open）</option>
            </select>
          </div>
        </div>
      </div>

      {/* ====== 出走馬リスト ====== */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-800">🐴 出走馬</h2>
          <span className="text-xs text-gray-400">
            馬名と騎手が入力された行のみ登録されます
          </span>
        </div>

        {/* ヘッダー（PC） */}
        <div className="hidden md:grid md:grid-cols-[50px_1fr_1fr_80px_80px_80px_40px] gap-2 text-xs font-bold text-gray-500 px-1">
          <span>馬番</span>
          <span>馬名 *</span>
          <span>騎手 *</span>
          <span>オッズ</span>
          <span>人気</span>
          <span>斤量</span>
          <span></span>
        </div>

        {/* エントリー行 */}
        <div className="space-y-2">
          {entries.map((entry, idx) => (
            <div
              key={idx}
              className="grid grid-cols-[50px_1fr_1fr_80px_80px_80px_40px] gap-2 items-center"
            >
              {/* 馬番 */}
              <input
                type="number"
                value={entry.post_number}
                onChange={(e) => updateEntry(idx, "post_number", e.target.value)}
                className="border border-gray-200 rounded-lg px-2 py-2 text-sm text-center focus:ring-2 focus:ring-green-500 outline-none"
                min="1"
              />
              {/* 馬名 */}
              <input
                type="text"
                value={entry.horse_name}
                onChange={(e) => updateEntry(idx, "horse_name", e.target.value)}
                placeholder="馬名"
                className="border border-gray-200 rounded-lg px-2 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none"
              />
              {/* 騎手 */}
              <input
                type="text"
                value={entry.jockey}
                onChange={(e) => updateEntry(idx, "jockey", e.target.value)}
                placeholder="騎手"
                className="border border-gray-200 rounded-lg px-2 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none"
              />
              {/* オッズ */}
              <input
                type="number"
                step="0.1"
                value={entry.odds}
                onChange={(e) => updateEntry(idx, "odds", e.target.value)}
                placeholder="オッズ"
                className="border border-gray-200 rounded-lg px-2 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none"
              />
              {/* 人気 */}
              <input
                type="number"
                value={entry.popularity}
                onChange={(e) => updateEntry(idx, "popularity", e.target.value)}
                placeholder="人気"
                className="border border-gray-200 rounded-lg px-2 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none"
              />
              {/* 斤量 */}
              <input
                type="number"
                step="0.5"
                value={entry.weight}
                onChange={(e) => updateEntry(idx, "weight", e.target.value)}
                placeholder="斤量"
                className="border border-gray-200 rounded-lg px-2 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none"
              />
              {/* 削除 */}
              <button
                onClick={() => removeEntry(idx)}
                className="text-gray-300 hover:text-red-500 transition-colors text-lg text-center"
                title="削除"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        {/* 行追加ボタン */}
        <div className="flex gap-2">
          <button
            onClick={() => addRows(1)}
            className="px-4 py-2 text-sm font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
          >
            ＋ 1行追加
          </button>
          <button
            onClick={() => addRows(4)}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            ＋ 4行追加
          </button>
        </div>
      </div>

      {/* ====== エラー / 成功メッセージ ====== */}
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl text-sm font-medium">
          ⚠️ {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 text-green-700 p-4 rounded-xl text-sm font-medium">
          {success}
        </div>
      )}

      {/* ====== 登録ボタン ====== */}
      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full py-4 bg-green-600 text-white font-bold text-base rounded-2xl hover:bg-green-700 transition-colors disabled:opacity-40 shadow-lg"
      >
        {loading ? "登録中..." : "🏇 このレースを登録する"}
      </button>
    </div>
  );
}
