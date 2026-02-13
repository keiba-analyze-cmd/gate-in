"use client";

import { useState } from "react";
import AdminSettleForm from "./AdminSettleForm";

type Race = {
  id: string;
  name: string;
  external_id?: string | null;
  grade: string | null;
  race_date: string;
  course_name: string;
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

  return (
    <div className="space-y-3">
      {races.map((race) => (
        <div key={race.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          {/* レースヘッダー */}
          <button
            onClick={() => setSelectedRaceId(selectedRaceId === race.id ? null : race.id)}
            className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              {race.grade && (
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                  race.grade === "G2" ? "bg-red-100 text-red-700" :
                  race.grade === "G3" ? "bg-green-100 text-green-700" :
                  "bg-gray-100 text-gray-600"
                }`}>
                  {race.grade}
                </span>
              )}
              <span className="font-bold text-sm text-gray-800">{race.name}</span>
              <span className="text-xs text-gray-400">{race.course_name} {race.race_date}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">{race.race_entries?.length ?? 0}頭</span>
              <span className="text-gray-400">{selectedRaceId === race.id ? "▲" : "▼"}</span>
            </div>
          </button>

          {/* 展開: 結果入力フォーム */}
          {selectedRaceId === race.id && (
            <AdminSettleForm race={race} />
          )}
        </div>
      ))}
    </div>
  );
}
