"use client";

import { useState, useRef } from "react";

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
  already_registered?: boolean;
  selected?: boolean;
};

type RegistrationResult = {
  registered: number;
  updated: number;
  failed: number;
  results: { name: string; status: string; entries_count?: number; error?: string }[];
};

export default function AdminScrapeForm() {
  const [races, setRaces] = useState<ScrapedRace[]>([]);
  const [loading, setLoading] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [result, setResult] = useState<RegistrationResult | null>(null);
  const [error, setError] = useState("");
  const [jsonMeta, setJsonMeta] = useState<{ date: string; scraped_at: string } | null>(null);
  const [expandedRace, setExpandedRace] = useState<string | null>(null);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── スクレイピング用 ──
  const [scrapeDate, setScrapeDate] = useState(() => {
    const now = new Date();
    const jstNow = new Date(now.getTime() + (9 * 60 - now.getTimezoneOffset()) * 60000);
    const day = jstNow.getDay();
    const daysUntilSat = day === 6 ? 0 : day === 0 ? 0 : (6 - day);
    const target = new Date(jstNow);
    target.setDate(jstNow.getDate() + daysUntilSat);
    return formatDateJST(target);
  });
  const [scraping, setScraping] = useState(false);
  const [scrapeProgress, setScrapeProgress] = useState({ current: 0, total: 0, message: "" });

  // ── オッズ更新用 ──
  const [updatingOdds, setUpdatingOdds] = useState(false);
  const [oddsResult, setOddsResult] = useState<{ message: string; results: any[] } | null>(null);

  // ── オッズ更新 ──
  const handleUpdateOdds = async () => {
    setUpdatingOdds(true);
    setOddsResult(null);
    setError("");

    try {
      const res = await fetch("/api/admin/scrape-odds", { method: "POST" });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "オッズ更新に失敗しました");
      }
      
      setOddsResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "オッズ更新に失敗しました");
    } finally {
      setUpdatingOdds(false);
    }
  };

  // ── GUI上でスクレイピング → プレビュー表示 ──
  const handleScrapeAndPreview = async (downloadOnly: boolean = false) => {
    setScraping(true);
    setError("");
    setResult(null);
    setRaces([]);
    setScrapeProgress({ current: 0, total: 0, message: "レースID取得中..." });

    try {
      const dateStr = scrapeDate.replace(/-/g, "");
      const fallbackDate = scrapeDate;

      // Step 1: レースID一覧を取得
      const idsRes = await fetch(`/api/admin/scrape?mode=ids&date=${dateStr}`);
      const idsJson = await idsRes.json();
      if (!idsRes.ok) throw new Error(idsJson.error);

      const raceIds: string[] = idsJson.race_ids ?? [];
      if (raceIds.length === 0) {
        setError("この日のレースが見つかりませんでした。");
        return;
      }

      setScrapeProgress({ current: 0, total: raceIds.length, message: `${raceIds.length}レース発見。出馬表を取得中...` });

      // Step 2: 4件ずつバッチでスクレイピング
      const BATCH = 4;
      const allRaces: ScrapedRace[] = [];
      for (let i = 0; i < raceIds.length; i += BATCH) {
        const batch = raceIds.slice(i, i + BATCH);
        const param = batch.join(",");
        const res = await fetch(`/api/admin/scrape?mode=races&race_ids=${param}&fallback_date=${fallbackDate}`);
        const json = await res.json();
        if (json.races) {
          allRaces.push(...json.races.filter((r: any) => !r.error));
        }
        setScrapeProgress({
          current: Math.min(i + BATCH, raceIds.length),
          total: raceIds.length,
          message: `${Math.min(i + BATCH, raceIds.length)}/${raceIds.length} レース取得完了`,
        });
      }

      // ソート
      allRaces.sort((a, b) => {
        if (a.course_name !== b.course_name) return a.course_name.localeCompare(b.course_name);
        return a.race_number - b.race_number;
      });

      const jsonOutput = {
        date: fallbackDate,
        scraped_at: new Date().toISOString(),
        total: allRaces.length,
        total_entries: allRaces.reduce((s, r) => s + r.entries.length, 0),
        races: allRaces,
      };

      if (downloadOnly) {
        // JSONダウンロード
        const blob = new Blob([JSON.stringify(jsonOutput, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `races-${dateStr}.json`;
        a.click();
        URL.revokeObjectURL(url);
        setScrapeProgress({
          current: raceIds.length,
          total: raceIds.length,
          message: `✅ ${allRaces.length}レース（${jsonOutput.total_entries}頭）のJSONをダウンロードしました`,
        });
      } else {
        // プレビュー表示に進む
        await loadRacesToPreview(jsonOutput);
      }
    } catch (err: any) {
      setError(err.message || "スクレイピングエラー");
    } finally {
      setScraping(false);
    }
  };

  // ── JSON(オブジェクト or ファイル)からプレビューに読み込み ──
  const loadRacesToPreview = async (json: any) => {
    setJsonMeta({ date: json.date, scraped_at: json.scraped_at });

    const res = await fetch(`/api/admin/scrape?check_date=${json.date}`);
    const existing = await res.json();
    const existingSet = new Set(
      (existing.registered ?? []).map((r: any) => `${r.course_name}_${r.race_number}`)
    );

    const racesWithSelection = json.races.map((r: ScrapedRace) => {
      const key = `${r.course_name}_${r.race_number}`;
      const alreadyRegistered = existingSet.has(key);
      return { ...r, already_registered: alreadyRegistered, selected: !alreadyRegistered };
    });

    setRaces(racesWithSelection);
  };

  // ── JSONファイル読み込み ──
  const handleFileLoad = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError("");
    setResult(null);
    setRaces([]);

    try {
      const text = await file.text();
      const json = JSON.parse(text);

      if (!json.races || !Array.isArray(json.races)) {
        setError("無効なJSONフォーマットです。");
        return;
      }

      await loadRacesToPreview(json);
    } catch (err: any) {
      setError(`JSONの読み込みに失敗しました: ${err.message}`);
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ── 一括登録（バッチ処理：3レースずつ） ──
  const handleRegister = async () => {
    const selectedRaces = races.filter(r => r.selected);
    if (selectedRaces.length === 0) {
      setError("登録するレースを選択してください");
      return;
    }

    setRegistering(true);
    setError("");
    setResult(null);

    const BATCH_SIZE = 3;
    const allResults: any[] = [];
    let totalRegistered = 0;
    let totalUpdated = 0;
    let totalFailed = 0;

    setBatchProgress({ current: 0, total: selectedRaces.length });

    try {
      for (let i = 0; i < selectedRaces.length; i += BATCH_SIZE) {
        const batch = selectedRaces.slice(i, i + BATCH_SIZE);
        setBatchProgress({ current: i + batch.length, total: selectedRaces.length });

        const res = await fetch("/api/admin/scrape", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ races: batch }),
        });

        const json = await res.json();
        if (!res.ok) {
          totalFailed += batch.length;
          batch.forEach(r => allResults.push({ name: r.name, status: "error", error: json.error }));
          continue;
        }

        totalRegistered += json.registered ?? 0;
        totalUpdated += json.updated ?? 0;
        totalFailed += json.failed ?? 0;
        allResults.push(...(json.results ?? []));

        setRaces(prev => prev.map(r => {
          const match = json.results?.find((x: any) => x.name === r.name && (x.status === "registered" || x.status === "updated"));
          if (match) return { ...r, already_registered: true, selected: false };
          return r;
        }));
      }

      setResult({ registered: totalRegistered, updated: totalUpdated, failed: totalFailed, results: allResults });
    } catch (err: any) {
      setError(err.message || "登録エラー");
    } finally {
      setRegistering(false);
      setBatchProgress({ current: 0, total: 0 });
    }
  };

  // ── 選択トグル ──
  const toggleRace = (raceIdExt: string) => {
    setRaces(prev =>
      prev.map(r => r.race_id_external === raceIdExt ? { ...r, selected: !r.selected } : r)
    );
  };

  const toggleAll = (selected: boolean) => {
    setRaces(prev =>
      prev.map(r => ({ ...r, selected }))
    );
  };

  // ── 統計 ──
  const selectedCount = races.filter(r => r.selected).length;
  const registeredCount = races.filter(r => r.already_registered).length;
  const totalEntries = races.filter(r => r.selected)
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
      {/* ── Step 1: データ取得 ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-bold text-gray-800 mb-4">📥 netkeibaからレース一括登録</h3>

        {/* 日付選択 + アクションボタン */}
        <div className="bg-green-50 rounded-lg p-4 mb-4">
          <p className="text-sm font-bold text-gray-700 mb-3">日付を選択してデータを取得</p>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">開催日</label>
              <input
                type="date"
                value={scrapeDate}
                onChange={(e) => setScrapeDate(e.target.value)}
                className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
            {/* クイック日付ボタン */}
            {getWeekendDates().map(d => (
              <button
                key={d.value}
                onClick={() => setScrapeDate(d.value)}
                className={`px-3 py-2.5 rounded-lg text-xs font-bold border transition-colors ${
                  scrapeDate === d.value
                    ? "bg-green-600 text-white border-green-600"
                    : "bg-white text-gray-600 border-gray-300 hover:border-green-400"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-3 mt-4">
            <button
              onClick={() => handleScrapeAndPreview(false)}
              disabled={scraping}
              className="bg-green-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {scraping ? "⏳ 取得中..." : "🔍 取得してプレビュー"}
            </button>
            <button
              onClick={() => handleScrapeAndPreview(true)}
              disabled={scraping}
              className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {scraping ? "⏳ 取得中..." : "💾 JSONダウンロード"}
            </button>
          </div>
          {/* 進捗表示 */}
          {scraping && scrapeProgress.total > 0 && (
            <div className="mt-3">
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                <span className="animate-pulse">⏳</span>
                <span>{scrapeProgress.message}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(scrapeProgress.current / scrapeProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}
          {!scraping && scrapeProgress.message.startsWith("✅") && (
            <div className="mt-3 text-sm text-green-600 font-bold">{scrapeProgress.message}</div>
          )}
        </div>

        {/* JSONファイルから読み込み（代替手段） */}
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm font-bold text-gray-700 mb-2">または: JSONファイルから読み込み</p>
          <div className="flex items-center gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileLoad}
              className="hidden"
              id="json-file-input"
            />
            <label
              htmlFor="json-file-input"
              className="bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-700 cursor-pointer transition-colors inline-flex items-center gap-2"
            >
              📂 JSONファイルを選択
            </label>
            {jsonMeta && (
              <span className="text-sm text-gray-600">
                📅 {jsonMeta.date}（取得: {new Date(jsonMeta.scraped_at).toLocaleString("ja-JP")}）
              </span>
            )}
            {loading && (
              <span className="text-sm text-gray-500 animate-pulse">読み込み中...</span>
            )}
          </div>
        </div>
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
              <span className="font-bold text-gray-800">📊 {races.length}レース</span>
              <span className="text-green-600 font-bold">✅ {selectedCount}件選択中</span>
              {registeredCount > 0 && (
                <span className="text-blue-500">（{registeredCount}件は登録済み・選択で更新可）</span>
              )}
              <span className="text-gray-500">🐎 合計{totalEntries}頭</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => toggleAll(true)} className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50">全選択</button>
              <button onClick={() => toggleAll(false)} className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50">全解除</button>
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
                    <div
                      className={`px-5 py-3 flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition-colors`}
                      onClick={() => toggleRace(race.race_id_external)}
                    >
                      <input
                        type="checkbox"
                        checked={race.selected || false}
                        onChange={() => toggleRace(race.race_id_external)}
                        className="w-4 h-4 text-green-600 rounded border-gray-300 focus:ring-green-500"
                      />
                      <span className="w-8 text-center font-bold text-gray-600 text-sm">{race.race_number}R</span>
                      {race.grade && (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded border ${gradeColors[race.grade] || "bg-gray-100 text-gray-600"}`}>
                          {race.grade}
                        </span>
                      )}
                      <span className="font-bold text-gray-800 text-sm flex-1 truncate">{race.name}</span>
                      <span className="text-xs text-gray-500">{race.track_type}{race.distance}m</span>
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{race.entries.length}頭</span>
                      {race.post_time && <span className="text-xs text-gray-500">{race.post_time}</span>}
                      {race.already_registered && (
                        <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">登録済み</span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedRace(expandedRace === race.race_id_external ? null : race.race_id_external);
                        }}
                        className="text-gray-400 hover:text-gray-600 text-sm"
                      >
                        {expandedRace === race.race_id_external ? "▲" : "▼"}
                      </button>
                    </div>

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
                                <td className="py-1 text-right text-gray-600">{e.popularity ? `${e.popularity}人気` : "-"}</td>
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

          {/* 一括登録ボタン */}
          <button
            onClick={handleRegister}
            disabled={registering || selectedCount === 0}
            className="w-full bg-green-600 text-white py-4 rounded-xl text-lg font-bold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {registering ? (
              <span className="animate-pulse">⏳ 登録中... {batchProgress.current}/{batchProgress.total}レース完了</span>
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
            <span className="text-green-600 font-bold">✅ 新規登録: {result.registered}件</span>
            {result.updated > 0 && <span className="text-blue-600 font-bold">🔄 更新: {result.updated}件</span>}
            {result.failed > 0 && <span className="text-red-500">❌ 失敗: {result.failed}件</span>}
          </div>
          <div className="max-h-60 overflow-y-auto space-y-1">
            {result.results.map((r, i) => (
              <div key={i} className="text-xs flex items-center gap-2">
                <span>{r.status === "registered" ? "✅" : r.status === "updated" ? "🔄" : "❌"}</span>
                <span className="text-gray-700">{r.name}</span>
                {r.entries_count != null && <span className="text-gray-400">({r.entries_count}頭)</span>}
                {r.error && <span className="text-red-500">{r.error}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── JST日付フォーマット (YYYY-MM-DD) ──
function formatDateJST(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// ── 2週間分の週末日付を取得（JST基準） ──
function getWeekendDates() {
  const now = new Date();
  const jstNow = new Date(now.getTime() + (9 * 60 - now.getTimezoneOffset()) * 60000);
  const dates = [];
  for (let i = 0; i < 21; i++) {
    const d = new Date(jstNow);
    d.setDate(jstNow.getDate() + i);
    const day = d.getDay();
    if (day === 0 || day === 6) {
      const value = formatDateJST(d);
      const dayLabel = day === 6 ? "土" : "日";
      const label = `${d.getMonth() + 1}/${d.getDate()}(${dayLabel})`;
      dates.push({ value, label });
      if (dates.length >= 8) break;
    }
  }
  return dates;
}
