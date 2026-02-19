"use client";

// src/app/(main)/mypage/karte/KarteClient.tsx
// 馬カルテのクライアントコンポーネント

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

type KarteItem = {
  id: string | null;
  votePickId: string;
  horseId: string;
  horseName: string;
  raceId: string;
  raceName: string;
  raceDate: string;
  course: string;
  grade: string | null;
  mark: string;
  popularity: number;
  odds: number;
  resultPosition: number;
  timeDiff: string;
  status: "pending" | "tracking" | "dismissed";
  memo: string;
  isHit: boolean;
  decidedAt: string | null;
};

type ViewMode = "swipe" | "list";
type MarkFilter = "all" | "◎" | "○" | "▲" | "△";
type StatusFilter = "all" | "pending" | "tracking" | "dismissed";

export function KarteClient() {
  const [mode, setMode] = useState<ViewMode>("swipe");
  const [karteList, setKarteList] = useState<KarteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [markFilter, setMarkFilter] = useState<MarkFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [memo, setMemo] = useState("");
  const [saving, setSaving] = useState(false);

  // データ取得
  const fetchKarte = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (mode === "swipe") {
        params.set("status", "pending");
      } else if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }
      if (markFilter !== "all") {
        params.set("mark", markFilter);
      }

      const res = await fetch(`/api/karte?${params.toString()}`);
      const json = await res.json();
      
      if (json.data) {
        setKarteList(json.data);
        setCurrentIndex(0);
      }
    } catch (error) {
      console.error("Karte fetch error:", error);
    } finally {
      setLoading(false);
    }
  }, [mode, markFilter, statusFilter]);

  useEffect(() => {
    fetchKarte();
  }, [fetchKarte]);

  // 振り返り結果を保存
  const handleDecision = async (status: "tracking" | "dismissed") => {
    const current = filteredList[currentIndex];
    if (!current) return;

    setSaving(true);
    try {
      const res = await fetch("/api/karte", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          votePickId: current.votePickId,
          horseId: current.horseId,
          raceId: current.raceId,
          mark: current.mark,
          popularity: current.popularity,
          odds: current.odds,
          resultPosition: current.resultPosition,
          timeDiff: current.timeDiff,
          status,
          memo,
          isHit: current.isHit,
        }),
      });

      if (res.ok) {
        setMemo("");
        setCurrentIndex((prev) => prev + 1);
      }
    } catch (error) {
      console.error("Save error:", error);
    } finally {
      setSaving(false);
    }
  };

  // フィルター適用
  const filteredList = karteList.filter((k) => {
    if (markFilter !== "all" && k.mark !== markFilter) return false;
    if (mode === "list" && statusFilter !== "all" && k.status !== statusFilter) return false;
    return true;
  });

  const currentItem = filteredList[currentIndex];
  const remaining = filteredList.length - currentIndex;

  // マークの色
  const getMarkColor = (mark: string) => {
    switch (mark) {
      case "◎": return "bg-red-100 text-red-600 border-red-200";
      case "○": return "bg-blue-100 text-blue-600 border-blue-200";
      case "▲": return "bg-green-100 text-green-600 border-green-200";
      case "△": return "bg-yellow-100 text-yellow-600 border-yellow-200";
      default: return "bg-gray-100 text-gray-600 border-gray-200";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-800">📋 馬カルテ</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setMode("swipe")}
              className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${
                mode === "swipe"
                  ? "bg-green-600 text-white"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              振り返り
            </button>
            <button
              onClick={() => setMode("list")}
              className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${
                mode === "list"
                  ? "bg-green-600 text-white"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              一覧
            </button>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* 印フィルター */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(["all", "◎", "○", "▲", "△"] as MarkFilter[]).map((mark) => {
            const count = karteList.filter(
              (k) => mark === "all" || k.mark === mark
            ).length;
            return (
              <button
                key={mark}
                onClick={() => {
                  setMarkFilter(mark);
                  setCurrentIndex(0);
                }}
                className={`px-3 py-1.5 rounded-full text-sm font-bold whitespace-nowrap flex items-center gap-1 transition-colors ${
                  markFilter === mark
                    ? mark === "◎" ? "bg-red-500 text-white" :
                      mark === "○" ? "bg-blue-500 text-white" :
                      mark === "▲" ? "bg-green-500 text-white" :
                      mark === "△" ? "bg-yellow-500 text-white" :
                      "bg-green-600 text-white"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                <span>{mark === "all" ? "すべて" : mark}</span>
                <span className={`text-xs ${markFilter === mark ? "opacity-80" : "text-gray-400"}`}>
                  ({count})
                </span>
              </button>
            );
          })}
        </div>

        {mode === "swipe" ? (
          /* ========== 振り返りモード（Tinder形式） ========== */
          loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin h-8 w-8 border-2 border-green-600 border-t-transparent rounded-full" />
            </div>
          ) : !currentItem ? (
            <CompletedView />
          ) : (
            <>
              {/* 進捗 */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">残り {remaining} 頭</span>
                <div className="flex gap-1">
                  {filteredList.slice(0, 10).map((_, i) => (
                    <div
                      key={i}
                      className={`w-2 h-2 rounded-full ${
                        i < currentIndex
                          ? "bg-green-500"
                          : i === currentIndex
                          ? "bg-green-300"
                          : "bg-gray-200"
                      }`}
                    />
                  ))}
                  {filteredList.length > 10 && (
                    <span className="text-xs text-gray-400">...</span>
                  )}
                </div>
              </div>

              {/* カード */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentItem.votePickId}
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  className="bg-white rounded-3xl border-2 border-gray-200 overflow-hidden shadow-lg"
                >
                  {/* ヘッダー */}
                  <div
                    className={`px-6 py-4 text-white ${
                      currentItem.isHit ? "bg-green-500" : "bg-red-500"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm opacity-90">{currentItem.raceName}</span>
                        <span className="text-xs opacity-75">({currentItem.raceDate})</span>
                      </div>
                      <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-bold">
                        {currentItem.isHit ? "✅ 的中" : "❌ 不的中"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      <span
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-black ${getMarkColor(
                          currentItem.mark
                        )}`}
                      >
                        {currentItem.mark}
                      </span>
                      <p className="text-3xl font-black">{currentItem.horseName}</p>
                    </div>
                  </div>

                  {/* レース結果情報 */}
                  <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">人気</p>
                        <p className="text-lg font-black text-gray-800">
                          {currentItem.popularity}番
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">オッズ</p>
                        <p className="text-lg font-black text-gray-800">
                          {currentItem.odds}倍
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">着順</p>
                        <p
                          className={`text-lg font-black ${
                            currentItem.resultPosition === 1
                              ? "text-yellow-500"
                              : currentItem.resultPosition <= 3
                              ? "text-green-600"
                              : "text-gray-800"
                          }`}
                        >
                          {currentItem.resultPosition}着
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">タイム差</p>
                        <p className="text-lg font-black text-gray-800">
                          {currentItem.timeDiff}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* メモ入力 */}
                  <div className="p-6">
                    <label className="text-sm font-bold text-gray-700 block mb-2">
                      📝 次走へのメモ
                    </label>
                    <textarea
                      className="w-full border border-gray-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
                      rows={2}
                      placeholder="次に買う時の参考メモ"
                      value={memo}
                      onChange={(e) => setMemo(e.target.value)}
                    />
                  </div>

                  {/* アクションボタン */}
                  <div className="px-6 pb-6 flex gap-4">
                    <button
                      onClick={() => handleDecision("dismissed")}
                      disabled={saving}
                      className="flex-1 bg-gray-200 text-gray-700 font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-gray-300 transition-colors disabled:opacity-50"
                    >
                      <span className="text-xl">👋</span>
                      <span>見限る</span>
                    </button>
                    <button
                      onClick={() => handleDecision("tracking")}
                      disabled={saving}
                      className="flex-1 bg-green-600 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      <span className="text-xl">👀</span>
                      <span>次も買う</span>
                    </button>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* スキップ */}
              <button
                onClick={() => setCurrentIndex((prev) => prev + 1)}
                className="w-full text-gray-400 text-sm py-2 hover:text-gray-600"
              >
                あとで判断する →
              </button>
            </>
          )
        ) : (
          /* ========== 一覧モード ========== */
          <>
            {/* ステータスフィルター */}
            <div className="flex gap-2">
              {(
                [
                  { id: "all", label: "すべて" },
                  { id: "pending", label: "⏳ 未判断" },
                  { id: "tracking", label: "👀 追跡中" },
                  { id: "dismissed", label: "👋 見限り" },
                ] as { id: StatusFilter; label: string }[]
              ).map((f) => (
                <button
                  key={f.id}
                  onClick={() => setStatusFilter(f.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                    statusFilter === f.id
                      ? "bg-green-600 text-white"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* リスト */}
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin h-8 w-8 border-2 border-green-600 border-t-transparent rounded-full" />
              </div>
            ) : filteredList.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                該当する馬がありません
              </div>
            ) : (
              <div className="space-y-2">
                {filteredList.map((item) => (
                  <KarteListItem key={item.votePickId} item={item} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// 完了ビュー
function CompletedView() {
  return (
    <div className="text-center py-12">
      <span className="text-6xl">🎉</span>
      <p className="font-black text-xl text-gray-800 mt-4">振り返り完了！</p>
      <p className="text-sm text-gray-500 mt-2">
        すべての馬の判断が終わりました
      </p>
      <Link
        href="/mypage/karte/tracking"
        className="mt-6 inline-block bg-green-600 text-white font-bold py-3 px-6 rounded-xl"
      >
        追跡リストを見る →
      </Link>
    </div>
  );
}

// 一覧アイテム
function KarteListItem({ item }: { item: KarteItem }) {
  const getMarkColor = (mark: string) => {
    switch (mark) {
      case "◎": return "bg-red-100 text-red-600";
      case "○": return "bg-blue-100 text-blue-600";
      case "▲": return "bg-green-100 text-green-600";
      case "△": return "bg-yellow-100 text-yellow-600";
      default: return "bg-gray-100 text-gray-600";
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-start gap-3">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-black ${getMarkColor(
            item.mark
          )}`}
        >
          {item.mark}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <p className="font-bold text-gray-800">{item.horseName}</p>
            {item.status === "tracking" && (
              <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded-full font-bold">
                追跡中
              </span>
            )}
            {item.status === "pending" && (
              <span className="text-xs bg-yellow-100 text-yellow-600 px-2 py-1 rounded-full font-bold">
                未判断
              </span>
            )}
            {item.status === "dismissed" && (
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full font-bold">
                見限り
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 mt-0.5">
            {item.raceName} ({item.raceDate})
          </p>
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
            <span>{item.popularity}番人気</span>
            <span>{item.odds}倍</span>
            <span
              className={
                item.resultPosition <= 3 ? "text-green-600 font-bold" : ""
              }
            >
              {item.resultPosition}着
            </span>
            <span>{item.timeDiff}</span>
          </div>
          {item.memo && (
            <p className="text-xs text-gray-400 mt-1 bg-gray-50 rounded px-2 py-1">
              📝 {item.memo}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
