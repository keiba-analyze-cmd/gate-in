"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Entry = {
  id: string;
  post_number: number;
  horses: { name: string } | null;
};

type Race = {
  id: string;
  name: string;
  race_entries: Entry[];
};

type Props = {
  race: Race;
};

export default function AdminSettleForm({ race }: Props) {
  const router = useRouter();
  const entries = race.race_entries?.sort((a, b) => a.post_number - b.post_number) ?? [];

  // 着順入力（馬番 → 着順のマッピング）
  const [positions, setPositions] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"input" | "settling" | "done">("input");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const setPosition = (entryId: string, pos: string) => {
    setPositions((prev) => ({ ...prev, [entryId]: pos }));
  };

  // ステップ1: 結果を登録
  const handleRegisterResults = async () => {
    // バリデーション: 1着は必須
    const hasFirst = Object.values(positions).includes("1");
    if (!hasFirst) {
      setError("1着を入力してください");
      return;
    }

    setLoading(true);
    setError("");

    // 結果データを構築
    const resultData = Object.entries(positions)
      .filter(([_, pos]) => pos && parseInt(pos) > 0)
      .map(([entryId, pos]) => ({
        race_entry_id: entryId,
        finish_position: parseInt(pos),
      }));

    // API: 結果を登録
    const res = await fetch(`/api/admin/races/${race.id}/results`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ results: resultData }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError("結果登録エラー: " + (data.error ?? ""));
      setLoading(false);
      return;
    }

    // API: ポイント計算実行
    setStep("settling");
    const settleRes = await fetch("/api/admin/races/settle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ race_id: race.id }),
    });

    const settleData = await settleRes.json();
    setResult(settleData);
    setStep("done");
    setLoading(false);

    // 3秒後にページ更新
    setTimeout(() => router.refresh(), 3000);
  };

  // クイック入力: 上位3頭を選択式で
  const [first, setFirst] = useState("");
  const [second, setSecond] = useState("");
  const [third, setThird] = useState("");

  const handleQuickSet = () => {
    const newPositions: Record<string, string> = {};
    if (first) newPositions[first] = "1";
    if (second) newPositions[second] = "2";
    if (third) newPositions[third] = "3";

    // 残りの馬は4着以降
    let pos = 4;
    for (const entry of entries) {
      if (!newPositions[entry.id]) {
        newPositions[entry.id] = String(pos);
        pos++;
      }
    }
    setPositions(newPositions);
  };

  if (step === "done" && result) {
    return (
      <div className="p-5 border-t border-gray-100 bg-green-50">
        <h3 className="font-bold text-green-800 mb-3">
          ✅ {race.name} のポイント計算が完了しました！
        </h3>
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div className="bg-white rounded-lg p-3 text-center">
            <div className="text-xs text-gray-500">確定投票数</div>
            <div className="text-xl font-bold text-green-600">{result.settled_votes}</div>
          </div>
          <div className="bg-white rounded-lg p-3 text-center">
            <div className="text-xs text-gray-500">総付与ポイント</div>
            <div className="text-xl font-bold text-green-600">{result.total_points_awarded} P</div>
          </div>
          <div className="bg-white rounded-lg p-3 text-center">
            <div className="text-xs text-gray-500">ステータス</div>
            <div className="text-xl font-bold text-green-600">
              {result.success ? "成功" : "一部エラー"}
            </div>
          </div>
        </div>
        {result.errors?.length > 0 && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
            {result.errors.join(", ")}
          </div>
        )}
        <p className="text-xs text-gray-500 mt-2">ページが自動で更新されます...</p>
      </div>
    );
  }

  if (step === "settling") {
    return (
      <div className="p-5 border-t border-gray-100 bg-yellow-50 text-center">
        <div className="text-2xl mb-2">⏳</div>
        <p className="font-bold text-yellow-800">ポイント計算中...</p>
      </div>
    );
  }

  return (
    <div className="p-5 border-t border-gray-100 space-y-4">
      {/* クイック入力 */}
      <div className="bg-blue-50 rounded-xl p-4">
        <h3 className="text-sm font-bold text-blue-800 mb-3">🏆 かんたん入力（上位3頭を選択）</h3>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-blue-600 mb-1 font-medium">🥇 1着</label>
            <select
              value={first}
              onChange={(e) => setFirst(e.target.value)}
              className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value="">選択</option>
              {entries.map((e) => (
                <option key={e.id} value={e.id} disabled={e.id === second || e.id === third}>
                  {e.post_number} {e.horses?.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-blue-600 mb-1 font-medium">🥈 2着</label>
            <select
              value={second}
              onChange={(e) => setSecond(e.target.value)}
              className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value="">選択</option>
              {entries.map((e) => (
                <option key={e.id} value={e.id} disabled={e.id === first || e.id === third}>
                  {e.post_number} {e.horses?.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-blue-600 mb-1 font-medium">🥉 3着</label>
            <select
              value={third}
              onChange={(e) => setThird(e.target.value)}
              className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value="">選択</option>
              {entries.map((e) => (
                <option key={e.id} value={e.id} disabled={e.id === first || e.id === second}>
                  {e.post_number} {e.horses?.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button
          onClick={handleQuickSet}
          disabled={!first}
          className="mt-3 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors"
        >
          この着順をセット
        </button>
      </div>

      {/* 着順一覧 */}
      {Object.keys(positions).length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-gray-700 mb-2">📋 着順確認</h3>
          <div className="space-y-1.5">
            {entries
              .filter((e) => positions[e.id])
              .sort((a, b) => parseInt(positions[a.id] ?? "99") - parseInt(positions[b.id] ?? "99"))
              .map((entry) => (
                <div key={entry.id} className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    positions[entry.id] === "1" ? "bg-yellow-400 text-white" :
                    positions[entry.id] === "2" ? "bg-gray-300 text-white" :
                    positions[entry.id] === "3" ? "bg-orange-400 text-white" :
                    "bg-gray-200 text-gray-600"
                  }`}>
                    {positions[entry.id]}
                  </span>
                  <span className="font-medium text-sm">
                    {entry.post_number} {entry.horses?.name}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>
      )}

      {/* 確定ボタン */}
      <button
        onClick={handleRegisterResults}
        disabled={loading || !positions[entries[0]?.id]}
        className="w-full py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors disabled:opacity-40"
      >
        {loading ? "処理中..." : "🏁 結果を確定してポイントを計算する"}
      </button>
    </div>
  );
}
