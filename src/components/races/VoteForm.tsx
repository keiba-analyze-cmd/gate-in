"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { useTheme } from "@/contexts/ThemeContext";
import Link from "next/link";
import dynamic from "next/dynamic";

const VoteShareCard = dynamic(() => import("@/components/share/VoteShareCard"), { ssr: false });

// 枠番カラー（JRA公式準拠）
function getGateColor(gate: number | null): string {
  if (!gate) return "bg-gray-200 text-gray-700";
  const colors: Record<number, string> = {
    1: "bg-white text-gray-800 border border-gray-300",
    2: "bg-black text-white",
    3: "bg-red-600 text-white",
    4: "bg-blue-600 text-white",
    5: "bg-yellow-400 text-gray-900",
    6: "bg-green-600 text-white",
    7: "bg-orange-500 text-white",
    8: "bg-pink-400 text-white",
  };
  return colors[gate] || "bg-gray-200 text-gray-700";
}



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

type Props = { 
  raceId: string; 
  entries: Entry[];
  raceInfo?: {
    name: string;
    date: string;
    courseName: string;
    grade?: string | null;
  };
  userName?: string;
  userHandle?: string | null;
};

export default function VoteForm({ raceId, entries, raceInfo, userName, userHandle }: Props) {
  const { isDark } = useTheme();
  const [winPick, setWinPick] = useState<string | null>(null);
  const [placePicks, setPlacePicks] = useState<string[]>([]);
  const [backPicks, setBackPicks] = useState<string[]>([]);
  const [dangerPick, setDangerPick] = useState<string | null>(null);
  const [comment, setComment] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"win" | "place" | "back" | "danger">("win");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [showShareCard, setShowShareCard] = useState(false);
  const [submittedPicks, setSubmittedPicks] = useState<{pick_type: string; post_number: number; horse_name: string}[]>([]);
  const [copySource, setCopySource] = useState<CopySource | null>(null);
  const [loadingCopy, setLoadingCopy] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const supabase = createClient();

  // スタイル定義
  const cardBg = isDark ? "bg-slate-900 border-slate-700" : "bg-white border-gray-100";
  const textPrimary = isDark ? "text-slate-100" : "text-gray-800";
  const textSecondary = isDark ? "text-slate-400" : "text-gray-500";
  const textMuted = isDark ? "text-slate-500" : "text-gray-400";
  const borderColor = isDark ? "border-slate-700" : "border-gray-100";
  const btnPrimary = isDark ? "bg-amber-500 hover:bg-amber-600 text-slate-900" : "bg-green-600 hover:bg-green-700 text-white";

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

    const voteData: any = { user_id: user.id, race_id: raceId };
    if (copySource) voteData.copied_from_vote_id = copySource.vote_id;
    if (comment.trim()) voteData.comment = comment.trim();

    const { data: vote, error: voteErr } = await supabase.from("votes").insert(voteData).select().single();
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

    if (copySource) {
      await fetch("/api/votes/copy-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ original_vote_id: copySource.vote_id, original_user_id: copySource.user_id }),
      });
    }

    // My新聞メンバーに通知（バックグラウンドで実行）

    // 週間大会エントリーを更新
    fetch("/api/votes/update-contest-entry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ race_id: raceId }),
    }).catch(() => {});
    fetch("/api/votes/notify-newspaper", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ race_id: raceId }),
    }).catch(() => {});

    showToast(copySource ? "乗っかり投票が完了しました！🚀" : "投票が完了しました！🎉");
    
    // シェアカード用にpicksを保存
    if (raceInfo) {
      const picksForShare = [
        winPick ? { pick_type: "win", post_number: entries.find(e => e.id === winPick)?.post_number ?? 0, horse_name: entries.find(e => e.id === winPick)?.horses?.name ?? "" } : null,
        ...placePicks.map(id => ({ pick_type: "place", post_number: entries.find(e => e.id === id)?.post_number ?? 0, horse_name: entries.find(e => e.id === id)?.horses?.name ?? "" })),
        ...backPicks.map(id => ({ pick_type: "back", post_number: entries.find(e => e.id === id)?.post_number ?? 0, horse_name: entries.find(e => e.id === id)?.horses?.name ?? "" })),
        dangerPick ? { pick_type: "danger", post_number: entries.find(e => e.id === dangerPick)?.post_number ?? 0, horse_name: entries.find(e => e.id === dangerPick)?.horses?.name ?? "" } : null,
      ].filter(Boolean) as {pick_type: string; post_number: number; horse_name: string}[];
      setSubmittedPicks(picksForShare);
      setShowShareCard(true);
    }
    
    // router.refresh(); ← シェアカード閉じる時に移動
  };

  const clearCopySource = () => {
    setCopySource(null);
    setWinPick(null);
    setPlacePicks([]);
    setBackPicks([]);
    setDangerPick(null);
    router.replace(`/races/${raceId}`);
  };

  const tabs = [
    { key: "win" as const, label: "◎ 1着予想", required: true, desc: "1頭選択" },
    { key: "place" as const, label: "○ 対抗", required: false, desc: "0〜2頭" },
    { key: "back" as const, label: "△ 抑え", required: false, desc: "0〜5頭" },
    { key: "danger" as const, label: "⚠️ 危険馬", required: false, desc: "0〜1頭" },
  ];

  const getMarkDisplay = (tab: "win" | "place" | "back" | "danger") => {
    switch (tab) {
      case "win": return { mark: "◎", color: "text-red-500" };
      case "place": return { mark: "○", color: "text-blue-500" };
      case "back": return { mark: "△", color: isDark ? "text-yellow-400" : "text-yellow-600" };
      case "danger": return { mark: "⚠️", color: textSecondary };
    }
  };

  const getSelectedStyle = (tab: "win" | "place" | "back" | "danger") => {
    if (isDark) {
      switch (tab) {
        case "win": return "bg-red-500/20 border-2 border-red-500/50";
        case "place": return "bg-blue-500/20 border-2 border-blue-500/50";
        case "back": return "bg-yellow-500/20 border-2 border-yellow-500/50";
        case "danger": return "bg-slate-700 border-2 border-slate-500";
      }
    }
    switch (tab) {
      case "win": return "bg-red-50 border-2 border-red-300";
      case "place": return "bg-blue-50 border-2 border-blue-300";
      case "back": return "bg-yellow-50 border-2 border-yellow-300";
      case "danger": return "bg-gray-100 border-2 border-gray-400";
    }
  };

  const getTabStyle = (tabKey: string) => {
    if (activeTab === tabKey) {
      return isDark ? "text-amber-400 bg-slate-800" : "text-green-600 bg-green-50";
    }
    return isDark ? "text-slate-400 hover:text-slate-200" : "text-gray-500 hover:text-gray-700";
  };

  if (loadingCopy) {
    return (
      <div className={`rounded-2xl border p-8 text-center ${cardBg}`}>
        <div className={`text-sm ${textMuted}`}>予想を読み込み中...</div>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border overflow-hidden ${cardBg}`}>
      <div className={`p-4 border-b ${borderColor}`}>
        <h2 className={`font-bold ${textPrimary}`}>🗳 予想を投票する</h2>
        <p className={`text-xs mt-1 ${textMuted}`}>本命（必須）+ 対抗・抑え・危険馬（任意）</p>
      </div>

      {copySource && (
        <div className={`p-4 border-b ${isDark ? "bg-blue-500/10 border-blue-500/30" : "bg-blue-50 border-blue-100"}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🚀</span>
              <span className={`text-sm font-medium ${isDark ? "text-blue-400" : "text-blue-700"}`}>
                {copySource.user_name}さんの予想をベースにしています
              </span>
            </div>
            <button onClick={clearCopySource} className={`text-xs ${isDark ? "text-blue-400 hover:text-blue-300" : "text-blue-500 hover:text-blue-700"}`}>
              クリア
            </button>
          </div>
        </div>
      )}

      <div className={`flex border-b ${borderColor}`}>
        {tabs.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-3 text-sm font-medium transition-colors relative ${getTabStyle(tab.key)}`}>
            {tab.label}
            <span className={`block text-xs font-normal ${textMuted}`}>{tab.desc}</span>
            {activeTab === tab.key && <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${isDark ? "bg-amber-500" : "bg-green-600"}`} />}
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

          const defaultStyle = isDark
            ? "bg-slate-800 border-2 border-transparent hover:border-slate-600"
            : "bg-gray-50 border-2 border-transparent hover:border-gray-200";

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
                isSelected ? getSelectedStyle(activeTab)
                : usedIn ? `${isDark ? "bg-slate-800" : "bg-gray-50"} border-2 border-transparent opacity-30`
                : defaultStyle
              } ${(isMaxPlace || isMaxBack) ? "opacity-40" : ""}`}
            >
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${getGateColor(entry.gate_number)}`}>
                {entry.post_number}
              </span>
              <div className="flex-1 min-w-0">
                <div className={`font-bold truncate ${textPrimary}`}>
                  {entry.horses?.name}
                  {usedIn && <span className={`text-[10px] font-normal ml-1 ${textMuted}`}>（{usedIn}で選択中）</span>}
                </div>
                <div className={`text-xs ${textMuted}`}>
                  {entry.jockey}{entry.horses?.sire && ` / ${entry.horses.sire}`}
                </div>
              </div>
              <div className="text-right shrink-0">
                {entry.odds && <span className={`font-bold text-sm ${isDark ? "text-slate-200" : "text-gray-700"}`}>{entry.odds}<span className={`text-xs font-normal ${textMuted}`}>倍</span></span>}
                {entry.popularity && <div className={`text-xs ${entry.popularity <= 3 ? (isDark ? "text-amber-400 font-bold" : "text-amber-600 font-bold") : textMuted}`}>{entry.popularity <= 3 ? ["🥇","🥈","🥉"][entry.popularity-1] : ""}{entry.popularity}人気</div>}
              </div>
              <div className="w-6 shrink-0 text-center">
                {isSelected && <span className={`text-lg ${color}`}>{mark}</span>}
              </div>
            </button>
          );
        })}
      </div>

      <div className={`border-t p-4 ${isDark ? "bg-slate-800 border-slate-700" : "bg-gray-50 border-gray-100"}`}>
        <div className="flex flex-wrap gap-2 mb-3 min-h-[28px]">
          {winPick && <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${isDark ? "bg-red-500/20 text-red-400" : "bg-red-100 text-red-700"}`}>◎ {entries.find((e) => e.id === winPick)?.horses?.name}</span>}
          {placePicks.map((id) => <span key={id} className={`text-xs px-2.5 py-1 rounded-full font-medium ${isDark ? "bg-blue-500/20 text-blue-400" : "bg-blue-100 text-blue-700"}`}>○ {entries.find((e) => e.id === id)?.horses?.name}</span>)}
          {backPicks.map((id) => <span key={id} className={`text-xs px-2.5 py-1 rounded-full font-medium ${isDark ? "bg-yellow-500/20 text-yellow-400" : "bg-yellow-100 text-yellow-700"}`}>△ {entries.find((e) => e.id === id)?.horses?.name}</span>)}
          {dangerPick && <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${isDark ? "bg-slate-700 text-slate-300" : "bg-gray-200 text-gray-700"}`}>⚠️ {entries.find((e) => e.id === dangerPick)?.horses?.name}</span>}
          {!winPick && !placePicks.length && !backPicks.length && !dangerPick && <span className={`text-xs ${textMuted}`}>馬を選択してください</span>}
        </div>
        {/* 予想理由コメント */}
        <div className="mb-3">
          <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>
            💬 予想理由（任意・タイムラインに表示されます）
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="例: 前走の末脚が良かった。内枠有利のコースなので..."
            maxLength={200}
            rows={2}
            className={`w-full px-3 py-2 rounded-lg text-sm resize-none ${
              isDark 
                ? "bg-slate-800 border-slate-600 text-slate-100 placeholder-slate-500" 
                : "bg-white border-gray-200 text-gray-800 placeholder-gray-400"
            } border focus:outline-none focus:ring-2 ${isDark ? "focus:ring-amber-500" : "focus:ring-green-500"}`}
          />
          <div className={`text-right text-xs mt-1 ${textMuted}`}>{comment.length}/200</div>
        </div>
        
        {error && <div className={`text-sm p-2 rounded-lg mb-3 ${isDark ? "text-red-400 bg-red-500/10" : "text-red-600 bg-red-50"}`}>{error}</div>}
        <button onClick={handleConfirmOpen} disabled={!winPick || loading}
          className={`w-full py-3 font-bold rounded-xl transition-colors disabled:opacity-40 ${btnPrimary}`}>
          {loading ? "投票中..." : copySource ? "🚀 この予想で乗っかる" : "🗳 この予想で投票する"}
        </button>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowConfirm(false)}>
          <div className={`rounded-2xl p-6 max-w-sm w-full shadow-xl ${isDark ? "bg-slate-900" : "bg-white"}`} onClick={(e) => e.stopPropagation()}>
            <h3 className={`text-lg font-bold mb-4 text-center ${textPrimary}`}>
              {copySource ? "🚀 乗っかり確認" : "📋 投票内容の確認"}
            </h3>
            {copySource && (
              <div className={`text-xs text-center mb-3 ${isDark ? "text-blue-400" : "text-blue-600"}`}>
                {copySource.user_name}さんの予想をベースにしています
              </div>
            )}
            <div className="space-y-3 mb-6 max-h-80 overflow-y-auto">
              {winPick && (() => { const e = entries.find((x) => x.id === winPick); return e ? (
                <div className={`flex items-center gap-2 rounded-lg p-3 ${isDark ? "bg-red-500/10" : "bg-red-50"}`}>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${isDark ? "bg-red-500/20 text-red-400" : "bg-red-100 text-red-600"}`}>◎ 1着</span>
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isDark ? "bg-slate-600 text-slate-100" : "bg-gray-800 text-white"}`}>{e.post_number}</span>
                  <span className={`font-bold ${textPrimary}`}>{e.horses?.name}</span>
                </div>) : null; })()}
              {placePicks.map((id) => { const e = entries.find((x) => x.id === id); return e ? (
                <div key={id} className={`flex items-center gap-2 rounded-lg p-3 ${isDark ? "bg-blue-500/10" : "bg-blue-50"}`}>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${isDark ? "bg-blue-500/20 text-blue-400" : "bg-blue-100 text-blue-600"}`}>○ 対抗</span>
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isDark ? "bg-slate-600 text-slate-100" : "bg-gray-800 text-white"}`}>{e.post_number}</span>
                  <span className={`font-bold ${textPrimary}`}>{e.horses?.name}</span>
                </div>) : null; })}
              {backPicks.map((id) => { const e = entries.find((x) => x.id === id); return e ? (
                <div key={id} className={`flex items-center gap-2 rounded-lg p-3 ${isDark ? "bg-yellow-500/10" : "bg-yellow-50"}`}>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${isDark ? "bg-yellow-500/20 text-yellow-400" : "bg-yellow-100 text-yellow-600"}`}>△ 抑え</span>
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isDark ? "bg-slate-600 text-slate-100" : "bg-gray-800 text-white"}`}>{e.post_number}</span>
                  <span className={`font-bold ${textPrimary}`}>{e.horses?.name}</span>
                </div>) : null; })}
              {dangerPick && (() => { const e = entries.find((x) => x.id === dangerPick); return e ? (
                <div className={`flex items-center gap-2 rounded-lg p-3 ${isDark ? "bg-slate-800" : "bg-gray-50"}`}>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${isDark ? "bg-slate-700 text-slate-300" : "bg-gray-200 text-gray-600"}`}>⚠️ 危険</span>
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isDark ? "bg-slate-600 text-slate-100" : "bg-gray-800 text-white"}`}>{e.post_number}</span>
                  <span className={`font-bold ${textPrimary}`}>{e.horses?.name}</span>
                </div>) : null; })()}
              {!dangerPick && placePicks.length === 0 && backPicks.length === 0 && (
                <p className={`text-xs text-center ${textMuted}`}>※ 対抗・抑え・危険馬は未選択です（任意）</p>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowConfirm(false)} className={`flex-1 py-3 border rounded-xl text-sm font-bold transition-colors ${isDark ? "border-slate-600 text-slate-300 hover:bg-slate-800" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>戻る</button>
              <button onClick={handleSubmit} className={`flex-1 py-3 rounded-xl text-sm font-bold transition-colors ${btnPrimary}`}>
                {copySource ? "乗っかる" : "投票する"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 予想シェアカードモーダル */}
      {showShareCard && raceInfo && (
        <VoteShareCard
          raceName={raceInfo.name}
          raceDate={raceInfo.date}
          courseName={raceInfo.courseName}
          grade={raceInfo.grade}
          picks={submittedPicks}
          userName={userName ?? "ゲスト"}
          userHandle={userHandle}
          onClose={() => { setShowShareCard(false); router.refresh(); }}
        />
      )}
    </div>
  );
}
