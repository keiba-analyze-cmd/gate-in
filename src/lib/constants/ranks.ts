// ====================================================
// ランク定義（累計ポイント基準）
// 目安: 週10投票 x 月4週 = 40投票/月
// 上級者で月3000-4000P → レジェンドまで約6ヶ月
// ====================================================
export const RANKS = [
  { id: "beginner_1", name: "ビギナー Ⅰ", icon: "🔰", tier: "ビギナー", threshold: 0 },
  { id: "beginner_2", name: "ビギナー Ⅱ", icon: "🔰", tier: "ビギナー", threshold: 30 },
  { id: "beginner_3", name: "ビギナー Ⅲ", icon: "🔰", tier: "ビギナー", threshold: 80 },
  { id: "beginner_4", name: "ビギナー Ⅳ", icon: "🔰", tier: "ビギナー", threshold: 200 },
  { id: "beginner_5", name: "ビギナー Ⅴ", icon: "🔰", tier: "ビギナー", threshold: 400 },
  { id: "forecaster_1", name: "予想士 Ⅰ", icon: "⭐", tier: "予想士", threshold: 700 },
  { id: "forecaster_2", name: "予想士 Ⅱ", icon: "⭐", tier: "予想士", threshold: 1100 },
  { id: "forecaster_3", name: "予想士 Ⅲ", icon: "⭐", tier: "予想士", threshold: 1600 },
  { id: "forecaster_4", name: "予想士 Ⅳ", icon: "⭐", tier: "予想士", threshold: 2200 },
  { id: "forecaster_5", name: "予想士 Ⅴ", icon: "⭐", tier: "予想士", threshold: 3000 },
  { id: "advanced_1", name: "上級予想士 Ⅰ", icon: "⭐⭐", tier: "上級予想士", threshold: 4000 },
  { id: "advanced_2", name: "上級予想士 Ⅱ", icon: "⭐⭐", tier: "上級予想士", threshold: 5500 },
  { id: "advanced_3", name: "上級予想士 Ⅲ", icon: "⭐⭐", tier: "上級予想士", threshold: 7500 },
  { id: "advanced_4", name: "上級予想士 Ⅳ", icon: "⭐⭐", tier: "上級予想士", threshold: 10000 },
  { id: "advanced_5", name: "上級予想士 Ⅴ", icon: "⭐⭐", tier: "上級予想士", threshold: 13000 },
  { id: "master_1", name: "予想マスター Ⅰ", icon: "👑", tier: "予想マスター", threshold: 16500 },
  { id: "master_2", name: "予想マスター Ⅱ", icon: "👑", tier: "予想マスター", threshold: 20500 },
  { id: "master_3", name: "予想マスター Ⅲ", icon: "👑", tier: "予想マスター", threshold: 25000 },
  { id: "master_4", name: "予想マスター Ⅳ", icon: "👑", tier: "予想マスター", threshold: 30000 },
  { id: "master_5", name: "予想マスター Ⅴ", icon: "👑", tier: "予想マスター", threshold: 36000 },
  { id: "legend", name: "レジェンド", icon: "🏆", tier: "レジェンド", threshold: 45000 },
] as const;

export function getRank(rankId: string) {
  return RANKS.find((r) => r.id === rankId) ?? RANKS[0];
}

export function getNextRank(rankId: string) {
  const idx = RANKS.findIndex((r) => r.id === rankId);
  if (idx < 0 || idx >= RANKS.length - 1) return null;
  return RANKS[idx + 1];
}

// ====================================================
// ポイントルール
// ====================================================

// 1着的中: 人気別ポイント（大穴ほど高い）
export const POINT_RULES = {
  win: {
    1: 30, 2: 50, 3: 50,
    4: 80, 5: 80,
    6: 120, 7: 120,
    8: 200, 9: 200,
    default: 300,
  } as Record<number | string, number>,

  // 複勝的中: 固定
  place: 20,

  // 危険馬的中: 人気別ポイント（人気馬を危険視→着外ほど評価高い）
  danger: {
    1: 50, 2: 40, 3: 30,
    4: 20, 5: 15,
    default: 10,
  } as Record<number | string, number>,

  // グレード別ボーナス（各的中に加算）
  grade_bonus: {
    G1: 30,
    G2: 15,
    G3: 10,
    L: 5,
    OP: 5,
  } as Record<string, number>,

  // 完全的中ボーナス（◎○△全的中）
  perfect: 200,

  // 連続的中ボーナス（3の倍数ごと）
  streak3: 50,
} as const;

// 1着的中ポイントを取得
export function getWinPoints(popularity: number): number {
  return POINT_RULES.win[popularity] ?? POINT_RULES.win.default;
}

// 危険馬的中ポイントを取得（人気馬ほど高い）
export function getDangerPoints(popularity: number): number {
  return POINT_RULES.danger[popularity] ?? POINT_RULES.danger.default;
}

// グレードボーナスを取得
export function getGradeBonus(grade: string | null): number {
  if (!grade) return 0;
  return (POINT_RULES.grade_bonus as Record<string, number>)[grade] ?? 0;
}
