"use client";

import { useState, useMemo } from "react";
import AdminSettleForm from "./AdminSettleForm";

type Race = {
  id: string;
  name: string;
  external_id?: string | null;
  grade: string | null;
  race_date: string;
  course_name: string;
  race_number?: number | null;
  status: string;
  race_entries: {
    id: string;
    post_number: number;
    horses: { name: string } | null;
  }[];
};

type Props = {
  races: Race[];
  type: "pending" | "finished";
};

export default function AdminRaceList({ races, type }: Props) {
  const [selectedRaceId, setSelectedRaceId] = useState<string | null>(null);

  // 日付一覧（降順）
  const dates = useMemo(() => {
    const set = new Set(races.map((r) => r.race_date));
    return [...set].sort((a, b) => b.localeCompare(a));
  }, [races]);

  const [selectedDate, setSelectedDate] = useState(dates[0] ?? "");

  // 選択日のレース
  const racesForDate = useMemo(
    () => races.filter((r) => r.race_date === selectedDate),
    [races, selectedDate]
  );

  // 競馬場一覧
  const courses = useMemo(() => {
    const set = new Set(racesForDate.map((r) => r.course_name));
    return [...set].sort();
  }, [racesForDate]);

  const [selectedCourse, setSelectedCourse] = useState("");

  // 競馬場フィルター（未選択なら全件）
  const filteredRaces = useMemo(() => {
    const list = selectedCourse
      ? racesForDate.filter((r) => r.course_name === selectedCourse)
      : racesForDate;
    return list.sort((a, b) => (a.race_number ?? 99) - (b.race_number ?? 99));
  }, [racesForDate, selectedCourse]);

  // 日付変更時に競馬場リセット
  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    setSelectedCourse("");
    setSelectedRaceId(null);
  };

  const formatDate = (d: string) => {
    const date = new Date(d + "T00:00:00+09:00");
    const m = date.getMonth() + 1;
    const day = date.getDate();
    const wd = ["日","月","火","水","木","金","土"][date.getDay()];
    return `${m}/${day}(${wd})`;
  };

  return (
    <div className="space-y-4">
      {/* 日付タブ */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {dates.map((date) => (
          <button key={date} onClick={() => handleDateChange(date)}
            className={`px-4 py-2 text-sm font-bold rounded-lg whitespace-nowrap transition-colors ${
              selectedDate === date
                ? "bg-green-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}>
            {formatDate(date)}
          </button>
        ))}
      </div>

      {/* 競馬場タブ */}
      {courses.length > 1 && (
        <div className="flex gap-2">
          <button onClick={() => { setSelectedCourse(""); setSelectedRaceId(null); }}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
              selectedCourse === ""
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}>
            全場
          </button>
          {courses.map((course) => (
            <button key={course} onClick={() => { setSelectedCourse(course); setSelectedRaceId(null); }}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                selectedCourse === course
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}>
              {course}
            </button>
          ))}
        </div>
      )}

      {/* レース件数 */}
      <div className="text-xs text-gray-400">
        {filteredRaces.length}件のレース
        {filteredRaces.filter((r) => r.status === "finished").length > 0 && (
          <span className="ml-2">（確定済: {filteredRaces.filter((r) => r.status === "finished").length}件）</span>
        )}
      </div>

      {/* レース一覧 */}
      {filteredRaces.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <p>該当するレースがありません</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredRaces.map((race) => (
            <div key={race.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <button
                onClick={() => setSelectedRaceId(selectedRaceId === race.id ? null : race.id)}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  {/* レース番号 */}
                  <span className="w-8 h-8 rounded-lg bg-gray-800 text-white flex items-center justify-center text-xs font-black shrink-0">
                    {race.race_number ?? "-"}R
                  </span>

                  {/* グレード */}
                  {race.grade && (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                      race.grade === "G1" ? "bg-yellow-100 text-yellow-800" :
                      race.grade === "G2" ? "bg-red-100 text-red-700" :
                      race.grade === "G3" ? "bg-green-100 text-green-700" :
                      "bg-gray-100 text-gray-600"
                    }`}>
                      {race.grade}
                    </span>
                  )}

                  <div className="min-w-0">
                    <span className="font-bold text-sm text-gray-800">{race.name}</span>
                    <span className="text-xs text-gray-400 ml-2">{race.course_name}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                    race.status === "finished" ? "bg-gray-100 text-gray-500" :
                    race.status === "voting_open" ? "bg-green-100 text-green-700" :
                    "bg-yellow-100 text-yellow-700"
                  }`}>
                    {race.status === "finished" ? "確定" : race.status === "voting_open" ? "受付中" : "締切"}
                  </span>
                  <span className="text-xs text-gray-400">{race.race_entries?.length ?? 0}頭</span>
                  <span className="text-gray-400">{selectedRaceId === race.id ? "▲" : "▼"}</span>
                </div>
              </button>

              {selectedRaceId === race.id && (
                <AdminSettleForm race={race} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
