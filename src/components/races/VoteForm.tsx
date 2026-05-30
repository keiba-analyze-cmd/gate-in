"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
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
  { sym: string; label: string; soft: string; line: string; ink: string; solid: string }
> = {
  win: { sym: "◎", label: "本命", soft: "var(--brand-soft)", line: "var(--brand)", ink: "var(--brand-strong)", solid: "var(--brand)" },
  place: { sym: "○", label: "対抗", soft: "var(--info-soft)", line: "var(--info)", ink: "var(--info)", solid: "var(--info)" },
  back: { sym: "△", label: "抑え", soft: "var(--osae-soft)", line: "var(--osae)", ink: "var(--osae)", solid: "var(--osae)" },
  danger: { sym: "⚠️", label: "危険", soft: "var(--danger-soft)", line: "var(--danger)", ink: "var(--danger)", solid: "var(--danger)" },
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
  const touchMoved = useRef(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const supabase = createClient();

  // Copy source loading
  useEffect(() => {
    const copyFromVoteId = searchParams.get("copy_from");
    if (copyFromVoteId) loadCopySource(copyFromVoteId);

  }, [searchParams]);

  // AI予想乗っかり: honmeiパラメータで◎自動選択
  useEffect(() => {
    const honmeiUmaban = searchParams.get("honmei");
    if (honmeiUmaban && entries.length > 0 && picks.length === 0) {
      const targetEntry = entries.find(e => e.post_number === parseInt(honmeiUmaban));
      if (targetEntry) {
        setPicks([{ entryId: targetEntry.id, type: "win" as PickType }]);
      }
    }
  }, [entries.length]);
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
    touchMoved.current = false;
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
    if (!longPressTriggered.current && !touchMoved.current) {
      togglePick(entryId);
    }
  };

  const handleTouchMove = () => {
    touchMoved.current = true;
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
    const counts = { win: 0, place: 0, back: 0, danger: 0 };
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
      <div className="rounded-2xl border bg-surface border-line p-8 text-center font-display">
        <div className="text-sm text-ink-3">予想を読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-surface border-line overflow-hidden font-display">
      {/* Header: Summary chips */}
      <div className="p-3 border-b border-line bg-surface-2 flex gap-1.5 flex-wrap min-h-[40px] items-center">
        {picks.length === 0 && (
          <span className="text-xs text-ink-3">馬をタップして予想を入力</span>
        )}
        {picks.map((p) => {
          const entry = entries.find((e) => e.id === p.entryId);
          const cfg = MARK_CONFIG[p.type];
          return (
            <span
              key={p.entryId}
              className="text-xs px-2.5 py-1 rounded-full font-medium"
              style={{ background: cfg.soft, color: cfg.ink }}
            >
              {cfg.sym} {entry?.post_number} {entry?.horses?.name}
            </span>
          );
        })}
      </div>

      {/* AI reference bar */}
      {aiPicks.length > 0 && (
        <div className="px-4 py-1.5 border-b border-line flex items-center gap-1.5">
          <span className="text-[9px] text-ink-3">AI:</span>
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
          <span className="text-[9px] ml-auto font-medium text-brand-strong">
            {guideText()}
          </span>
        </div>
      )}

      {/* Guide bar (when no AI picks) */}
      {aiPicks.length === 0 && (
        <div className="px-4 py-2 border-b border-line flex items-center justify-between">
          <span className="text-xs text-ink-3">馬をタップで自動割当</span>
          <span className="text-xs font-medium text-brand-strong">
            {guideText()}
          </span>
        </div>
      )}

      {/* Copy source banner */}
      {copySource && (
        <div
          className="px-4 py-3 border-b"
          style={{ background: "var(--info-soft)", borderColor: "var(--info)" }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🚀</span>
              <span className="text-sm font-medium" style={{ color: "var(--info)" }}>
                {copySource.user_name}さんの予想ベース
              </span>
            </div>
            <button
              onClick={clearCopySource}
              className="text-xs hover:opacity-70"
              style={{ color: "var(--info)" }}
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
              onTouchMove={handleTouchMove}
              onMouseDown={(e) => { if (e.button === 0) handleTouchStart(entry.id); }}
              onMouseUp={() => handleTouchEnd(entry.id)} onTouchEnd={(e) => { e.preventDefault(); handleTouchEnd(entry.id); }}
              onContextMenu={(e) => {
                e.preventDefault();
                setDanger(entry.id);
              }}
              className={`flex items-center gap-2 py-2.5 border-b border-line cursor-pointer select-none transition-colors ${
                pick ? "border-l-[3px] -mx-4 px-4" : "hover:bg-surface-2"
              }`}
              style={pick ? { background: cfg!.soft, borderLeftColor: cfg!.line } : undefined}
            >
              {/* Gate number */}
              <span
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 font-data ${getGateColor(
                  entry.gate_number
                )}`}
              >
                {entry.post_number}
              </span>

              {/* Horse info */}
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm truncate text-ink">
                  {entry.horses?.name}
                </div>
                <div className="text-[10px] text-ink-3">
                  {entry.jockey}
                </div>
              </div>

              {/* Odds */}
              <div className="text-right min-w-[40px] shrink-0">
                {entry.odds && (
                  <span
                    className="font-bold text-xs font-data"
                    style={{ color: isLowOdds ? "var(--danger)" : "var(--ink-2)" }}
                  >
                    {entry.odds}
                  </span>
                )}
                {entry.popularity && (
                  <div
                    className="text-[10px] font-data"
                    style={
                      entry.popularity <= 3
                        ? { color: "var(--gate-gold-strong)", fontWeight: 700 }
                        : { color: "var(--ink-3)" }
                    }
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
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-sm text-white font-bold"
                    style={{ background: cfg!.solid }}
                  >
                    {cfg!.sym}
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center border border-dashed border-line bg-surface-2">
                    <span className="text-base text-ink-3">+</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="border-t border-line p-4 bg-surface-2">
        {/* Count + actions */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-ink-3 font-data">{countLabel()}</span>
          <div className="flex gap-2">
            <button
              onClick={skipOptional}
              className="px-2.5 py-1 rounded-md border border-line text-ink-3 hover:bg-surface text-[10px]"
            >
              ○△スキップ
            </button>
            <button
              onClick={resetAll}
              className="px-2.5 py-1 rounded-md border text-[10px] hover:opacity-70"
              style={{ borderColor: "var(--danger)", color: "var(--danger)" }}
            >
              リセット
            </button>
          </div>
        </div>

        {/* Danger hint */}
        {showDangerHint && !picks.some((p) => p.type === "danger") && (
          <div
            className="flex items-center gap-2 rounded-lg px-3 py-2 mb-2 border"
            style={{ background: "var(--gate-gold-soft)", borderColor: "var(--gate-gold-strong)" }}
          >
            <span className="text-sm">💡</span>
            <span className="text-[10px]" style={{ color: "var(--gate-gold-strong)" }}>
              馬を<strong>長押し</strong>すると⚠️危険馬に設定できます
            </span>
            <button
              onClick={() => setShowDangerHint(false)}
              className="text-xs ml-auto text-ink-3"
            >
              ✕
            </button>
          </div>
        )}

        {/* Comment */}
        <div className="mb-3">
          <label className="block text-xs font-medium mb-1 text-ink-2">
            💬 予想理由（任意）
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="例: 前走の末脚が良かった。内枠有利のコースなので..."
            maxLength={200}
            rows={2}
            className="w-full px-3 py-2 rounded-lg text-sm resize-none border bg-surface border-line text-ink placeholder:text-ink-3 focus:outline-none focus:ring-2 focus:ring-brand"
          />
          <div className="text-right text-[10px] mt-0.5 text-ink-3 font-data">
            {comment.length}/200
          </div>
        </div>

        {/* Error */}
        {error && (
          <div
            className="text-sm p-2 rounded-lg mb-2"
            style={{ background: "var(--danger-soft)", color: "var(--danger)" }}
          >
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleConfirmOpen}
          disabled={!canSubmit || loading}
          className="w-full py-3 font-bold rounded-xl transition-colors disabled:opacity-40 bg-brand hover:bg-brand-strong text-white"
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
            className="rounded-2xl p-6 max-w-sm w-full shadow-xl bg-surface font-display"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-4 text-center text-ink">
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
                    className="flex items-center gap-2 rounded-lg p-3"
                    style={{ background: cfg.soft }}
                  >
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded"
                      style={{ color: cfg.ink }}
                    >
                      {cfg.sym} {cfg.label}
                    </span>
                    <span
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-data"
                      style={{ background: "var(--ink)", color: "var(--bg)" }}
                    >
                      {entry.post_number}
                    </span>
                    <span className="font-bold text-ink">
                      {entry.horses?.name}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-3 border border-line rounded-xl text-sm font-bold transition-colors text-ink-2 hover:bg-surface-2"
              >
                戻る
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 py-3 rounded-xl text-sm font-bold transition-colors bg-brand hover:bg-brand-strong text-white"
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
