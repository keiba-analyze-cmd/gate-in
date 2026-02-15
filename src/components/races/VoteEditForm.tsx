"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";

type Entry = {
  id: string;
  post_number: number;
  gate_number: number | null;
  jockey: string;
  odds: number | null;
  popularity: number | null;
  horses: {
    id: string;
    name: string;
    sex: string;
    sire: string | null;
  } | null;
};

type VotePick = {
  pick_type: string;
  race_entry_id: string;
};

type Props = {
  raceId: string;
  entries: Entry[];
  existingPicks: VotePick[];
  postTime: string | null;
};

export default function VoteEditForm({ raceId, entries, existingPicks, postTime }: Props) {
  const existingWin = existingPicks.find((p) => p.pick_type === "win")?.race_entry_id ?? null;
  const existingPlace = existingPicks.filter((p) => p.pick_type === "place").map((p) => p.race_entry_id);
  const existingBack = existingPicks.filter((p) => p.pick_type === "back").map((p) => p.race_entry_id);
  const existingDanger = existingPicks.find((p) => p.pick_type === "danger")?.race_entry_id ?? null;

  const [winPick, setWinPick] = useState<string | null>(existingWin);
  const [placePicks, setPlacePicks] = useState<string[]>(existingPlace);
  const [backPicks, setBackPicks] = useState<string[]>(existingBack);
  const [dangerPick, setDangerPick] = useState<string | null>(existingDanger);
  const [activeTab, setActiveTab] = useState<"win" | "place" | "back" | "danger">("win");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [mode, setMode] = useState<"view" | "edit">("view");
  const router = useRouter();
  const { showToast } = useToast();

  // 締切チェック（発走2分前）
  const isBeforeDeadline = postTime
    ? Date.now() < new Date(postTime).getTime() - 2 * 60 * 1000
    : false;

  // 他タブで選択済みかチェック
  const isUsedInOtherTab = (entryId: string): string | null => {
    if (activeTab !== "win" && winPick === entryId) return "◎";
    if (activeTab !== "place" && placePicks.includes(entryId)) return "○";
    if (activeTab !== "back" && backPicks.includes(entryId)) return "△";
    if (activeTab !== "danger" && dangerPick === entryId) return "⚠️";
    return null;
  };

  const togglePlace = (id: string) => {
    if (placePicks.includes(id)) {
      setPlacePicks(placePicks.filter((p) => p !== id));
    } else if (placePicks.length < 2) {
      setPlacePicks([...placePicks, id]);
    }
  };

  const toggleBack = (id: string) => {
    if (backPicks.includes(id)) {
      setBackPicks(backPicks.filter((p) => p !== id));
    } else if (backPicks.length < 5) {
      setBackPicks([...backPicks, id]);
    }
  };

  const handleUpdate = async () => {
    if (!winPick) {
      setError("1着予想を選択してください");
      return;
    }
    setShowConfirm(false);
    setLoading(true);
    setError("");

    const res = await fetch(`/api/races/${raceId}/votes`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ winPick, placePicks, backPicks, dangerPick }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "変更に失敗しました");
      setLoading(false);
      return;
    }

    showToast("投票を変更しました！✏️");
    setMode("view");
    router.refresh();
  };

  const handleCancel = async () => {
    if (!confirm("投票を取り消しますか？この操作は元に戻せません。")) return;
    setLoading(true);

    const res = await fetch(`/api/races/${raceId}/votes`, { method: "DELETE" });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "取り消しに失敗しました");
      setLoading(false);
      return;
    }

    showToast("投票を取り消しました 🗑");
    router.refresh();
  };

  if (!isBeforeDeadline) return null;

  if (mode === "view") {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-gray-700">✏️ 投票の変更・取消</span>
          <div className="flex gap-2">
            <button
              onClick={() => setMode("edit")}
              className="px-3 py-1.5 bg-blue-100 text-blue-700 text-xs font-bold rounded-lg hover:bg-blue-200 transition-colors"
            >
              変更する
            </button>
            <button
              onClick={handleCancel}
              disabled={loading}
              className="px-3 py-1.5 bg-red-100 text-red-700 text-xs font-bold rounded-lg hover:bg-red-200 transition-colors disabled:opacity-40"
            >
              取り消す
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-1">発走2分前まで変更できます</p>
      </div>
    );
  }

  const tabs = [
    { key: "win" as const, label: "◎ 1着予想", desc: "1頭選択" },
    { key: "place" as const, label: "○ 複勝予想", desc: "0〜2頭" },
    { key: "back" as const, label: "△ 抑え", desc: "0〜5頭" },
    { key: "danger" as const, label: "⚠️ 危険馬", desc: "0〜1頭" },
  ];

  return (
    <div className="bg-white rounded-2xl border-2 border-blue-200 overflow-hidden">
      <div className="bg-blue-50 px-4 py-2 flex items-center justify-between">
        <span className="text-sm font-bold text-blue-700">✏️ 投票変更モード</span>
        <button
          onClick={() => setMode("view")}
          className="text-xs text-blue-600 font-bold hover:underline"
        >
          キャンセル
        </button>
      </div>

      {/* タブ */}
      <div className="flex border-b border-gray-100">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
              activeTab === tab.key ? "text-blue-600 bg-blue-50" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
            <span className="block text-xs font-normal text-gray-400">{tab.desc}</span>
            {activeTab === tab.key && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />}
          </button>
        ))}
      </div>

      {/* 馬リスト */}
      <div className="p-4 space-y-1.5 max-h-96 overflow-y-auto">
        {entries.map((entry) => {
          const isSelected =
            activeTab === "win" ? winPick === entry.id
            : activeTab === "place" ? placePicks.includes(entry.id)
            : activeTab === "back" ? backPicks.includes(entry.id)
            : dangerPick === entry.id;

          const usedIn = isUsedInOtherTab(entry.id);
          const isMaxPlace = activeTab === "place" && placePicks.length >= 2 && !isSelected;
          const isMaxBack = activeTab === "back" && backPicks.length >= 5 && !isSelected;
          const isDisabled = !!usedIn || isMaxPlace || isMaxBack;

          return (
            <button
              key={entry.id}
              onClick={() => {
                if (isDisabled) return;
                if (activeTab === "win") setWinPick(isSelected ? null : entry.id);
                else if (activeTab === "place") togglePlace(entry.id);
                else if (activeTab === "back") toggleBack(entry.id);
                else setDangerPick(isSelected ? null : entry.id);
              }}
              disabled={isDisabled}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${
                isSelected
                  ? activeTab === "win" ? "bg-red-50 border-2 border-red-300"
                  : activeTab === "place" ? "bg-blue-50 border-2 border-blue-300"
                  : activeTab === "back" ? "bg-yellow-50 border-2 border-yellow-300"
                  : "bg-gray-100 border-2 border-gray-400"
                  : usedIn ? "bg-gray-50 border-2 border-transparent opacity-30"
                  : "bg-gray-50 border-2 border-transparent hover:border-gray-200"
              } ${(isMaxPlace || isMaxBack) ? "opacity-40" : ""}`}
            >
              <span className="w-8 h-8 rounded-full bg-gray-800 text-white flex items-center justify-center text-sm font-bold shrink-0">
                {entry.post_number}
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-gray-800 truncate">
                  {entry.horses?.name}
                  {usedIn && <span className="text-[10px] text-gray-400 font-normal ml-1">（{usedIn}で選択中）</span>}
                </div>
                <div className="text-xs text-gray-400">{entry.jockey}</div>
              </div>
              <div className="text-right shrink-0">
                {entry.odds && <span className="font-bold text-gray-700">{entry.odds}</span>}
                {entry.popularity && <div className="text-xs text-gray-400">{entry.popularity}人気</div>}
              </div>
              <div className="w-6 shrink-0 text-center">
                {isSelected && (
                  <span className={`text-lg ${
                    activeTab === "win" ? "text-red-500" 
                    : activeTab === "place" ? "text-blue-500" 
                    : activeTab === "back" ? "text-yellow-600" 
                    : "text-gray-500"
                  }`}>
                    {activeTab === "win" ? "◎" : activeTab === "place" ? "○" : activeTab === "back" ? "△" : "⚠️"}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* フッター */}
      <div className="border-t border-gray-100 p-4 bg-gray-50">
        <div className="flex flex-wrap gap-2 mb-3 min-h-[28px]">
          {winPick && (
            <span className="bg-red-100 text-red-700 text-xs px-2.5 py-1 rounded-full font-medium">
              ◎ {entries.find((e) => e.id === winPick)?.horses?.name}
            </span>
          )}
          {placePicks.map((id) => (
            <span key={id} className="bg-blue-100 text-blue-700 text-xs px-2.5 py-1 rounded-full font-medium">
              ○ {entries.find((e) => e.id === id)?.horses?.name}
            </span>
          ))}
          {backPicks.map((id) => (
            <span key={id} className="bg-yellow-100 text-yellow-700 text-xs px-2.5 py-1 rounded-full font-medium">
              △ {entries.find((e) => e.id === id)?.horses?.name}
            </span>
          ))}
          {dangerPick && (
            <span className="bg-gray-200 text-gray-700 text-xs px-2.5 py-1 rounded-full font-medium">
              ⚠️ {entries.find((e) => e.id === dangerPick)?.horses?.name}
            </span>
          )}
          {!winPick && !placePicks.length && !backPicks.length && !dangerPick && (
            <span className="text-xs text-gray-400">馬を選択してください</span>
          )}
        </div>
        {error && <div className="text-sm text-red-600 bg-red-50 p-2 rounded-lg mb-3">{error}</div>}
        <button
          onClick={() => { if (winPick) setShowConfirm(true); else setError("1着予想を選択してください"); }}
          disabled={!winPick || loading}
          className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-40"
        >
          {loading ? "変更中..." : "✏️ この内容で変更する"}
        </button>
      </div>

      {/* 確認モーダル */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowConfirm(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-800 mb-4 text-center">✏️ 変更内容の確認</h3>
            <div className="space-y-3 mb-6 max-h-80 overflow-y-auto">
              {winPick && (() => {
                const e = entries.find((x) => x.id === winPick);
                return e ? (
                  <div className="flex items-center gap-2 bg-red-50 rounded-lg p-3">
                    <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded">◎ 1着</span>
                    <span className="w-6 h-6 rounded-full bg-gray-800 text-white flex items-center justify-center text-xs font-bold">{e.post_number}</span>
                    <span className="font-bold text-gray-800">{e.horses?.name}</span>
                  </div>
                ) : null;
              })()}
              {placePicks.map((id) => {
                const e = entries.find((x) => x.id === id);
                return e ? (
                  <div key={id} className="flex items-center gap-2 bg-blue-50 rounded-lg p-3">
                    <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded">○ 複勝</span>
                    <span className="w-6 h-6 rounded-full bg-gray-800 text-white flex items-center justify-center text-xs font-bold">{e.post_number}</span>
                    <span className="font-bold text-gray-800">{e.horses?.name}</span>
                  </div>
                ) : null;
              })}
              {backPicks.map((id) => {
                const e = entries.find((x) => x.id === id);
                return e ? (
                  <div key={id} className="flex items-center gap-2 bg-yellow-50 rounded-lg p-3">
                    <span className="text-xs font-bold text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded">△ 抑え</span>
                    <span className="w-6 h-6 rounded-full bg-gray-800 text-white flex items-center justify-center text-xs font-bold">{e.post_number}</span>
                    <span className="font-bold text-gray-800">{e.horses?.name}</span>
                  </div>
                ) : null;
              })}
              {dangerPick && (() => {
                const e = entries.find((x) => x.id === dangerPick);
                return e ? (
                  <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-3">
                    <span className="text-xs font-bold text-gray-600 bg-gray-200 px-2 py-0.5 rounded">⚠️ 危険</span>
                    <span className="w-6 h-6 rounded-full bg-gray-800 text-white flex items-center justify-center text-xs font-bold">{e.post_number}</span>
                    <span className="font-bold text-gray-800">{e.horses?.name}</span>
                  </div>
                ) : null;
              })()}
              {!dangerPick && placePicks.length === 0 && backPicks.length === 0 && (
                <p className="text-xs text-gray-400 text-center">※ 複勝・抑え・危険馬は未選択です（任意）</p>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowConfirm(false)} className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors">戻る</button>
              <button onClick={handleUpdate} className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors">変更する</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
