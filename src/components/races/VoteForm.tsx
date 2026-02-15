"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import Link from "next/link";

type Entry = {
  id: string;
  post_number: number;
  gate_number: number | null;
  jockey: string;
  odds: number | null;
  popularity: number | null;
  horses: { id: string; name: string; sex: string; sire: string | null } | null;
};

type CopySource = {
  vote_id: string;
  user_id: string;
  user_name: string;
  picks: { pick_type: string; race_entry_id: string }[];
};

type Props = { raceId: string; entries: Entry[] };

export default function VoteForm({ raceId, entries }: Props) {
  const [winPick, setWinPick] = useState<string | null>(null);
  const [placePicks, setPlacePicks] = useState<string[]>([]);
  const [backPicks, setBackPicks] = useState<string[]>([]);
  const [dangerPick, setDangerPick] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"win" | "place" | "back" | "danger">("win");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [copySource, setCopySource] = useState<CopySource | null>(null);
  const [loadingCopy, setLoadingCopy] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const supabase = createClient();

  // URLパラメータから乗っかり元を取得
  useEffect(() => {
    const copyFromVoteId = searchParams.get("copy_from");
    if (copyFromVoteId) {
      loadCopySource(copyFromVoteId);
    }
  }, [searchParams]);

  const loadCopySource = async (voteId: string) => {
    setLoadingCopy(true);
    try {
      const res = await fetch(`/api/votes/${voteId}/copy`);
      if (res.ok) {
        const data = await res.json();
        setCopySource(data);
        
        // picksをプリセット
        const winEntry = data.picks.find((p: any) => p.pick_type === "win");
        const placeEntries = data.picks.filter((p: any) => p.pick_type === "place");
        const backEntries = data.picks.filter((p: any) => p.pick_type === "back");
        const dangerEntry = data.picks.find((p: any) => p.pick_type === "danger");
        
        if (winEntry) setWinPick(winEntry.race_entry_id);
        setPlacePicks(placeEntries.map((p: any) => p.race_entry_id));
        setBackPicks(backEntries.map((p: any) => p.race_entry_id));
        if (dangerEntry) setDangerPick(dangerEntry.race_entry_id);
      }
    } catch {}
    setLoadingCopy(false);
  };

  // 他タブで選択済みかチェック
  const isUsedInOtherTab = (entryId: string): string | null => {
    if (activeTab !== "win" && winPick === entryId) return "◎";
    if (activeTab !== "place" && placePicks.includes(entryId)) return "○";
    if (activeTab !== "back" && backPicks.includes(entryId)) return "△";
    if (activeTab !== "danger" && dangerPick === entryId) return "⚠️";
    return null;
  };

  const togglePlace = (id: string) => {
    if (placePicks.includes(id)) setPlacePicks(placePicks.filter((p) => p !== id));
    else if (placePicks.length < 2) setPlacePicks([...placePicks, id]);
  };

  const toggleBack = (id: string) => {
    if (backPicks.includes(id)) setBackPicks(backPicks.filter((p) => p !== id));
    else if (backPicks.length < 5) setBackPicks([...backPicks, id]);
  };

  const handleConfirmOpen = () => {
    if (!winPick) { setError("1着予想を選択してください"); return; }
    setShowConfirm(true);
  };

  const handleSubmit = async () => {
    setShowConfirm(false);
    setLoading(true);
    setError("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("ログインが必要です");
      setLoading(false);
      return;
    }

    // 乗っかり元がある場合はcopied_from_vote_idを含める
    const voteData: any = {
      user_id: user.id,
      race_id: raceId,
    };
    if (copySource) {
      voteData.copied_from_vote_id = copySource.vote_id;
    }

    const { data: vote, error: voteErr } = await supabase
      .from("votes")
      .insert(voteData)
      .select().single();

    if (voteErr || !vote) {
      setError("投票に失敗しました: " + (voteErr?.message ?? ""));
      setLoading(false);
      return;
    }

    const picks = [
      { vote_id: vote.id, pick_type: "win", race_entry_id: winPick },
      ...placePicks.map((id) => ({ vote_id: vote.id, pick_type: "place", race_entry_id: id })),
      ...backPicks.map((id) => ({ vote_id: vote.id, pick_type: "back", race_entry_id: id })),
      ...(dangerPick ? [{ vote_id: vote.id, pick_type: "danger", race_entry_id: dangerPick }] : []),
    ];

    const { error: pickErr } = await supabase.from("vote_picks").insert(picks);
    if (pickErr) {
      setError("投票詳細の保存に失敗しました: " + pickErr.message);
      setLoading(false);
      return;
    }

    // 乗っかり元がある場合、通知を送信
    if (copySource) {
      await fetch("/api/votes/copy-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          original_vote_id: copySource.vote_id,
          original_user_id: copySource.user_id,
        }),
      });
    }

    showToast(copySource ? "乗っかり投票が完了しました！🚀" : "投票が完了しました！🎉");
    router.refresh();
  };

  const clearCopySource = () => {
    setCopySource(null);
    setWinPick(null);
    setPlacePicks([]);
    setBackPicks([]);
    setDangerPick(null);
    // URLからcopy_fromパラメータを削除
    router.replace(`/races/${raceId}`);
  };

  const tabs = [
    { key: "win" as const, label: "◎ 1着予想", required: true, desc: "1頭選択" },
    { key: "place" as const, label: "○ 複勝予想", required: false, desc: "0〜2頭" },
    { key: "back" as const, label: "△ 抑え", required: false, desc: "0〜5頭" },
    { key: "danger" as const, label: "⚠️ 危険馬", required: false, desc: "0〜1頭" },
  ];

  const getMarkDisplay = (tab: "win" | "place" | "back" | "danger") => {
    switch (tab) {
      case "win": return { mark: "◎", color: "text-red-500" };
      case "place": return { mark: "○", color: "text-blue-500" };
      case "back": return { mark: "△", color: "text-yellow-600" };
      case "danger": return { mark: "⚠️", color: "text-gray-500" };
    }
  };

  const getSelectedStyle = (tab: "win" | "place" | "back" | "danger") => {
    switch (tab) {
      case "win": return "bg-red-50 border-2 border-red-300";
      case "place": return "bg-blue-50 border-2 border-blue-300";
      case "back": return "bg-yellow-50 border-2 border-yellow-300";
      case "danger": return "bg-gray-100 border-2 border-gray-400";
    }
  };

  if (loadingCopy) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
        <div className="text-gray-400 text-sm">予想を読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {/* 乗っかり元の表示 */}
      {copySource && (
        <div className="bg-blue-50 border-b border-blue-100 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-blue-600 text-sm">🚀</span>
              <span className="text-sm text-blue-700">
                <Link href={`/users/${copySource.user_id}`} className="font-bold hover:underline">
                  {copySource.user_name}
                </Link>
                さんの予想をベースにしています
              </span>
            </div>
            <button
              onClick={clearCopySource}
              className="text-xs text-blue-500 hover:text-blue-700"
            >
              クリア
            </button>
          </div>
        </div>
      )}

      <div className="flex border-b border-gray-100">
        {tabs.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
              activeTab === tab.key ? "text-green-600 bg-green-50" : "text-gray-500 hover:text-gray-700"
            }`}>
            {tab.label}
            <span className="block text-xs font-normal text-gray-400">{tab.desc}</span>
            {activeTab === tab.key && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-600" />}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-1.5 max-h-96 overflow-y-auto">
        {entries.map((entry) => {
          const isSelected = activeTab === "win" ? winPick === entry.id
            : activeTab === "place" ? placePicks.includes(entry.id)
            : activeTab === "back" ? backPicks.includes(entry.id)
            : dangerPick === entry.id;

          const usedIn = isUsedInOtherTab(entry.id);
          const isMaxPlace = activeTab === "place" && placePicks.length >= 2 && !isSelected;
          const isMaxBack = activeTab === "back" && backPicks.length >= 5 && !isSelected;
          const isDisabled = !!usedIn || isMaxPlace || isMaxBack;

          const { mark, color } = getMarkDisplay(activeTab);

          return (
            <button key={entry.id}
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
                  ? getSelectedStyle(activeTab)
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
                <div className="text-xs text-gray-400">
                  {entry.jockey}{entry.horses?.sire && ` / ${entry.horses.sire}`}
                </div>
              </div>
              <div className="text-right shrink-0">
                {entry.odds && <span className="font-bold text-gray-700">{entry.odds}</span>}
                {entry.popularity && <div className="text-xs text-gray-400">{entry.popularity}人気</div>}
              </div>
              <div className="w-6 shrink-0 text-center">
                {isSelected && (
                  <span className={`text-lg ${color}`}>{mark}</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="border-t border-gray-100 p-4 bg-gray-50">
        <div className="flex flex-wrap gap-2 mb-3 min-h-[28px]">
          {winPick && <span className="bg-red-100 text-red-700 text-xs px-2.5 py-1 rounded-full font-medium">◎ {entries.find((e) => e.id === winPick)?.horses?.name}</span>}
          {placePicks.map((id) => <span key={id} className="bg-blue-100 text-blue-700 text-xs px-2.5 py-1 rounded-full font-medium">○ {entries.find((e) => e.id === id)?.horses?.name}</span>)}
          {backPicks.map((id) => <span key={id} className="bg-yellow-100 text-yellow-700 text-xs px-2.5 py-1 rounded-full font-medium">△ {entries.find((e) => e.id === id)?.horses?.name}</span>)}
          {dangerPick && <span className="bg-gray-200 text-gray-700 text-xs px-2.5 py-1 rounded-full font-medium">⚠️ {entries.find((e) => e.id === dangerPick)?.horses?.name}</span>}
          {!winPick && !placePicks.length && !backPicks.length && !dangerPick && <span className="text-xs text-gray-400">馬を選択してください</span>}
        </div>
        {error && <div className="text-sm text-red-600 bg-red-50 p-2 rounded-lg mb-3">{error}</div>}
        <button onClick={handleConfirmOpen} disabled={!winPick || loading}
          className="w-full py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors disabled:opacity-40 disabled:hover:bg-green-600">
          {loading ? "投票中..." : copySource ? "🚀 この予想で乗っかる" : "🗳 この予想で投票する"}
        </button>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowConfirm(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-800 mb-4 text-center">
              {copySource ? "🚀 乗っかり確認" : "📋 投票内容の確認"}
            </h3>
            {copySource && (
              <div className="text-xs text-blue-600 text-center mb-3">
                {copySource.user_name}さんの予想をベースにしています
              </div>
            )}
            <div className="space-y-3 mb-6 max-h-80 overflow-y-auto">
              {winPick && (() => { const e = entries.find((x) => x.id === winPick); return e ? (
                <div className="flex items-center gap-2 bg-red-50 rounded-lg p-3">
                  <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded">◎ 1着</span>
                  <span className="w-6 h-6 rounded-full bg-gray-800 text-white flex items-center justify-center text-xs font-bold">{e.post_number}</span>
                  <span className="font-bold text-gray-800">{e.horses?.name}</span>
                </div>) : null; })()}
              {placePicks.map((id) => { const e = entries.find((x) => x.id === id); return e ? (
                <div key={id} className="flex items-center gap-2 bg-blue-50 rounded-lg p-3">
                  <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded">○ 複勝</span>
                  <span className="w-6 h-6 rounded-full bg-gray-800 text-white flex items-center justify-center text-xs font-bold">{e.post_number}</span>
                  <span className="font-bold text-gray-800">{e.horses?.name}</span>
                </div>) : null; })}
              {backPicks.map((id) => { const e = entries.find((x) => x.id === id); return e ? (
                <div key={id} className="flex items-center gap-2 bg-yellow-50 rounded-lg p-3">
                  <span className="text-xs font-bold text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded">△ 抑え</span>
                  <span className="w-6 h-6 rounded-full bg-gray-800 text-white flex items-center justify-center text-xs font-bold">{e.post_number}</span>
                  <span className="font-bold text-gray-800">{e.horses?.name}</span>
                </div>) : null; })}
              {dangerPick && (() => { const e = entries.find((x) => x.id === dangerPick); return e ? (
                <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-3">
                  <span className="text-xs font-bold text-gray-600 bg-gray-200 px-2 py-0.5 rounded">⚠️ 危険</span>
                  <span className="w-6 h-6 rounded-full bg-gray-800 text-white flex items-center justify-center text-xs font-bold">{e.post_number}</span>
                  <span className="font-bold text-gray-800">{e.horses?.name}</span>
                </div>) : null; })()}
              {!dangerPick && placePicks.length === 0 && backPicks.length === 0 && (
                <p className="text-xs text-gray-400 text-center">※ 複勝・抑え・危険馬は未選択です（任意）</p>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowConfirm(false)} className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors">戻る</button>
              <button onClick={handleSubmit} className="flex-1 py-3 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 transition-colors">
                {copySource ? "乗っかる" : "投票する"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
