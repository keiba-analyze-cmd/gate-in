#!/bin/bash
# ============================================
# Phase B: レース新規登録GUI セットアップ
# gate-in/ フォルダのルートで実行:
#   bash phase-b-race-create-setup.sh
# ============================================

set -e
echo "🏇 Phase B: レース新規登録GUI セットアップ開始..."

# -----------------------------------------------
# 1. API Route: レース + 出走馬 一括作成
# -----------------------------------------------
mkdir -p src/app/api/admin/races

cat > src/app/api/admin/races/route.ts << 'EOF'
import { NextResponse } from "next/server";
import { requireAdmin, createAdminClient } from "@/lib/admin";

export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch (res) {
    if (res instanceof Response) return res;
    return NextResponse.json({ error: "認証エラー" }, { status: 401 });
  }

  const body = await request.json();
  const {
    name, grade, race_date, post_time, course_name,
    track_type, distance, race_number, status, entries,
  } = body;

  // バリデーション
  if (!name || !race_date || !course_name || !track_type || !distance || !race_number) {
    return NextResponse.json(
      { error: "必須項目が不足しています（レース名, 日付, 競馬場, 馬場, 距離, レース番号）" },
      { status: 400 }
    );
  }

  if (!entries || !Array.isArray(entries) || entries.length === 0) {
    return NextResponse.json(
      { error: "出走馬を1頭以上登録してください" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // 1. レースを作成
  const { data: race, error: raceErr } = await admin
    .from("races")
    .insert({
      name,
      grade: grade || null,
      race_date,
      post_time: post_time || null,
      course_name,
      track_type,
      distance: parseInt(distance),
      race_number: parseInt(race_number),
      head_count: entries.length,
      status: status || "upcoming",
    })
    .select()
    .single();

  if (raceErr || !race) {
    return NextResponse.json(
      { error: "レース作成エラー: " + (raceErr?.message ?? "") },
      { status: 500 }
    );
  }

  // 2. 出走馬を登録
  const entryInserts = [];
  for (const entry of entries) {
    if (!entry.horse_name || !entry.jockey) continue;

    // 馬を検索 or 作成
    let horseId: string;
    const { data: existingHorse } = await admin
      .from("horses")
      .select("id")
      .eq("name", entry.horse_name.trim())
      .maybeSingle();

    if (existingHorse) {
      horseId = existingHorse.id;
    } else {
      const { data: newHorse, error: horseErr } = await admin
        .from("horses")
        .insert({
          name: entry.horse_name.trim(),
          sex: entry.sex || "牡",
        })
        .select("id")
        .single();

      if (horseErr || !newHorse) {
        // 馬の作成に失敗してもレースは作成済みなので続行
        console.error("馬作成エラー:", entry.horse_name, horseErr?.message);
        continue;
      }
      horseId = newHorse.id;
    }

    entryInserts.push({
      race_id: race.id,
      horse_id: horseId,
      post_number: parseInt(entry.post_number),
      gate_number: entry.gate_number ? parseInt(entry.gate_number) : null,
      jockey: entry.jockey.trim(),
      weight: entry.weight ? parseFloat(entry.weight) : null,
      odds: entry.odds ? parseFloat(entry.odds) : null,
      popularity: entry.popularity ? parseInt(entry.popularity) : null,
    });
  }

  if (entryInserts.length > 0) {
    const { error: entryErr } = await admin.from("race_entries").insert(entryInserts);
    if (entryErr) {
      return NextResponse.json(
        { error: "出走馬登録エラー: " + entryErr.message, race_id: race.id },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({
    success: true,
    race_id: race.id,
    race_name: race.name,
    entries_count: entryInserts.length,
  });
}

// レース一覧取得（管理用）
export async function GET() {
  try {
    await requireAdmin();
  } catch (res) {
    if (res instanceof Response) return res;
    return NextResponse.json({ error: "認証エラー" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("races")
    .select("id, name, grade, race_date, course_name, race_number, status, head_count")
    .order("race_date", { ascending: false })
    .order("race_number", { ascending: true })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ races: data });
}
EOF

echo "  ✅ API Route 作成完了"

# -----------------------------------------------
# 2. レース新規登録フォーム
# -----------------------------------------------
cat > src/components/admin/AdminRaceCreateForm.tsx << 'EOF'
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
EOF

echo "  ✅ AdminRaceCreateForm 作成完了"

# -----------------------------------------------
# 3. 管理画面を更新（タブ付き）
# -----------------------------------------------
cat > src/app/\(main\)/admin/page.tsx << 'EOF'
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AdminRaceList from "@/components/admin/AdminRaceList";
import AdminRaceCreateForm from "@/components/admin/AdminRaceCreateForm";
import AdminTabs from "@/components/admin/AdminTabs";

type Props = {
  searchParams: Promise<{ tab?: string }>;
};

export default async function AdminPage({ searchParams }: Props) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // 管理者チェック
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) redirect("/");

  const activeTab = params.tab ?? "create";

  // 投票受付中 + 投票締切のレース（結果確定待ち）
  const { data: pendingRaces } = await supabase
    .from("races")
    .select("*, race_entries(id, post_number, horses(name))")
    .in("status", ["voting_open", "voting_closed"])
    .order("race_date", { ascending: false });

  // 結果確定済みのレース（直近10件）
  const { data: finishedRaces } = await supabase
    .from("races")
    .select("*")
    .eq("status", "finished")
    .order("race_date", { ascending: false })
    .limit(10);

  // 全レース（直近20件）
  const { data: allRaces } = await supabase
    .from("races")
    .select("id, name, grade, race_date, course_name, race_number, status, head_count")
    .order("race_date", { ascending: false })
    .order("race_number", { ascending: true })
    .limit(20);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">⚙️ 管理画面</h1>
      </div>

      {/* タブ切り替え */}
      <AdminTabs activeTab={activeTab} />

      {/* ====== レース新規登録 ====== */}
      {activeTab === "create" && (
        <AdminRaceCreateForm />
      )}

      {/* ====== 結果入力 ====== */}
      {activeTab === "results" && (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
            💡 レースの結果を入力して、ポイントを自動計算します。
          </div>

          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-3">📋 結果入力待ち</h2>
            {pendingRaces && pendingRaces.length > 0 ? (
              <AdminRaceList races={pendingRaces} type="pending" />
            ) : (
              <div className="bg-white rounded-xl p-8 text-center text-gray-400">
                結果入力待ちのレースはありません
              </div>
            )}
          </section>

          {finishedRaces && finishedRaces.length > 0 && (
            <section>
              <h2 className="text-lg font-bold text-gray-800 mb-3">✅ 確定済み</h2>
              <div className="space-y-2">
                {finishedRaces.map((race) => (
                  <div key={race.id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-sm text-gray-800">{race.name}</span>
                      <span className="text-xs text-gray-400 ml-2">{race.course_name} {race.race_date}</span>
                    </div>
                    <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full">確定済み</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* ====== レース一覧 ====== */}
      {activeTab === "list" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 font-bold text-gray-600">レース</th>
                  <th className="text-left px-4 py-3 font-bold text-gray-600">日付</th>
                  <th className="text-left px-4 py-3 font-bold text-gray-600">競馬場</th>
                  <th className="text-center px-4 py-3 font-bold text-gray-600">頭数</th>
                  <th className="text-center px-4 py-3 font-bold text-gray-600">ステータス</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {allRaces?.map((race) => {
                  const statusMap: Record<string, { label: string; color: string }> = {
                    upcoming: { label: "準備中", color: "bg-gray-100 text-gray-600" },
                    voting_open: { label: "受付中", color: "bg-green-100 text-green-700" },
                    voting_closed: { label: "締切", color: "bg-yellow-100 text-yellow-700" },
                    finished: { label: "確定", color: "bg-blue-100 text-blue-700" },
                  };
                  const st = statusMap[race.status] ?? { label: race.status, color: "bg-gray-100" };
                  return (
                    <tr key={race.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {race.grade && (
                            <span className="text-[10px] font-bold bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">
                              {race.grade}
                            </span>
                          )}
                          <span className="font-medium text-gray-800">{race.name}</span>
                          <span className="text-xs text-gray-400">{race.race_number}R</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{race.race_date}</td>
                      <td className="px-4 py-3 text-gray-600">{race.course_name}</td>
                      <td className="px-4 py-3 text-center text-gray-600">{race.head_count ?? "-"}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${st.color}`}>
                          {st.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {(!allRaces || allRaces.length === 0) && (
              <div className="p-8 text-center text-gray-400">登録済みレースはありません</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
EOF

echo "  ✅ 管理画面 更新完了"

# -----------------------------------------------
# 4. タブ切り替えコンポーネント
# -----------------------------------------------
cat > src/components/admin/AdminTabs.tsx << 'EOF'
"use client";

import { useRouter, useSearchParams } from "next/navigation";

const TABS = [
  { key: "create", label: "➕ レース登録", desc: "新しいレースを作成" },
  { key: "results", label: "🏁 結果入力", desc: "着順 → ポイント計算" },
  { key: "list", label: "📋 レース一覧", desc: "登録済みレース" },
];

export default function AdminTabs({ activeTab }: { activeTab: string }) {
  const router = useRouter();

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          onClick={() => router.push(`/admin?tab=${tab.key}`)}
          className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === tab.key
              ? "bg-green-600 text-white shadow-md"
              : "bg-white text-gray-600 border border-gray-200 hover:border-green-300 hover:text-green-600"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
EOF

echo "  ✅ AdminTabs 作成完了"

echo ""
echo "============================================"
echo "🎉 Phase B セットアップ完了！"
echo ""
echo "以下のファイルを作成/更新しました:"
echo "  - src/app/api/admin/races/route.ts (新規)"
echo "  - src/components/admin/AdminRaceCreateForm.tsx (新規)"
echo "  - src/components/admin/AdminTabs.tsx (新規)"
echo "  - src/app/(main)/admin/page.tsx (更新)"
echo ""
echo "次のステップ:"
echo "  1. npm run dev で動作確認"
echo "  2. /admin にアクセスしてレース登録テスト"
echo "  3. 問題なければ git push でデプロイ"
echo "============================================"
