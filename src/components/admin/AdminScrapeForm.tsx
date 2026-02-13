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
  skipped: number;
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        setError("無効なJSONフォーマットです。scrape-to-json.mjs で出力したファイルを使用してください。");
        return;
      }

      setJsonMeta({ date: json.date, scraped_at: json.scraped_at });

      // 登録済みチェック
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
    } catch (err: any) {
      setError(`JSONの読み込みに失敗しました: ${err.message}`);
    } finally {
      setLoading(false);
      // inputをリセット（同じファイルを再選択可能に）
      if (fileInputRef.current) fileInputRef.current.value = "";
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
      setRaces(prev => prev.map(r => {
        const match = json.results?.find((x: any) => x.name === r.name && x.status === "registered");
        if (match) return { ...r, already_registered: true, selected: false };
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
      {/* ── 使い方 & JSON読み込み ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          📥 netkeibaからレース一括登録
        </h3>

        {/* Step 1: ローカルスクレイピング説明 */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <p className="text-sm font-bold text-gray-700 mb-2">Step 1: ローカルでデータ取得</p>
          <p className="text-xs text-gray-500 mb-2">
            ターミナルで以下のコマンドを実行してJSONを生成します：
          </p>
          <div className="bg-gray-800 text-green-400 rounded-lg px-4 py-3 text-xs font-mono">
            <div className="text-gray-500"># 日付を指定して取得</div>
            <div>node scripts/scrape-to-json.mjs 20260215</div>
            <div className="mt-1 text-gray-500"># 今週末を自動取得</div>
            <div>node scripts/scrape-to-json.mjs</div>
            <div className="mt-1 text-gray-500"># 出力: scripts/output/races-YYYYMMDD.json</div>
          </div>
        </div>

        {/* Step 2: JSON読み込み */}
        <div className="bg-green-50 rounded-lg p-4">
          <p className="text-sm font-bold text-gray-700 mb-2">Step 2: JSONを読み込んで登録</p>
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
              className="bg-green-600 text-white px-6 py-3 rounded-lg text-sm font-bold hover:bg-green-700 cursor-pointer transition-colors inline-flex items-center gap-2"
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
                    <div
                      className={`px-5 py-3 flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                        race.already_registered ? "opacity-50" : ""
                      }`}
                      onClick={() => !race.already_registered && toggleRace(race.race_id_external)}
                    >
                      <input
                        type="checkbox"
                        checked={race.selected || false}
                        disabled={race.already_registered}
                        onChange={() => toggleRace(race.race_id_external)}
                        className="w-4 h-4 text-green-600 rounded border-gray-300 focus:ring-green-500"
                      />
                      <span className="w-8 text-center font-bold text-gray-600 text-sm">
                        {race.race_number}R
                      </span>
                      {race.grade && (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded border ${gradeColors[race.grade] || "bg-gray-100 text-gray-600"}`}>
                          {race.grade}
                        </span>
                      )}
                      <span className="font-bold text-gray-800 text-sm flex-1 truncate">
                        {race.name}
                      </span>
                      <span className="text-xs text-gray-500">
                        {race.track_type}{race.distance}m
                      </span>
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                        {race.entries.length}頭
                      </span>
                      {race.post_time && (
                        <span className="text-xs text-gray-500">{race.post_time}</span>
                      )}
                      {race.already_registered && (
                        <span className="text-xs bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full">
                          登録済み
                        </span>
                      )}
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

          {/* 一括登録ボタン */}
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
