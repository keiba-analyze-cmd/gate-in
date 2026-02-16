"use client";

import { useTheme } from "@/contexts/ThemeContext";

type Transaction = {
  reason: string;
  amount: number;
  description: string;
};

type Props = {
  vote: {
    status: string;
    earned_points: number;
    is_perfect: boolean;
    vote_picks: {
      pick_type: string;
      is_hit: boolean | null;
      points_earned: number;
      race_entries: { post_number: number; horses: { name: string } | null } | null;
    }[];
  };
  isFinished: boolean;
  transactions?: Transaction[] | null;
};

export default function VoteSummary({ vote, isFinished, transactions }: Props) {
  const { isDark } = useTheme();

  const cardBg = isDark 
    ? "bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/30" 
    : "bg-gradient-to-br from-green-50 to-emerald-50 border-green-200";
  const textPrimary = isDark ? "text-slate-100" : "text-gray-900";
  const textSecondary = isDark ? "text-slate-400" : "text-gray-600";
  const borderColor = isDark ? "border-green-500/30" : "border-green-200";

  const isHit = vote.status === "settled_hit";
  const picks = vote.vote_picks ?? [];

  const PICK_LABELS: Record<string, { label: string; color: string }> = {
    win: { label: "◎ 本命", color: "text-red-500" },
    place: { label: "○ 対抗", color: "text-blue-500" },
    back: { label: "△ 抑え", color: isDark ? "text-yellow-400" : "text-yellow-600" },
    danger: { label: "⚠️ 危険", color: textSecondary },
  };

  const getColorClass = (color: string, isHit: boolean) => {
    if (!isHit) return isDark ? "text-slate-500" : "text-gray-400";
    const colors: Record<string, string> = {
      red: isDark ? "text-red-400" : "text-red-600",
      blue: isDark ? "text-blue-400" : "text-blue-600",
      green: isDark ? "text-green-400" : "text-green-600",
      teal: isDark ? "text-teal-400" : "text-teal-600",
      purple: isDark ? "text-purple-400" : "text-purple-600",
      orange: isDark ? "text-orange-400" : "text-orange-600",
      yellow: isDark ? "text-yellow-400" : "text-yellow-600",
    };
    return colors[color] ?? textPrimary;
  };

  // 結果確定前は予想した馬を表示
  if (!isFinished) {
    return (
      <div className={`rounded-2xl border p-5 ${cardBg}`}>
        <h3 className={`font-bold mb-3 ${textPrimary}`}>📦 あなたの予想</h3>
        <div className="space-y-2">
          {picks.map((pick, i) => {
            const style = PICK_LABELS[pick.pick_type] ?? PICK_LABELS.back;
            return (
              <div key={i} className="flex items-center gap-2">
                <span className={`text-sm font-bold ${style.color}`}>{style.label}</span>
                <span className={textPrimary}>
                  {pick.race_entries?.post_number} {pick.race_entries?.horses?.name ?? "不明"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // 結果確定後は馬券種ごとの結果を表示
  const transactionMap = new Map<string, Transaction[]>();
  if (transactions) {
    for (const tx of transactions) {
      if (!transactionMap.has(tx.reason)) {
        transactionMap.set(tx.reason, []);
      }
      transactionMap.get(tx.reason)!.push(tx);
    }
  }

  // 判定対象の馬券種を特定（予想内容から）
  const winPick = picks.find(p => p.pick_type === "win");
  const placePicks = picks.filter(p => p.pick_type === "place");
  const backPicks = picks.filter(p => p.pick_type === "back");
  const dangerPick = picks.find(p => p.pick_type === "danger");

  // 表示する馬券種リストを構築
  const betResults: { label: string; icon: string; color: string; isHit: boolean; points: number; detail?: string }[] = [];

  // 単勝（◎が1着）
  if (winPick) {
    const tx = transactionMap.get("win_hit")?.[0];
    betResults.push({
      label: "単勝",
      icon: "🎯",
      color: "red",
      isHit: !!tx,
      points: tx?.amount ?? 0,
      detail: `◎${winPick.race_entries?.post_number ?? "?"}番→1着`,
    });
  }

  // 複勝（◎が3着以内）- 単勝が外れた場合のみ表示
  if (winPick) {
    const winTx = transactionMap.get("win_hit")?.[0];
    const placeTx = transactionMap.get("place_hit")?.[0];
    // 単勝が外れて、複勝が的中の場合
    if (!winTx) {
      betResults.push({
        label: "複勝",
        icon: "🎫",
        color: "blue",
        isHit: !!placeTx,
        points: placeTx?.amount ?? 0,
        detail: `◎${winPick.race_entries?.post_number ?? "?"}番→3着以内`,
      });
    }
  }

  // 対抗（○が3着以内）- ポイントなし、的中状況のみ表示
  if (placePicks.length > 0) {
    const hitCount = placePicks.filter(p => p.is_hit).length;
    betResults.push({
      label: "対抗",
      icon: "○",
      color: "blue",
      isHit: hitCount > 0,
      points: 0, // ポイントなし
      detail: `${hitCount}/${placePicks.length}的中`,
    });
  }

  // 馬連 / 馬単
  if (winPick && placePicks.length > 0) {
    const exactaTx = transactionMap.get("exacta_hit")?.[0];
    const quinellaTx = transactionMap.get("quinella_hit")?.[0];
    const tx = exactaTx ?? quinellaTx;
    betResults.push({
      label: exactaTx ? "馬連(馬単)" : "馬連",
      icon: "🎫",
      color: "green",
      isHit: !!tx,
      points: tx?.amount ?? 0,
      detail: exactaTx ? "順番通り×2" : undefined,
    });
  }

  // ワイド（複数の場合あり）
  if (winPick && placePicks.length > 0) {
    const txs = transactionMap.get("wide_hit") ?? [];
    const totalWidePoints = txs.reduce((sum, tx) => sum + tx.amount, 0);
    betResults.push({
      label: "ワイド",
      icon: "🎟️",
      color: "teal",
      isHit: txs.length > 0,
      points: totalWidePoints,
      detail: txs.length > 0 ? `${txs.length}的中` : undefined,
    });
  }

  // 三連複 / 三連単
  if (winPick && (placePicks.length >= 2 || (placePicks.length >= 1 && backPicks.length >= 1))) {
    const trifectaTx = transactionMap.get("trifecta_hit")?.[0];
    const trioTx = transactionMap.get("trio_hit")?.[0];
    const tx = trifectaTx ?? trioTx;
    let bonusLabel = "";
    if (trifectaTx) {
      bonusLabel = trifectaTx.description.includes("×5") ? "順番通り×5" : "順番通り×3";
    }
    betResults.push({
      label: trifectaTx ? "三連複(3連単)" : "三連複",
      icon: "🎰",
      color: "purple",
      isHit: !!tx,
      points: tx?.amount ?? 0,
      detail: bonusLabel || undefined,
    });
  }

  // 危険馬
  if (dangerPick) {
    const tx = transactionMap.get("danger_hit")?.[0];
    betResults.push({
      label: "危険馬",
      icon: "⚠️",
      color: "orange",
      isHit: !!tx,
      points: tx?.amount ?? 0,
      detail: `${dangerPick.race_entries?.post_number ?? "?"}番`,
    });
  }

  // ボーナス
  const perfectTx = transactionMap.get("perfect_bonus")?.[0];
  if (perfectTx) {
    betResults.push({
      label: "完全的中",
      icon: "💎",
      color: "yellow",
      isHit: true,
      points: perfectTx.amount,
    });
  }

  const streakTx = transactionMap.get("streak_bonus")?.[0];
  if (streakTx) {
    betResults.push({
      label: "連続的中",
      icon: "🔥",
      color: "yellow",
      isHit: true,
      points: streakTx.amount,
    });
  }

  return (
    <div className={`rounded-2xl border p-5 ${cardBg}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className={`font-bold ${textPrimary}`}>📊 馬券結果</h3>
        <span className={`text-xs font-bold px-2 py-1 rounded-full ${
          isHit 
            ? (isDark ? "bg-green-500/20 text-green-400" : "bg-green-100 text-green-700") 
            : (isDark ? "bg-slate-700 text-slate-400" : "bg-gray-100 text-gray-500")
        }`}>
          {isHit ? "🎉 的中！" : "😢 ハズレ"}
        </span>
      </div>

      {/* 馬券種ごとの結果 */}
      <div className="space-y-2">
        {betResults.map((bet, i) => (
          <div key={i} className={`flex items-center justify-between py-1.5 border-b last:border-0 ${borderColor}`}>
            <div className="flex items-center gap-2">
              <span className="text-lg">{bet.icon}</span>
              <span className={`font-medium ${textPrimary}`}>{bet.label}</span>
              {bet.detail && (
                <span className={`text-xs ${textSecondary}`}>({bet.detail})</span>
              )}
            </div>
            {bet.label === "対抗" ? (
              // 対抗はポイントなし、的中状況のみ
              <span className={`text-sm ${bet.isHit ? (isDark ? "text-blue-400" : "text-blue-600") : (isDark ? "text-red-400" : "text-red-500")}`}>
                {bet.isHit ? "✓" : "×"}
              </span>
            ) : (
              <span className={`font-bold ${bet.isHit ? getColorClass(bet.color, true) : (isDark ? "text-red-400" : "text-red-500")}`}>
                {bet.isHit ? `+${bet.points}P` : "×"}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* 合計ポイント */}
      <div className={`mt-4 pt-3 border-t flex items-center justify-between ${borderColor}`}>
        <span className={`font-bold ${textPrimary}`}>獲得ポイント</span>
        <span className={`text-xl font-black ${isDark ? "text-green-400" : "text-green-600"}`}>
          +{vote.earned_points} P
        </span>
      </div>
    </div>
  );
}
