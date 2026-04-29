"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { useTheme } from "@/contexts/ThemeContext";
import Link from "next/link";
import dynamic from "next/dynamic";

const VoteShareCard = dynamic(
  () => import("@/components/share/VoteShareCard"),
  { ssr: false }
);

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

type PickType = "win" | "place" | "back" | "danger";

const MARK_CONFIG: Record<
  PickType,
  {
    sym: string;
    label: string;
    bgLight: string;
    bgDark: string;
    borderLight: string;
    borderDark: string;
    colorLight: string;
    colorDark: string;
    btnBg: string;
  }
> = {
  win: {
    sym: "◎",
    label: "本命",
    bgLight: "bg-red-50",
    bgDark: "bg-red-500/10",
    borderLight: "border-red-400",
    borderDark: "border-red-500/50",
    colorLight: "text-red-600",
    colorDark: "text-red-400",
    btnBg: "bg-red-500",
  },
  place: {
    sym: "○",
    label: "対抗",
    bgLight: "bg-blue-50",
    bgDark: "bg-blue-500/10",
    borderLight: "border-blue-400",
    borderDark: "border-blue-500/50",
    colorLight: "text-blue-600",
    colorDark: "text-blue-400",
    btnBg: "bg-blue-500",
  },
  back: {
    sym: "△",
    label: "抑え",
    bgLight: "bg-yellow-50",
    bgDark: "bg-yellow-500/10",
    borderLight: "border-yellow-400",
    borderDark: "border-yellow-500/50",
    colorLight: "text-yellow-600",
    colorDark: "text-yellow-400",
    btnBg: "bg-yellow-600",
  },
  danger: {
    sym: "⚠️",
    label: "危険",
    bgLight: "bg-gray-100",
    bgDark: "bg-slate-700/50",
    borderLight: "border-gray-400",
    borderDark: "border-slate-500",
    colorLight: "text-gray-600",
    colorDark: "text-slate-400",
    btnBg: "bg-gray-500",
  },
};

const LIMITS: Record<PickType, number> = {
  win: 1,
  place: 2,
  back: 5,
  danger: 1,
};

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

type AiPick = {
  predictor_id: string;
  pick_type: string;
  umaban: number;
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
  aiPicks?: AiPick[];
};

const AI_COLORS: Record<string, string> = {
  hayate: "#1E40AF",
  kazan: "#DC2626",
  hakusen: "#059669",
  hibari: "#D97706",
  gantetsu: "#475569",
};

export default function VoteForm({
  raceId,
  entries,
  raceInfo,
  userName,
  userHandle,
  aiPicks = [],
}: Props) {
  const { isDark } = useTheme();
  const [picks, setPicks] = useState<{ entryId: string; type: PickType }[]>([]);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [showShareCard, setShowShareCard] = useState(false);
  const [submittedPicks, setSubmittedPicks] = useState<
    { pick_type: string; post_number: number; horse_name: string }[]
  >([]);
  const [copySource, setCopySource] = useState<CopySource | null>(null);
  const [loadingCopy, setLoadingCopy] = useState(false);
  const [showDangerHint, setShowDangerHint] = useState(true);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const longPressTriggered = useRef(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const supabase = createClient();

  // Styles
  const cardBg = isDark
    ? "bg-slate-900 border-slate-700"
    : "bg-white border-gray-100";
  const textPrimary = isDark ? "text-slate-100" : "text-gray-800";
  const textSecondary = isDark ? "text-slate-400" : "text-gray-500";
  const textMuted = isDark ? "text-slate-500" : "text-gray-400";
  const borderColor = isDark ? "border-slate-700" : "border-gray-100";
  const btnPrimary = isDark
    ? "bg-amber-500 hover:bg-amber-600 text-slate-900"
    : "bg-green-600 hover:bg-green-700 text-white";

  // Copy source loading
  useEffect(() => {
    const copyFromVoteId = searchParams.get("copy_from");
    if (copyFromVoteId) loadCopySource(copyFromVoteId);
  }, [searchParams]);

  const loadCopySource = async (voteId: string) => {
    setLoadingCopy(true);
    try {
      const res = await fetch(`/api/votes/${voteId}/copy`);
      if (res.ok) {
        const data = await res.json();
        setCopySource(data);
        const newPicks: { entryId: string; type: PickType }[] = [];
        const winEntry = data.picks.find(
          (p: any) => p.pick_type === "win"
        );
        const placeEntries = data.picks.filter(
          (p: any) => p.pick_type === "place"
        );
        const backEntries = data.picks.filter(
          (p: any) => p.pick_type === "back"
        );
        const dangerEntry = data.picks.find(
          (p: any) => p.pick_type === "danger"
        );
        if (winEntry)
          newPicks.push({ entryId: winEntry.race_entry_id, type: "win" });
        placeEntries.forEach((p: any) =>
          newPicks.push({ entryId: p.race_entry_id, type: "place" })
        );
        backEntries.forEach((p: any) =>
          newPicks.push({ entryId: p.race_entry_id, type: "back" })
        );
        if (dangerEntry)
          newPicks.push({
            entryId: dangerEntry.race_entry_id,
            type: "danger",
          });
        setPicks(newPicks);
      }
    } catch {}
    setLoadingCopy(false);
  };

  // Sequential tap logic
  const getNextType = useCallback((): PickType | null => {
    const counts = { win: 0, place: 0, back: 0, danger: 0 };
    picks
      .filter((p) => p.type !== "danger")
      .forEach((p) => counts[p.type]++);
    if (counts.win < 1) return "win";
    if (counts.place < 2) return "place";
    if (counts.back < 5) return "back";
    return null;
  }, [picks]);

  const reorderPicks = (
    currentPicks: { entryId: string; type: PickType }[]
  ) => {
    const nonDanger = currentPicks.filter((p) => p.type !== "danger");
    const danger = currentPicks.filter((p) => p.type === "danger");
    const reordered = nonDanger.map((p, i) => {
      if (i === 0) return { ...p, type: "win" as PickType };
      if (i <= 2) return { ...p, type: "place" as PickType };
      return { ...p, type: "back" as PickType };
    });
    return [...reordered, ...danger];
  };

  const togglePick = (entryId: string) => {
    setPicks((prev) => {
      const idx = prev.findIndex((p) => p.entryId === entryId);
      if (idx >= 0) {
        const removed = [...prev];
        removed.splice(idx, 1);
        return reorderPicks(removed);
      }
      const nextType = getNextType();
      if (!nextType) return prev;
      return [...prev, { entryId, type: nextType }];
    });
  };

  const setDanger = (entryId: string) => {
    setPicks((prev) => {
      // If already danger, remove
      const existing = prev.find((p) => p.entryId === entryId);
      if (existing?.type === "danger") {
        return prev.filter((p) => p.entryId !== entryId);
      }
      // Remove from current position if exists
      let updated = prev.filter((p) => p.entryId !== entryId);
      // Remove existing danger
      updated = updated.filter((p) => p.type !== "danger");
      // Add as danger
      updated.push({ entryId, type: "danger" });
      return reorderPicks(updated);
    });
    setShowDangerHint(false);
  };

  // Long press handlers
  const handleTouchStart = (entryId: string) => {
    longPressTriggered.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      setDanger(entryId);
    }, 500);
  };

  const handleTouchEnd = (entryId: string) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (!longPressTriggered.current) {
      togglePick(entryId);
    }
  };

  const handleTouchMove = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const getPickForEntry = (entryId: string) => {
    return picks.find((p) => p.entryId === entryId);
  };

  const getAiPicksForEntry = (postNumber: number) => {
    return aiPicks.filter((ap) => ap.umaban === postNumber);
  };

  const guideText = () => {
    const counts = { win: 0, place: 0, back: 0 };
    picks
      .filter((p) => p.type !== "danger")
      .forEach((p) => counts[p.type]++);
    if (counts.win === 0) return "◎本命を1頭タップ";
    if (counts.place < 2) return `○対抗をタップ（${counts.place}/2頭）`;
    if (counts.back < 5) return `△抑えをタップ（${counts.back}/5頭・任意）`;
    return "選択完了！";
  };

  const countLabel = () => {
    const c = { win: 0, place: 0, back: 0, danger: 0 };
    picks.forEach((p) => c[p.type]++);
    const parts: string[] = [];
    if (c.win) parts.push(`◎${c.win}/1`);
    if (c.place || c.win) parts.push(`○${c.place}/2`);
    if (c.back || c.place >= 2) parts.push(`△${c.back}/5`);
    if (c.danger) parts.push(`⚠️${c.danger}/1`);
    return parts.join("　");
  };

  const skipOptional = () => {
    setPicks((prev) => prev.filter((p) => p.type === "win" || p.type === "danger"));
  };

  const resetAll = () => {
    setPicks([]);
  };

  const canSubmit = picks.some((p) => p.type === "win");

  // Submit
  const handleConfirmOpen = () => {
    if (!canSubmit) {
      setError("1着予想を選択してください");
      return;
    }
    setShowConfirm(true);
  };

  const handleSubmit = async () => {
    setShowConfirm(false);
    setLoading(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("ログインが必要です");
      setLoading(false);
      return;
    }

    const voteData: any = { user_id: user.id, race_id: raceId };
    if (copySource) voteData.copied_from_vote_id = copySource.vote_id;
    if (comment.trim()) voteData.comment = comment.trim();

    const { data: vote, error: voteErr } = await supabase
      .from("votes")
      .insert(voteData)
      .select()
      .single();
    if (voteErr || !vote) {
      setError("投票に失敗しました: " + (voteErr?.message ?? ""));
      setLoading(false);
      return;
    }

    const pickTypeMap: Record<PickType, string> = {
      win: "win",
      place: "place",
      back: "back",
      danger: "danger",
    };

    const votePicks = picks.map((p) => ({
      vote_id: vote.id,
      pick_type: pickTypeMap[p.type],
      race_entry_id: p.entryId,
    }));

    const { error: pickErr } = await supabase
      .from("vote_picks")
      .insert(votePicks);
    if (pickErr) {
      setError("投票詳細の保存に失敗しました: " + pickErr.message);
      setLoading(false);
      return;
    }

    if (copySource) {
      fetch("/api/votes/copy-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          original_vote_id: copySource.vote_id,
          original_user_id: copySource.user_id,
        }),
      }).catch(() => {});
    }

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

    showToast(
      copySource
        ? "乗っかり投票が完了しました！🚀"
        : "投票が完了しました！🎉"
    );

    if (raceInfo) {
      const picksForShare = picks
        .map((p) => {
          const entry = entries.find((e) => e.id === p.entryId);
          if (!entry) return null;
          return {
            pick_type: p.type,
            post_number: entry.post_number,
            horse_name: entry.horses?.name ?? "",
          };
        })
        .filter(Boolean) as {
        pick_type: string;
        post_number: number;
        horse_name: string;
      }[];
      setSubmittedPicks(picksForShare);
      setShowShareCard(true);
    }
  };

  const clearCopySource = () => {
    setCopySource(null);
    setPicks([]);
    router.replace(`/races/${raceId}`);
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
      {/* Header: Summary chips */}
      <div
        className={`p-3 border-b ${borderColor} ${
          isDark ? "bg-slate-800/50" : "bg-gray-50"
        } flex gap-1.5 flex-wrap min-h-[40px] items-center`}
      >
        {picks.length === 0 && (
          <span className={`text-xs ${textMuted}`}>
            馬をタップして予想を入力
          </span>
        )}
        {picks.map((p) => {
          const entry = entries.find((e) => e.id === p.entryId);
          const cfg = MARK_CONFIG[p.type];
          return (
            <span
              key={p.entryId}
              className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                isDark ? cfg.bgDark : cfg.bgLight
              } ${isDark ? cfg.colorDark : cfg.colorLight}`}
            >
              {cfg.sym} {entry?.post_number} {entry?.horses?.name}
            </span>
          );
        })}
      </div>

      {/* AI reference bar */}
      {aiPicks.length > 0 && (
        <div
          className={`px-4 py-1.5 border-b ${borderColor} flex items-center gap-1.5`}
        >
          <span className={`text-[9px] ${textMuted}`}>AI:</span>
          {Object.entries(AI_COLORS).map(([id, color]) => (
            <div
              key={id}
              className="w-3 h-3 rounded-full border-[1.5px]"
              style={{
                borderColor: color,
                backgroundColor: `${color}22`,
              }}
            />
          ))}
          <span className={`text-[9px] ml-auto font-medium ${
            isDark ? "text-green-400" : "text-green-600"
          }`}>
            {guideText()}
          </span>
        </div>
      )}

      {/* Guide bar (when no AI picks) */}
      {aiPicks.length === 0 && (
        <div
          className={`px-4 py-2 border-b ${borderColor} flex items-center justify-between`}
        >
          <span className={`text-xs ${textMuted}`}>馬をタップで自動割当</span>
          <span className={`text-xs font-medium ${
            isDark ? "text-green-400" : "text-green-600"
          }`}>
            {guideText()}
          </span>
        </div>
      )}

      {/* Copy source banner */}
      {copySource && (
        <div
          className={`px-4 py-3 border-b ${
            isDark
              ? "bg-blue-500/10 border-blue-500/30"
              : "bg-blue-50 border-blue-100"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🚀</span>
              <span
                className={`text-sm font-medium ${
                  isDark ? "text-blue-400" : "text-blue-700"
                }`}
              >
                {copySource.user_name}さんの予想ベース
              </span>
            </div>
            <button
              onClick={clearCopySource}
              className={`text-xs ${
                isDark
                  ? "text-blue-400 hover:text-blue-300"
                  : "text-blue-500 hover:text-blue-700"
              }`}
            >
              クリア
            </button>
          </div>
        </div>
      )}

      {/* Horse list */}
      <div className="px-4 max-h-96 overflow-y-auto">
        {entries.map((entry) => {
          const pick = getPickForEntry(entry.id);
          const aiEntryPicks = getAiPicksForEntry(entry.post_number);
          const cfg = pick ? MARK_CONFIG[pick.type] : null;
          const isLowOdds = entry.odds !== null && entry.odds < 10;

          return (
            <div
              key={entry.id}
              onTouchStart={() => handleTouchStart(entry.id)}
              onTouchEnd={() => handleTouchEnd(entry.id)}
              onTouchMove={handleTouchMove}
              onMouseDown={() => handleTouchStart(entry.id)}
              onMouseUp={() => handleTouchEnd(entry.id)}
              onContextMenu={(e) => {
                e.preventDefault();
                setDanger(entry.id);
              }}
              className={`flex items-center gap-2 py-2.5 border-b cursor-pointer select-none transition-colors ${
                pick
                  ? `${isDark ? cfg!.bgDark : cfg!.bgLight} border-l-[3px] ${
                      isDark ? cfg!.borderDark : cfg!.borderLight
                    } -mx-4 px-4`
                  : `border-transparent ${
                      isDark
                        ? "border-b-slate-800 hover:bg-slate-800/50"
                        : "border-b-gray-50 hover:bg-gray-50"
                    }`
              }`}
            >
              {/* Gate number */}
              <span
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${getGateColor(
                  entry.gate_number
                )}`}
              >
                {entry.post_number}
              </span>

              {/* Horse info */}
              <div className="flex-1 min-w-0">
                <div
                  className={`font-bold text-sm truncate ${textPrimary}`}
                >
                  {entry.horses?.name}
                </div>
                <div className={`text-[10px] ${textMuted}`}>
                  {entry.jockey}
                </div>
              </div>

              {/* Odds */}
              <div className="text-right min-w-[40px] shrink-0">
                {entry.odds && (
                  <span
                    className={`font-bold text-xs ${
                      isLowOdds
                        ? isDark
                          ? "text-red-400"
                          : "text-red-600"
                        : isDark
                        ? "text-slate-200"
                        : "text-gray-700"
                    }`}
                  >
                    {entry.odds}
                  </span>
                )}
                {entry.popularity && (
                  <div
                    className={`text-[10px] ${
                      entry.popularity <= 3
                        ? isDark
                          ? "text-amber-400 font-bold"
                          : "text-amber-600 font-bold"
                        : textMuted
                    }`}
                  >
                    {entry.popularity}人気
                  </div>
                )}
              </div>

              {/* AI dots */}
              <div className="flex gap-0.5 min-w-[24px] justify-end shrink-0">
                {aiEntryPicks.map((ap) => (
                  <div
                    key={ap.predictor_id}
                    className="w-2.5 h-2.5 rounded-full"
                    style={{
                      backgroundColor:
                        AI_COLORS[ap.predictor_id] || "#999",
                    }}
                    title={`${ap.predictor_id} ${ap.pick_type === "win" ? "◎" : "○"}`}
                  />
                ))}
              </div>

              {/* Mark button */}
              <div className="w-8 shrink-0">
                {pick ? (
                  <div
                    className={`w-8 h-8 rounded-lg ${cfg!.btnBg} flex items-center justify-center text-sm text-white font-bold`}
                  >
                    {cfg!.sym}
                  </div>
                ) : (
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center border border-dashed ${
                      isDark
                        ? "border-slate-600 bg-slate-800"
                        : "border-gray-300 bg-gray-50"
                    }`}
                  >
                    <span className={`text-base ${textMuted}`}>+</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div
        className={`border-t p-4 ${
          isDark ? "bg-slate-800 border-slate-700" : "bg-gray-50 border-gray-100"
        }`}
      >
        {/* Count + actions */}
        <div className="flex items-center justify-between mb-2">
          <span className={`text-[10px] ${textMuted}`}>{countLabel()}</span>
          <div className="flex gap-2">
            <button
              onClick={skipOptional}
              className={`px-2.5 py-1 rounded-md border text-[10px] ${
                isDark
                  ? "border-slate-600 text-slate-400 hover:bg-slate-700"
                  : "border-gray-200 text-gray-500 hover:bg-gray-100"
              }`}
            >
              ○△スキップ
            </button>
            <button
              onClick={resetAll}
              className={`px-2.5 py-1 rounded-md border text-[10px] ${
                isDark
                  ? "border-red-800 text-red-400 hover:bg-red-900/30"
                  : "border-red-200 text-red-500 hover:bg-red-50"
              }`}
            >
              リセット
            </button>
          </div>
        </div>

        {/* Danger hint */}
        {showDangerHint && !picks.some((p) => p.type === "danger") && (
          <div
            className={`flex items-center gap-2 rounded-lg px-3 py-2 mb-2 ${
              isDark
                ? "bg-amber-500/10 border border-amber-500/30"
                : "bg-orange-50 border border-orange-200"
            }`}
          >
            <span className="text-sm">💡</span>
            <span
              className={`text-[10px] ${
                isDark ? "text-amber-300" : "text-orange-800"
              }`}
            >
              馬を<strong>長押し</strong>すると⚠️危険馬に設定できます
            </span>
            <button
              onClick={() => setShowDangerHint(false)}
              className={`text-xs ml-auto ${textMuted}`}
            >
              ✕
            </button>
          </div>
        )}

        {/* Comment */}
        <div className="mb-3">
          <label
            className={`block text-xs font-medium mb-1 ${textSecondary}`}
          >
            💬 予想理由（任意）
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="例: 前走の末脚が良かった。内枠有利のコースなので..."
            maxLength={200}
            rows={2}
            className={`w-full px-3 py-2 rounded-lg text-sm resize-none border focus:outline-none focus:ring-2 ${
              isDark
                ? "bg-slate-800 border-slate-600 text-slate-100 placeholder-slate-500 focus:ring-amber-500"
                : "bg-white border-gray-200 text-gray-800 placeholder-gray-400 focus:ring-green-500"
            }`}
          />
          <div className={`text-right text-[10px] mt-0.5 ${textMuted}`}>
            {comment.length}/200
          </div>
        </div>

        {/* Error */}
        {error && (
          <div
            className={`text-sm p-2 rounded-lg mb-2 ${
              isDark
                ? "text-red-400 bg-red-500/10"
                : "text-red-600 bg-red-50"
            }`}
          >
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleConfirmOpen}
          disabled={!canSubmit || loading}
          className={`w-full py-3 font-bold rounded-xl transition-colors disabled:opacity-40 ${btnPrimary}`}
        >
          {loading
            ? "投票中..."
            : copySource
            ? "🚀 この予想で乗っかる"
            : "🗳 この予想で投票する"}
        </button>
      </div>

      {/* Confirm modal */}
      {showConfirm && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowConfirm(false)}
        >
          <div
            className={`rounded-2xl p-6 max-w-sm w-full shadow-xl ${
              isDark ? "bg-slate-900" : "bg-white"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              className={`text-lg font-bold mb-4 text-center ${textPrimary}`}
            >
              {copySource ? "🚀 乗っかり確認" : "📋 投票内容の確認"}
            </h3>
            <div className="space-y-2 mb-6 max-h-80 overflow-y-auto">
              {picks.map((p) => {
                const entry = entries.find((e) => e.id === p.entryId);
                if (!entry) return null;
                const cfg = MARK_CONFIG[p.type];
                return (
                  <div
                    key={p.entryId}
                    className={`flex items-center gap-2 rounded-lg p-3 ${
                      isDark ? cfg.bgDark : cfg.bgLight
                    }`}
                  >
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded ${
                        isDark ? cfg.colorDark : cfg.colorLight
                      }`}
                    >
                      {cfg.sym} {cfg.label}
                    </span>
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        isDark
                          ? "bg-slate-600 text-slate-100"
                          : "bg-gray-800 text-white"
                      }`}
                    >
                      {entry.post_number}
                    </span>
                    <span className={`font-bold ${textPrimary}`}>
                      {entry.horses?.name}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowConfirm(false)}
                className={`flex-1 py-3 border rounded-xl text-sm font-bold transition-colors ${
                  isDark
                    ? "border-slate-600 text-slate-300 hover:bg-slate-800"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                戻る
              </button>
              <button
                onClick={handleSubmit}
                className={`flex-1 py-3 rounded-xl text-sm font-bold transition-colors ${btnPrimary}`}
              >
                {copySource ? "乗っかる" : "投票する"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share card modal */}
      {showShareCard && raceInfo && (
        <VoteShareCard
          raceName={raceInfo.name}
          raceDate={raceInfo.date}
          courseName={raceInfo.courseName}
          grade={raceInfo.grade}
          picks={submittedPicks}
          userName={userName ?? "ゲスト"}
          userHandle={userHandle}
          onClose={() => {
            setShowShareCard(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
