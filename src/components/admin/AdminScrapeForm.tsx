"use client";

import { useState } from "react";

type ScrapedEntry = {
  post_number: number;
  gate_number: number | null;
  horse_name: string;
  sex: string;
  jockey: string;
  weight: number | null;
  odds: number | null;
  popularity: number | null;
};

type ScrapedRace = {
  race_id_external: string;
  name: string;
  grade: string | null;
  race_date: string;
  post_time: string | null;
  course_name: string;
  track_type: string;
  distance: number;
  race_number: number;
  entries: ScrapedEntry[];
  already_registered: boolean;
  selected?: boolean;
};

type RegistrationResult = {
  registered: number;
  skipped: number;
  failed: number;
  results: { name: string; status: string; entries_count?: number; error?: string }[];
};

export default function AdminScrapeForm() {
  const [date, setDate] = useState(() => {
    const d = new Date();
    const next = new Date(d);
    // 次の土曜日を計算
    const dayOfWeek = d.getDay();
    const daysUntilSat = dayOfWeek <= 6 ? (6 - dayOfWeek) : 0;
    next.setDate(d.getDate() + (daysUntilSat === 0 && d.getHours() >= 16 ? 1 : daysUntilSat));
    return next.toISOString().split("T")[0];
  });

  const [races, setRaces] = useState<ScrapedRace[]>([]);
  const [loading, setLoading] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [result, setResult] = useState<RegistrationResult | null>(null);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState("");
  const [expandedRace, setExpandedRace] = useState<string | null>(null);

  // ── スクレイピング実行 ──
  const handleScrape = async () => {
    setLoading(true);
    setError("");
    setResult(null);
    setRaces([]);
    setProgress("レース一覧を取得中...");

    try {
      const dateStr = date.replace(/-/g, "");
      const res = await fetch(`/api/admin/scrape?date=${dateStr}`);
      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "取得に失敗しました");
        return;
      }

      if (json.races?.length === 0) {
        setError("この日のレースが見つかりませんでした。出馬表が公開されているか確認してください。");
        return;
      }

      // 未登録レースをデフォルトで選択
      const racesWithSelection = json.races.map((r: ScrapedRace) => ({
        ...r,
        selected: !r.already_registered,
      }));

      setRaces(racesWithSelection);
      setProgress("");
    } catch (err: any) {
      setError(err.message || "ネットワークエラー");
    } finally {
      setLoading(false);
    }
  };

  // ── 一括登録 ──
  const handleRegister = async () => {
    const selectedRaces = races.filter(r => r.selected && !r.already_registered);
    if (selectedRaces.length === 0) {
      setError("登録するレースを選択してください");
      return;
    }

    setRegistering(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/admin/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ races: selectedRaces }),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "登録に失敗しました");
        return;
      }

      setResult(json);

      // 登録済みフラグを更新
      setRaces(prev => prev.map(r => {
        const res = json.results?.find((x: any) => x.name === r.name && x.status === "registered");
        if (res) return { ...r, already_registered: true, selected: false };
        return r;
      }));
    } catch (err: any) {
      setError(err.message || "登録エラー");
    } finally {
      setRegistering(false);
    }
  };

  // ── 選択トグル ──
  const toggleRace = (raceIdExt: string) => {
    setRaces(prev =>
      prev.map(r => r.race_id_external === raceIdExt ? { ...r, selected: !r.selected } : r)
    );
  };

  // ── 全選択 / 全解除 ──
  const toggleAll = (selected: boolean) => {
    setRaces(prev =>
      prev.map(r => r.already_registered ? r : { ...r, selected })
    );
  };

  // ── 統計 ──
  const newRaces = races.filter(r => !r.already_registered);
  const selectedCount = races.filter(r => r.selected && !r.already_registered).length;
  const registeredCount = races.filter(r => r.already_registered).length;
  const totalEntries = races.filter(r => r.selected && !r.already_registered)
    .reduce((sum, r) => sum + r.entries.length, 0);

  // ── 競馬場ごとにグルーピング ──
  const groupedRaces = races.reduce((acc, race) => {
    if (!acc[race.course_name]) acc[race.course_name] = [];
    acc[race.course_name].push(race);
    return acc;
  }, {} as Record<string, ScrapedRace[]>);

  const gradeColors: Record<string, string> = {
    G1: "bg-red-100 text-red-700 border-red-300",
    G2: "bg-blue-100 text-blue-700 border-blue-300",
    G3: "bg-green-100 text-green-700 border-green-300",
    OP: "bg-purple-100 text-purple-700 border-purple-300",
    L: "bg-yellow-100 text-yellow-700 border-yellow-300",
  };

  return (
    <div className="space-y-6">
      {/* ── 日付選択 & 取得ボタン ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          📥 netkeiba からレースデータを取得
        </h3>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">開催日</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>
          <div className="flex gap-2">
            {/* 今週末のクイック選択 */}
            {getWeekendDates().map(d => (
              <button
                key={d.value}
                onClick={() => setDate(d.value)}
                className={`px-3 py-2.5 rounded-lg text-xs font-bold border transition-colors ${
                  date === d.value
                    ? "bg-green-600 text-white border-green-600"
                    : "bg-white text-gray-600 border-gray-300 hover:border-green-400"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
          <button
            onClick={handleScrape}
            disabled={loading}
            className="bg-green-600 text-white px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {loading ? (
              <>
                <span className="animate-spin">⏳</span>
                取得中...（約1〜2分）
              </>
            ) : (
              <>🔍 出馬表を取得</>
            )}
          </button>
        </div>
        {progress && (
          <div className="mt-3 text-sm text-gray-500 animate-pulse">{progress}</div>
        )}
      </div>

      {/* ── エラー表示 ── */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* ── プレビュー ── */}
      {races.length > 0 && (
        <>
          {/* 統計バー */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-4 text-sm">
              <span className="font-bold text-gray-800">
                📊 {races.length}レース取得
              </span>
              <span className="text-green-600 font-bold">
                ✅ {selectedCount}件選択中
              </span>
              {registeredCount > 0 && (
                <span className="text-gray-400">
                  （{registeredCount}件は登録済み）
                </span>
              )}
              <span className="text-gray-500">
                🐎 合計{totalEntries}頭
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => toggleAll(true)}
                className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
              >
                全選択
              </button>
              <button
                onClick={() => toggleAll(false)}
                className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
              >
                全解除
              </button>
            </div>
          </div>

          {/* 競馬場ごとのレースリスト */}
          {Object.entries(groupedRaces).map(([venue, venueRaces]) => (
            <div key={venue} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-5 py-3 border-b border-gray-200">
                <h4 className="font-bold text-gray-700">🏇 {venue}競馬場（{venueRaces.length}R）</h4>
              </div>
              <div className="divide-y divide-gray-100">
                {venueRaces.map((race) => (
                  <div key={race.race_id_external}>
                    {/* レース行 */}
                    <div
                      className={`px-5 py-3 flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                        race.already_registered ? "opacity-50" : ""
                      }`}
                      onClick={() => !race.already_registered && toggleRace(race.race_id_external)}
                    >
                      {/* チェックボックス */}
                      <input
                        type="checkbox"
                        checked={race.selected || false}
                        disabled={race.already_registered}
                        onChange={() => toggleRace(race.race_id_external)}
                        className="w-4 h-4 text-green-600 rounded border-gray-300 focus:ring-green-500"
                      />

                      {/* レース番号 */}
                      <span className="w-8 text-center font-bold text-gray-600 text-sm">
                        {race.race_number}R
                      </span>

                      {/* グレードバッジ */}
                      {race.grade && (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded border ${gradeColors[race.grade] || "bg-gray-100 text-gray-600"}`}>
                          {race.grade}
                        </span>
                      )}

                      {/* レース名 */}
                      <span className="font-bold text-gray-800 text-sm flex-1 truncate">
                        {race.name}
                      </span>

                      {/* コース情報 */}
                      <span className="text-xs text-gray-500">
                        {race.track_type}{race.distance}m
                      </span>

                      {/* 頭数 */}
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                        {race.entries.length}頭
                      </span>

                      {/* 発走時刻 */}
                      {race.post_time && (
                        <span className="text-xs text-gray-500">{race.post_time}</span>
                      )}

                      {/* 登録済みバッジ */}
                      {race.already_registered && (
                        <span className="text-xs bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full">
                          登録済み
                        </span>
                      )}

                      {/* 展開ボタン */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedRace(
                            expandedRace === race.race_id_external ? null : race.race_id_external
                          );
                        }}
                        className="text-gray-400 hover:text-gray-600 text-sm"
                      >
                        {expandedRace === race.race_id_external ? "▲" : "▼"}
                      </button>
                    </div>

                    {/* 出走馬プレビュー（展開時） */}
                    {expandedRace === race.race_id_external && (
                      <div className="px-5 pb-4 bg-gray-50">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-gray-500 border-b border-gray-200">
                              <th className="py-1 text-left w-10">番</th>
                              <th className="py-1 text-left">馬名</th>
                              <th className="py-1 text-left">騎手</th>
                              <th className="py-1 text-right">斤量</th>
                              <th className="py-1 text-right">オッズ</th>
                              <th className="py-1 text-right">人気</th>
                            </tr>
                          </thead>
                          <tbody>
                            {race.entries.map((e) => (
                              <tr key={e.post_number} className="border-b border-gray-100">
                                <td className="py-1 font-bold">{e.post_number}</td>
                                <td className="py-1 font-bold text-gray-800">{e.horse_name}</td>
                                <td className="py-1 text-gray-600">{e.jockey}</td>
                                <td className="py-1 text-right text-gray-600">{e.weight || "-"}</td>
                                <td className="py-1 text-right text-gray-600">{e.odds || "-"}</td>
                                <td className="py-1 text-right text-gray-600">
                                  {e.popularity ? `${e.popularity}人気` : "-"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* ── 一括登録ボタン ── */}
          <button
            onClick={handleRegister}
            disabled={registering || selectedCount === 0}
            className="w-full bg-green-600 text-white py-4 rounded-xl text-lg font-bold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {registering ? (
              <span className="animate-pulse">⏳ 登録中... しばらくお待ちください</span>
            ) : (
              <>🏇 {selectedCount}レース（{totalEntries}頭）を一括登録</>
            )}
          </button>
        </>
      )}

      {/* ── 登録結果 ── */}
      {result && (
        <div className="bg-white rounded-xl border border-green-200 p-5 space-y-3">
          <h3 className="font-bold text-green-700 text-lg">✅ 登録完了！</h3>
          <div className="flex gap-6 text-sm">
            <span className="text-green-600 font-bold">✅ 登録: {result.registered}件</span>
            <span className="text-gray-500">⏭ スキップ: {result.skipped}件</span>
            {result.failed > 0 && (
              <span className="text-red-500">❌ 失敗: {result.failed}件</span>
            )}
          </div>
          <div className="max-h-60 overflow-y-auto space-y-1">
            {result.results.map((r, i) => (
              <div key={i} className="text-xs flex items-center gap-2">
                <span>{r.status === "registered" ? "✅" : r.status === "skipped" ? "⏭" : "❌"}</span>
                <span className="text-gray-700">{r.name}</span>
                {r.entries_count != null && (
                  <span className="text-gray-400">({r.entries_count}頭)</span>
                )}
                {r.error && <span className="text-red-500">{r.error}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── 今週末の日付を取得 ──
function getWeekendDates() {
  const today = new Date();
  const dates = [];

  // 今日を含む直近の土日を探す
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const day = d.getDay();
    if (day === 0 || day === 6) {
      const value = d.toISOString().split("T")[0];
      const dayLabel = day === 6 ? "土" : "日";
      const label = `${d.getMonth() + 1}/${d.getDate()}(${dayLabel})`;
      dates.push({ value, label });
      if (dates.length >= 4) break;
    }
  }

  return dates;
}
