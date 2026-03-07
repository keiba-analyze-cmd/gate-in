"use client";

import { useState, useEffect } from "react";

type Race = {
  id: string;
  name: string;
  race_date: string;
  course_name: string;
  race_number: number;
  post_time: string;
  grade: string | null;
  is_win5: boolean;
};

type Contest = {
  id: string;
  name: string;
  status: string;
  week_start: string;
  prize_1st: number;
  prize_2nd: number;
  prize_3rd: number;
};

type ContestRace = {
  race_order: number;
  races: Race;
};

export default function AdminContestManager() {
  const [targetDate, setTargetDate] = useState(() => {
    // 次の日曜日をデフォルトに
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
    const nextSunday = new Date(today);
    nextSunday.setDate(today.getDate() + daysUntilSunday);
    return nextSunday.toISOString().split("T")[0];
  });
  const [races, setRaces] = useState<Race[]>([]);
  const [selectedRaceIds, setSelectedRaceIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState("");
  const [activeContest, setActiveContest] = useState<Contest | null>(null);
  const [contestRaces, setContestRaces] = useState<ContestRace[]>([]);

  // 現在の大会を取得
  useEffect(() => {
    fetch("/api/contests?type=weekly")
      .then((r) => r.json())
      .then((data) => {
        if (data.contest && data.contest.status === "active") {
          setActiveContest(data.contest);
          setContestRaces(data.contest_races ?? []);
        }
      });
  }, []);

  // 日付のレースを取得
  const fetchRaces = async () => {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`/api/admin/races?date=${targetDate}`);
      const data = await res.json();
      if (data.races) {
        // post_time順にソート
        const sorted = data.races.sort((a: Race, b: Race) => 
          (a.post_time ?? "").localeCompare(b.post_time ?? "")
        );
        setRaces(sorted);
        // 既にis_win5がtrueのものを選択状態に
        setSelectedRaceIds(sorted.filter((r: Race) => r.is_win5).map((r: Race) => r.id));
      }
    } catch (e) {
      setMessage("レース取得に失敗しました");
    }
    setLoading(false);
  };

  useEffect(() => {
    if (targetDate) {
      fetchRaces();
    }
  }, [targetDate]);

  const toggleRace = (raceId: string) => {
    setSelectedRaceIds((prev) =>
      prev.includes(raceId)
        ? prev.filter((id) => id !== raceId)
        : [...prev, raceId]
    );
  };

  const createContest = async () => {
    if (selectedRaceIds.length === 0) {
      setMessage("レースを選択してください");
      return;
    }

    setCreating(true);
    setMessage("");

    try {
      const res = await fetch("/api/admin/weekly-contest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          race_ids: selectedRaceIds,
          week_date: targetDate,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage(`✅ 大会を作成しました（${data.linked_races}レース）`);
        // 現在の大会を再取得
        const contestRes = await fetch("/api/contests?type=weekly");
        const contestData = await contestRes.json();
        if (contestData.contest) {
          setActiveContest(contestData.contest);
          setContestRaces(contestData.contest_races ?? []);
        }
      } else {
        setMessage(`❌ エラー: ${data.error}`);
      }
    } catch (e) {
      setMessage("❌ 大会作成に失敗しました");
    }

    setCreating(false);
  };

  const formatTime = (postTime: string | null) => {
    if (!postTime) return "";
    const date = new Date(postTime);
    return date.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tokyo" });
  };

  return (
    <div className="space-y-6">
      {/* 現在の大会 */}
      {activeContest && (
        <div className="rounded-xl border-2 border-purple-300 bg-purple-50 p-4">
          <h3 className="font-bold text-purple-800 mb-2">🏆 現在開催中の大会</h3>
          <div className="text-lg font-black text-purple-900">{activeContest.name}</div>
          <div className="text-sm text-purple-700 mt-1">
            賞金: 1位 ¥{activeContest.prize_1st?.toLocaleString()} / 
            2位 ¥{activeContest.prize_2nd?.toLocaleString()} / 
            3位 ¥{activeContest.prize_3rd?.toLocaleString()}
          </div>
          {contestRaces.length > 0 && (
            <div className="mt-3">
              <div className="text-xs text-purple-600 font-bold mb-1">対象レース:</div>
              <div className="flex flex-wrap gap-2">
                {contestRaces.map((cr) => (
                  <span key={cr.races.id} className="bg-white text-purple-700 text-xs px-2 py-1 rounded border border-purple-200">
                    {cr.race_order}. {cr.races.course_name}{cr.races.race_number}R {cr.races.grade && `(${cr.races.grade})`}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 新規作成 */}
      <div className="rounded-xl border bg-white p-4">
        <h3 className="font-bold text-gray-900 mb-4">📅 大会作成・レース選択</h3>
        
        <div className="flex items-center gap-3 mb-4">
          <label className="text-sm font-medium text-gray-700">対象日:</label>
          <input
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm"
          />
          <button
            onClick={fetchRaces}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-bold px-4 py-2 rounded-lg transition-colors"
          >
            🔄 更新
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-400">読み込み中...</div>
        ) : races.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <div className="text-3xl mb-2">📋</div>
            <p>この日のレースはまだ登録されていません</p>
          </div>
        ) : (
          <>
            <div className="text-sm text-gray-500 mb-2">
              {races.length}レース中 <span className="font-bold text-green-600">{selectedRaceIds.length}件選択中</span>
              {selectedRaceIds.length > 0 && selectedRaceIds.length < 3 && (
                <span className="text-amber-600 ml-2">※参加条件は3レース以上</span>
              )}
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {races.map((race) => {
                const isSelected = selectedRaceIds.includes(race.id);
                return (
                  <div
                    key={race.id}
                    onClick={() => toggleRace(race.id)}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      isSelected
                        ? "border-green-500 bg-green-50"
                        : "border-gray-200 hover:border-gray-300 bg-white"
                    }`}
                  >
                    <div className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                      isSelected ? "border-green-500 bg-green-500 text-white" : "border-gray-300"
                    }`}>
                      {isSelected && "✓"}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900">
                          {race.course_name} {race.race_number}R
                        </span>
                        {race.grade && (
                          <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                            race.grade === "G1" ? "bg-amber-100 text-amber-700" :
                            race.grade === "G2" ? "bg-red-100 text-red-700" :
                            "bg-green-100 text-green-700"
                          }`}>
                            {race.grade}
                          </span>
                        )}
                        <span className="text-xs text-gray-400">{formatTime(race.post_time)}</span>
                      </div>
                      <div className="text-sm text-gray-600 truncate">{race.name}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                💡 WIN5対象レースを5つ選択してください
              </div>
              <button
                onClick={createContest}
                disabled={creating || selectedRaceIds.length === 0}
                className={`font-bold px-6 py-2 rounded-lg transition-colors ${
                  creating || selectedRaceIds.length === 0
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-purple-600 hover:bg-purple-700 text-white"
                }`}
              >
                {creating ? "作成中..." : `🏆 大会を作成（${selectedRaceIds.length}レース）`}
              </button>
            </div>
          </>
        )}

        {message && (
          <div className={`mt-4 p-3 rounded-lg text-sm ${
            message.startsWith("✅") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
          }`}>
            {message}
          </div>
        )}
      </div>

      {/* ルール説明 */}
      <div className="rounded-xl border bg-gray-50 p-4 text-sm text-gray-600">
        <h4 className="font-bold text-gray-800 mb-2">📋 大会作成の流れ</h4>
        <ol className="list-decimal list-inside space-y-1">
          <li>土曜日に日曜のレース情報をスクレイピングで取得</li>
          <li>この画面でWIN5対象の5レースを選択</li>
          <li>「大会を作成」ボタンで作成完了</li>
          <li>ユーザーは3レース以上予想で自動エントリー</li>
          <li>日曜夜にCronで前週大会がクローズ、入賞者に通知</li>
        </ol>
      </div>
    </div>
  );
}
