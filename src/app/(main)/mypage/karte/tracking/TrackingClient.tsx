"use client";

// src/app/(main)/mypage/karte/tracking/TrackingClient.tsx
// 追跡リストのクライアントコンポーネント

import { useState, useEffect } from "react";
import Link from "next/link";

type TrackingHorse = {
  karteId: string;
  horseId: string;
  horseName: string;
  mark: string;
  memo: string;
  lastRace: {
    id: string;
    name: string;
    date: string;
    course: string;
    popularity: number;
    odds: number;
    result: number;
    timeDiff: string;
  };
  nextRace: {
    id: string;
    name: string;
    date: string;
    time: string;
    course: string;
    grade: string | null;
  } | null;
  stats: {
    total: number;
    hits: number;
    hitRate: number;
  };
  updatedAt: string;
};

export function TrackingClient() {
  const [thisWeek, setThisWeek] = useState<TrackingHorse[]>([]);
  const [waiting, setWaiting] = useState<TrackingHorse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTracking = async () => {
      try {
        const res = await fetch("/api/karte/tracking");
        const json = await res.json();
        if (json.thisWeek) setThisWeek(json.thisWeek);
        if (json.waiting) setWaiting(json.waiting);
      } catch (error) {
        console.error("Tracking fetch error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTracking();
  }, []);

  const getMarkColor = (mark: string) => {
    switch (mark) {
      case "◎": return "bg-red-100 text-red-600";
      case "○": return "bg-blue-100 text-blue-600";
      case "▲": return "bg-green-100 text-green-600";
      case "△": return "bg-yellow-100 text-yellow-600";
      default: return "bg-gray-100 text-gray-600";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-green-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/mypage/karte" className="text-gray-500">
              ← 戻る
            </Link>
            <h1 className="text-lg font-bold text-gray-800">🔔 追跡リスト</h1>
          </div>
          <Link
            href="/mypage/notification-settings"
            className="text-sm text-gray-500"
          >
            ⚙️ 通知設定
          </Link>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* 今週出走予定 */}
        <section className="bg-white rounded-2xl border-2 border-orange-200 overflow-hidden">
          <div className="px-4 py-3 bg-orange-50 border-b border-orange-100">
            <h2 className="font-bold text-gray-800">
              🏁 今週出走予定（{thisWeek.length}頭）
            </h2>
          </div>
          {thisWeek.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              今週出走予定の馬はいません
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {thisWeek.map((horse) => (
                <div key={horse.karteId} className="px-4 py-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-black ${getMarkColor(
                        horse.mark
                      )}`}
                    >
                      {horse.mark}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-gray-800">{horse.horseName}</p>
                      {horse.nextRace && (
                        <p className="text-sm text-green-600 font-medium mt-0.5">
                          {horse.nextRace.date} {horse.nextRace.course}{" "}
                          {horse.nextRace.name}
                          {horse.nextRace.grade && (
                            <span className="ml-1 text-xs bg-blue-100 text-blue-700 px-1 rounded">
                              {horse.nextRace.grade}
                            </span>
                          )}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        前走: {horse.lastRace.name} {horse.lastRace.popularity}人気{" "}
                        {horse.lastRace.odds}倍 → {horse.lastRace.result}着
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        成績: {horse.stats.hits}/{horse.stats.total}勝（
                        {horse.stats.hitRate}%）
                      </p>
                      {horse.memo && (
                        <p className="text-xs text-gray-500 mt-2 bg-gray-50 rounded-lg p-2">
                          📝 {horse.memo}
                        </p>
                      )}
                    </div>
                    <Link
                      href={`/races/${horse.nextRace?.id}`}
                      className="text-green-600 font-bold text-sm"
                    >
                      予想する
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 次走待ち */}
        <section className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="font-bold text-gray-800">
              ⏳ 次走待ち（{waiting.length}頭）
            </h2>
          </div>
          {waiting.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              次走待ちの馬はいません
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {waiting.map((horse) => (
                <div key={horse.karteId} className="px-4 py-3 flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black ${getMarkColor(
                      horse.mark
                    )}`}
                  >
                    {horse.mark}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-800">{horse.horseName}</p>
                    <p className="text-xs text-gray-500">
                      前走: {horse.lastRace.name} {horse.lastRace.result}着
                    </p>
                  </div>
                  <span className="text-xs text-gray-400">
                    {horse.nextRace ? horse.nextRace.date : "未定"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 馬カルテに戻る */}
        <Link
          href="/mypage/karte"
          className="block w-full bg-gray-100 text-gray-600 font-bold py-3 rounded-xl text-center"
        >
          ← 馬カルテに戻る
        </Link>
      </div>
    </div>
  );
}
