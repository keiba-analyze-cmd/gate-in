"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

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

type Props = {
  raceId: string;
  entries: Entry[];
};

export default function VoteForm({ raceId, entries }: Props) {
  const [winPick, setWinPick] = useState<string | null>(null);
  const [placePicks, setPlacePicks] = useState<string[]>([]);
  const [dangerPick, setDangerPick] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"win" | "place" | "danger">("win");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClient();

  const togglePlace = (id: string) => {
    if (placePicks.includes(id)) {
      setPlacePicks(placePicks.filter((p) => p !== id));
    } else if (placePicks.length < 2) {
      setPlacePicks([...placePicks, id]);
    }
  };

  const handleSubmit = async () => {
    if (!winPick) {
      setError("1着予想を選択してください");
      return;
    }
    setLoading(true);
    setError("");

    // 投票ヘッダー作成
    const { data: vote, error: voteErr } = await supabase
      .from("votes")
      .insert({ user_id: (await supabase.auth.getUser()).data.user!.id, race_id: raceId })
      .select()
      .single();

    if (voteErr || !vote) {
      setError("投票に失敗しました: " + (voteErr?.message ?? ""));
      setLoading(false);
      return;
    }

    // 投票詳細作成
    const picks = [
      { vote_id: vote.id, pick_type: "win", race_entry_id: winPick },
      ...placePicks.map((id) => ({
        vote_id: vote.id,
        pick_type: "place",
        race_entry_id: id,
      })),
      ...(dangerPick
        ? [{ vote_id: vote.id, pick_type: "danger", race_entry_id: dangerPick }]
        : []),
    ];

    const { error: pickErr } = await supabase.from("vote_picks").insert(picks);

    if (pickErr) {
      setError("投票詳細の保存に失敗しました: " + pickErr.message);
      setLoading(false);
      return;
    }

    router.refresh();
  };

  const tabs = [
    { key: "win" as const, label: "◎ 1着予想", required: true, desc: "1頭選択" },
    { key: "place" as const, label: "○ 複勝予想", required: false, desc: "0〜2頭" },
    { key: "danger" as const, label: "△ 危険馬", required: false, desc: "0〜1頭" },
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {/* タブ */}
      <div className="flex border-b border-gray-100">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
              activeTab === tab.key
                ? "text-green-600 bg-green-50"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
            <span className="block text-xs font-normal text-gray-400">{tab.desc}</span>
            {activeTab === tab.key && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-600" />
            )}
          </button>
        ))}
      </div>

      {/* 馬リスト */}
      <div className="p-4 space-y-1.5 max-h-96 overflow-y-auto">
        {entries.map((entry) => {
          const isSelected =
            activeTab === "win"
              ? winPick === entry.id
              : activeTab === "place"
              ? placePicks.includes(entry.id)
              : dangerPick === entry.id;

          const isDisabled =
            activeTab === "place" && placePicks.length >= 2 && !isSelected;

          return (
            <button
              key={entry.id}
              onClick={() => {
                if (activeTab === "win") setWinPick(isSelected ? null : entry.id);
                else if (activeTab === "place") togglePlace(entry.id);
                else setDangerPick(isSelected ? null : entry.id);
              }}
              disabled={isDisabled}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${
                isSelected
                  ? activeTab === "win"
                    ? "bg-red-50 border-2 border-red-300"
                    : activeTab === "place"
                    ? "bg-blue-50 border-2 border-blue-300"
                    : "bg-gray-100 border-2 border-gray-400"
                  : "bg-gray-50 border-2 border-transparent hover:border-gray-200"
              } ${isDisabled ? "opacity-40" : ""}`}
            >
              {/* 馬番 */}
              <span className="w-8 h-8 rounded-full bg-gray-800 text-white flex items-center justify-center text-sm font-bold shrink-0">
                {entry.post_number}
              </span>

              {/* 馬名・騎手 */}
              <div className="flex-1 min-w-0">
                <div className="font-bold text-gray-800 truncate">
                  {entry.horses?.name}
                </div>
                <div className="text-xs text-gray-400">
                  {entry.jockey}
                  {entry.horses?.sire && ` / ${entry.horses.sire}`}
                </div>
              </div>

              {/* オッズ */}
              <div className="text-right shrink-0">
                {entry.odds && (
                  <span className="font-bold text-gray-700">{entry.odds}</span>
                )}
                {entry.popularity && (
                  <div className="text-xs text-gray-400">{entry.popularity}人気</div>
                )}
              </div>

              {/* 選択マーク */}
              <div className="w-6 shrink-0 text-center">
                {isSelected && (
                  <span className={`text-lg ${
                    activeTab === "win" ? "text-red-500" :
                    activeTab === "place" ? "text-blue-500" : "text-gray-500"
                  }`}>
                    {activeTab === "win" ? "◎" : activeTab === "place" ? "○" : "△"}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* 投票サマリー + 送信ボタン */}
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
          {dangerPick && (
            <span className="bg-gray-200 text-gray-700 text-xs px-2.5 py-1 rounded-full font-medium">
              △ {entries.find((e) => e.id === dangerPick)?.horses?.name}
            </span>
          )}
          {!winPick && !placePicks.length && !dangerPick && (
            <span className="text-xs text-gray-400">馬を選択してください</span>
          )}
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-2 rounded-lg mb-3">{error}</div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!winPick || loading}
          className="w-full py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors disabled:opacity-40 disabled:hover:bg-green-600"
        >
          {loading ? "投票中..." : "🗳 この予想で投票する"}
        </button>
      </div>
    </div>
  );
}
