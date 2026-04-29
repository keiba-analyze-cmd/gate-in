"use client";

import { useEffect, useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
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

export default function VoteSummary({
  vote,
  isFinished,
  transactions,
  raceInfo,
  userName,
}: Props) {
  const { isDark } = useTheme();
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

  // Styles
  const textPrimary = isDark ? "text-slate-100" : "text-gray-900";
  const textSecondary = isDark ? "text-slate-400" : "text-gray-600";
  const textMuted = isDark ? "text-slate-500" : "text-gray-400";
  const borderColor = isDark ? "border-slate-700" : "border-gray-200";
  const cardBg = isDark ? "bg-slate-900" : "bg-white";

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
      <div className={`rounded-2xl border p-5 ${cardBg} ${borderColor}`}>
        <h3 className={`font-bold mb-3 ${textPrimary}`}>📦 あなたの予想</h3>
        <div className="space-y-2">
          {picks.map((pick, i) => {
            const cfg = PICK_LABELS[pick.pick_type] ?? PICK_LABELS.back;
            return (
              <div key={i} className="flex items-center gap-2">
                <span className={`text-sm font-bold ${
                  pick.pick_type === "win" ? "text-red-500"
                  : pick.pick_type === "place" ? "text-blue-500"
                  : pick.pick_type === "danger" ? (isDark ? "text-slate-400" : "text-gray-500")
                  : isDark ? "text-yellow-400" : "text-yellow-600"
                }`}>
                  {cfg.sym} {cfg.label}
                </span>
                <span className={textPrimary}>
                  {pick.race_entries?.post_number}{" "}
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
    <div className="space-y-4">
      {/* ── ポイントヘッダー ── */}
      <div
        className={`rounded-2xl p-5 text-center ${
          isHit
            ? "bg-gradient-to-br from-green-600 to-emerald-600 text-white"
            : isDark
            ? "bg-slate-800 text-slate-300"
            : "bg-gray-100 text-gray-600"
        } ${showBigPoints && isHit ? "animate-pulse" : ""}`}
      >
        {isHit ? (
          <>
            <div className="text-xs opacity-80 mb-1">
              {raceInfo?.name || ""}
            </div>
            <div className="text-4xl font-black mb-1">
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
            <div className={`text-xs mt-1 ${textMuted}`}>
              次のレースでリベンジ！
            </div>
          </>
        )}
      </div>

      {/* ── 予想と着順 ── */}
      <div
        className={`rounded-2xl border overflow-hidden ${cardBg} ${borderColor}`}
      >
        <div
          className={`px-4 py-2.5 border-b ${borderColor} ${
            isDark ? "bg-slate-800/50" : "bg-gray-50"
          }`}
        >
          <div className={`text-[10px] tracking-wider ${textMuted}`}>
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
                  i < picks.length - 1
                    ? `border-b ${isDark ? "border-slate-800" : "border-gray-50"}`
                    : ""
                }`}
              >
                <span
                  className={`text-xs font-bold min-w-[16px] ${
                    pick.pick_type === "win"
                      ? "text-red-500"
                      : pick.pick_type === "place"
                      ? "text-blue-500"
                      : pick.pick_type === "danger"
                      ? textMuted
                      : isDark
                      ? "text-yellow-400"
                      : "text-yellow-600"
                  }`}
                >
                  {cfg.sym}
                </span>
                <span className={`text-sm font-bold flex-1 ${textPrimary}`}>
                  {pick.race_entries?.post_number}{" "}
                  {pick.race_entries?.horses?.name ?? "不明"}
                </span>
                <span
                  className={`text-xs font-medium ${
                    hitResult === true
                      ? "text-green-500"
                      : hitResult === false
                      ? "text-red-400"
                      : textMuted
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
      <div
        className={`rounded-2xl border overflow-hidden ${cardBg} ${borderColor}`}
      >
        <div
          className={`px-4 py-2.5 border-b ${borderColor} ${
            isDark ? "bg-slate-800/50" : "bg-gray-50"
          }`}
        >
          <div className={`text-[10px] tracking-wider ${textMuted}`}>
            POINTS BREAKDOWN
          </div>
        </div>
        <div className="px-4 py-1">
          {betResults.map((bet, i) => (
            <div
              key={i}
              className={`flex items-center justify-between py-2 ${
                i < betResults.length - 1
                  ? `border-b ${isDark ? "border-slate-800" : "border-gray-50"}`
                  : ""
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-base">{bet.icon}</span>
                <span className={`text-sm font-medium ${textPrimary}`}>
                  {bet.label}
                </span>
                {bet.detail && (
                  <span className={`text-[10px] ${textMuted}`}>
                    {bet.detail}
                  </span>
                )}
              </div>
              <span
                className={`text-sm font-bold ${
                  bet.isHit
                    ? bet.icon === "💎" || bet.icon === "🔥"
                      ? isDark
                        ? "text-amber-400"
                        : "text-amber-600"
                      : "text-green-500"
                    : "text-red-400"
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
        <div
          className={`px-4 py-3 border-t ${borderColor} ${
            isDark ? "bg-slate-800/50" : "bg-gray-50"
          } flex items-center justify-between`}
        >
          <span className={`text-sm font-bold ${textPrimary}`}>
            合計
          </span>
          <span
            className={`text-xl font-black ${
              isHit
                ? "text-green-500"
                : isDark
                ? "text-slate-500"
                : "text-gray-400"
            }`}
          >
            {isHit ? `+${vote.earned_points} P` : "0 P"}
          </span>
        </div>
      </div>

      {/* ── シェアボタン（的中時のみ） ── */}
      {isHit && raceInfo && (
        <div className="flex gap-3">
          <button
            onClick={() => setShowShareCard(true)}
            className={`flex-1 py-3 rounded-xl font-bold text-sm transition-colors ${
              isDark
                ? "bg-amber-500 text-slate-900 hover:bg-amber-400"
                : "bg-green-600 text-white hover:bg-green-700"
            }`}
          >
            📸 的中報告をシェア
          </button>
          <button
            onClick={() => {
              const url = `${window.location.origin}${window.location.pathname}`;
              navigator.clipboard?.writeText(url);
            }}
            className={`w-12 py-3 rounded-xl text-lg ${
              isDark
                ? "bg-slate-700 hover:bg-slate-600"
                : "bg-gray-100 hover:bg-gray-200"
            }`}
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
