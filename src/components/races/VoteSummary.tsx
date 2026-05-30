"use client";

import { useEffect, useState } from "react";
import confetti from "canvas-confetti";
import dynamic from "next/dynamic";

const HitShareCard = dynamic(
  () => import("@/components/share/HitShareCard"),
  { ssr: false }
);

type Transaction = {
  reason: string;
  amount: number;
  description: string;
};

type Props = {
  raceInfo?: {
    name: string;
    date: string;
    courseName: string;
    grade?: string | null;
  };
  userName?: string;
  vote: {
    status: string;
    earned_points: number;
    is_perfect: boolean;
    vote_picks: {
      pick_type: string;
      is_hit: boolean | null;
      points_earned: number;
      race_entries: {
        post_number: number;
        horses: { name: string } | null;
      } | null;
    }[];
  };
  isFinished: boolean;
  transactions?: Transaction[] | null;
};

function fireConfetti(isPerfect: boolean) {
  const duration = isPerfect ? 4000 : 2500;
  const end = Date.now() + duration;
  const colors = isPerfect
    ? ["#FFD700", "#FFA500", "#FF6347", "#00FF00", "#00CED1", "#FF69B4"]
    : ["#22c55e", "#16a34a", "#15803d", "#fbbf24", "#f59e0b"];

  (function frame() {
    confetti({
      particleCount: isPerfect ? 7 : 4,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.7 },
      colors,
    });
    confetti({
      particleCount: isPerfect ? 7 : 4,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.7 },
      colors,
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();

  if (isPerfect) {
    setTimeout(() => {
      confetti({
        particleCount: 100,
        spread: 100,
        origin: { x: 0.5, y: 0.5 },
        colors,
      });
    }, 500);
  }
}

const PICK_LABELS: Record<string, { sym: string; label: string }> = {
  win: { sym: "◎", label: "本命" },
  place: { sym: "○", label: "対抗" },
  back: { sym: "△", label: "抑え" },
  danger: { sym: "⚠️", label: "危険" },
};

function pickColorClass(t: string): string {
  if (t === "win") return "text-brand-strong";
  if (t === "place") return "text-info";
  if (t === "danger") return "text-ink-3";
  return "text-osae";
}

export default function VoteSummary({
  vote,
  isFinished,
  transactions,
  raceInfo,
  userName,
}: Props) {
  const [hasAnimated, setHasAnimated] = useState(false);
  const [showBigPoints, setShowBigPoints] = useState(false);
  const [showShareCard, setShowShareCard] = useState(false);

  const isHit = vote.status === "settled_hit";
  const isPerfect = vote.is_perfect;
  const picks = vote.vote_picks ?? [];

  useEffect(() => {
    if (isFinished && isHit && !hasAnimated) {
      setHasAnimated(true);
      setTimeout(() => {
        fireConfetti(isPerfect);
        setShowBigPoints(true);
      }, 300);
      if (navigator.vibrate) {
        navigator.vibrate(isPerfect ? [100, 50, 100, 50, 200] : [100, 50, 100]);
      }
    }
  }, [isFinished, isHit, isPerfect, hasAnimated]);

  const winPick = picks.find((p) => p.pick_type === "win");
  const placePicks = picks.filter((p) => p.pick_type === "place");
  const backPicks = picks.filter((p) => p.pick_type === "back");
  const dangerPick = picks.find((p) => p.pick_type === "danger");

  // Transaction map
  const txMap = new Map<string, Transaction[]>();
  if (transactions) {
    for (const tx of transactions) {
      if (!txMap.has(tx.reason)) txMap.set(tx.reason, []);
      txMap.get(tx.reason)!.push(tx);
    }
  }
  const hasTx = !!transactions?.length;

  // ── 結果確定前: 予想表示 ──
  if (!isFinished) {
    return (
      <div className="rounded-2xl border bg-surface border-line p-5 font-display">
        <h3 className="font-bold mb-3 text-ink">📦 あなたの予想</h3>
        <div className="space-y-2">
          {picks.map((pick, i) => {
            const cfg = PICK_LABELS[pick.pick_type] ?? PICK_LABELS.back;
            return (
              <div key={i} className="flex items-center gap-2">
                <span className={`text-sm font-bold ${pickColorClass(pick.pick_type)}`}>
                  {cfg.sym} {cfg.label}
                </span>
                <span className="text-ink">
                  <span className="font-data">{pick.race_entries?.post_number}</span>{" "}
                  {pick.race_entries?.horses?.name ?? "不明"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── 結果確定後: レシート+ソーシャル型 ──

  // Build bet results
  const betResults: {
    icon: string;
    label: string;
    isHit: boolean;
    points: number;
    detail?: string;
  }[] = [];

  // 単勝
  if (winPick) {
    const tx = txMap.get("win_hit")?.[0];
    const hitByPick = winPick.is_hit === true;
    const isHitResult = hasTx ? !!tx : hitByPick;
    betResults.push({
      icon: "🎯",
      label: "単勝",
      isHit: isHitResult,
      points: tx?.amount ?? (isHitResult ? winPick.points_earned : 0),
      detail: `◎${winPick.race_entries?.post_number ?? "?"}番→1着`,
    });
  }

  // 複勝
  if (winPick) {
    const winTx = txMap.get("win_hit")?.[0];
    const placeTx = txMap.get("place_hit")?.[0];
    const winMiss = hasTx ? !winTx : !(winPick.is_hit === true);
    if (winMiss) {
      const isHitResult = hasTx ? !!placeTx : false;
      betResults.push({
        icon: "🎫",
        label: "複勝",
        isHit: isHitResult,
        points: placeTx?.amount ?? 0,
        detail: `◎→3着以内`,
      });
    }
  }

  // 馬連
  if (winPick && placePicks.length > 0) {
    const tx = txMap.get("exacta_hit")?.[0] ?? txMap.get("quinella_hit")?.[0];
    betResults.push({
      icon: "🎫",
      label: txMap.get("exacta_hit")?.[0] ? "馬連(馬単)" : "馬連",
      isHit: hasTx ? !!tx : false,
      points: tx?.amount ?? 0,
    });
  }

  // ワイド
  if (winPick && placePicks.length > 0) {
    const txs = txMap.get("wide_hit") ?? [];
    const totalPts = txs.reduce((s, t) => s + t.amount, 0);
    const wideHit = hasTx
      ? txs.length > 0
      : winPick.is_hit === true && placePicks.some((p) => p.is_hit === true);
    betResults.push({
      icon: "🎟️",
      label: "ワイド",
      isHit: wideHit,
      points: totalPts,
      detail: txs.length > 0 ? `${txs.length}的中` : wideHit ? "的中" : undefined,
    });
  }

  // 三連複
  if (winPick && (placePicks.length >= 2 || (placePicks.length >= 1 && backPicks.length >= 1))) {
    const tx = txMap.get("trifecta_hit")?.[0] ?? txMap.get("trio_hit")?.[0];
    const trioHit = hasTx
      ? !!tx
      : winPick.is_hit === true &&
        (placePicks.filter((p) => p.is_hit).length >= 2 ||
          (placePicks.some((p) => p.is_hit) && backPicks.some((p) => p.is_hit)));
    betResults.push({
      icon: "🎰",
      label: txMap.get("trifecta_hit")?.[0] ? "三連複(3連単)" : "三連複",
      isHit: trioHit,
      points: tx?.amount ?? 0,
      detail: tx?.description?.includes("×5")
        ? "順番通り×5"
        : tx?.description?.includes("×3")
        ? "順番通り×3"
        : undefined,
    });
  }

  // 危険馬
  if (dangerPick) {
    const tx = txMap.get("danger_hit")?.[0];
    const isHitResult = hasTx ? !!tx : dangerPick.is_hit === true;
    betResults.push({
      icon: "⚠️",
      label: "危険馬",
      isHit: isHitResult,
      points: tx?.amount ?? (isHitResult ? dangerPick.points_earned : 0),
    });
  }

  // ボーナス
  const perfectTx = txMap.get("perfect_bonus")?.[0];
  if (perfectTx || (!hasTx && isPerfect)) {
    betResults.push({
      icon: "💎",
      label: "完全的中",
      isHit: true,
      points: perfectTx?.amount ?? 200,
    });
  }
  const streakTx = txMap.get("streak_bonus")?.[0];
  if (streakTx) {
    betResults.push({
      icon: "🔥",
      label: "連続的中",
      isHit: true,
      points: streakTx.amount,
    });
  }

  return (
    <div className="space-y-4 font-display">
      {/* ── ポイントヘッダー ── */}
      <div
        className={`rounded-2xl p-5 text-center ${isHit ? "text-white" : "bg-surface-2 text-ink-2"} ${
          showBigPoints && isHit ? "animate-pulse" : ""
        }`}
        style={isHit ? { background: "linear-gradient(135deg, var(--brand), var(--brand-strong))" } : undefined}
      >
        {isHit ? (
          <>
            <div className="text-xs opacity-80 mb-1">
              {raceInfo?.name || ""}
            </div>
            <div className="text-4xl font-black mb-1 font-data">
              +{vote.earned_points} P
            </div>
            <div className="inline-block bg-white/20 px-4 py-1 rounded-full text-sm font-bold">
              {isPerfect ? "💎 完全的中！" : "🎉 的中！"}
            </div>
          </>
        ) : (
          <>
            <div className="text-3xl mb-2">😢</div>
            <div className="text-lg font-bold">ハズレ</div>
            <div className="text-xs mt-1 text-ink-3">
              次のレースでリベンジ！
            </div>
          </>
        )}
      </div>

      {/* ── 予想と着順 ── */}
      <div className="rounded-2xl border bg-surface border-line overflow-hidden">
        <div className="px-4 py-2.5 border-b border-line bg-surface-2">
          <div className="text-[10px] tracking-wider text-ink-3">
            YOUR PICKS
          </div>
        </div>
        <div className="px-4 py-2">
          {picks.map((pick, i) => {
            const cfg = PICK_LABELS[pick.pick_type] ?? PICK_LABELS.back;
            const hitResult = pick.is_hit;
            return (
              <div
                key={i}
                className={`flex items-center gap-2 py-2 ${
                  i < picks.length - 1 ? "border-b border-line" : ""
                }`}
              >
                <span className={`text-xs font-bold min-w-[16px] ${pickColorClass(pick.pick_type)}`}>
                  {cfg.sym}
                </span>
                <span className="text-sm font-bold flex-1 text-ink">
                  <span className="font-data">{pick.race_entries?.post_number}</span>{" "}
                  {pick.race_entries?.horses?.name ?? "不明"}
                </span>
                <span
                  className={`text-xs font-medium ${
                    hitResult === true
                      ? "text-brand-strong"
                      : hitResult === false
                      ? "text-danger"
                      : "text-ink-3"
                  }`}
                >
                  {hitResult === true
                    ? "✓ 的中"
                    : hitResult === false
                    ? "× ハズレ"
                    : "—"}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 馬券結果 ── */}
      <div className="rounded-2xl border bg-surface border-line overflow-hidden">
        <div className="px-4 py-2.5 border-b border-line bg-surface-2">
          <div className="text-[10px] tracking-wider text-ink-3">
            POINTS BREAKDOWN
          </div>
        </div>
        <div className="px-4 py-1">
          {betResults.map((bet, i) => (
            <div
              key={i}
              className={`flex items-center justify-between py-2 ${
                i < betResults.length - 1 ? "border-b border-line" : ""
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-base">{bet.icon}</span>
                <span className="text-sm font-medium text-ink">
                  {bet.label}
                </span>
                {bet.detail && (
                  <span className="text-[10px] text-ink-3">
                    {bet.detail}
                  </span>
                )}
              </div>
              <span
                className={`text-sm font-bold font-data ${
                  bet.isHit
                    ? bet.icon === "💎" || bet.icon === "🔥"
                      ? "text-gate-gold-strong"
                      : "text-brand-strong"
                    : "text-danger"
                }`}
              >
                {bet.isHit
                  ? bet.points > 0
                    ? `+${bet.points}P`
                    : "✓"
                  : "×"}
              </span>
            </div>
          ))}
        </div>

        {/* 合計 */}
        <div className="px-4 py-3 border-t border-line bg-surface-2 flex items-center justify-between">
          <span className="text-sm font-bold text-ink">
            合計
          </span>
          <span className={`text-xl font-black font-data ${isHit ? "text-brand-strong" : "text-ink-3"}`}>
            {isHit ? `+${vote.earned_points} P` : "0 P"}
          </span>
        </div>
      </div>

      {/* ── シェアボタン（的中時のみ） ── */}
      {isHit && raceInfo && (
        <div className="flex gap-3">
          <button
            onClick={() => setShowShareCard(true)}
            className="flex-1 py-3 rounded-xl font-bold text-sm transition-colors bg-brand hover:bg-brand-strong text-white"
          >
            📸 的中報告をシェア
          </button>
          <button
            onClick={() => {
              const url = `${window.location.origin}${window.location.pathname}`;
              navigator.clipboard?.writeText(url);
            }}
            className="w-12 py-3 rounded-xl text-lg bg-surface-2 hover:opacity-80"
          >
            🔗
          </button>
        </div>
      )}

      {/* シェアカードモーダル */}
      {showShareCard && raceInfo && (
        <HitShareCard
          raceName={raceInfo.name}
          raceDate={raceInfo.date}
          courseName={raceInfo.courseName}
          grade={raceInfo.grade}
          earnedPoints={vote.earned_points}
          isPerfect={isPerfect}
          winPick={
            winPick
              ? {
                  postNumber: winPick.race_entries?.post_number ?? 0,
                  horseName: winPick.race_entries?.horses?.name ?? "不明",
                }
              : undefined
          }
          placePicks={placePicks
            .filter((p) => p.is_hit)
            .map((p) => ({
              postNumber: p.race_entries?.post_number ?? 0,
              horseName: p.race_entries?.horses?.name ?? "不明",
            }))}
          userName={userName ?? "ゲスト"}
          onClose={() => setShowShareCard(false)}
        />
      )}
    </div>
  );
}
