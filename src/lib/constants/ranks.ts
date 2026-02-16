// ====================================================
// ランク定義（累計ポイント基準）
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
// ポイントルール（オッズ連動版）
// ====================================================

export const POINT_RULES = {
  // 単勝（◎が1着）: オッズ別
  win_odds: [
    { max: 1.9, points: 20 },
    { max: 3.9, points: 40 },
    { max: 6.9, points: 60 },
    { max: 14.9, points: 100 },
    { max: 29.9, points: 150 },
    { max: Infinity, points: 250 },
  ],

  // 複勝（○が3着以内）: オッズ別
  place_odds: [
    { max: 1.4, points: 10 },
    { max: 2.4, points: 15 },
    { max: 3.9, points: 25 },
    { max: 6.9, points: 40 },
    { max: Infinity, points: 60 },
  ],

  // 馬連（◎○が1-2着）: オッズ別
  quinella_odds: [
    { max: 9.9, points: 30 },
    { max: 29.9, points: 50 },
    { max: 59.9, points: 80 },
    { max: 99.9, points: 120 },
    { max: 299.9, points: 180 },
    { max: Infinity, points: 280 },
  ],

  // ワイド（◎○が3着以内）: オッズ別
  wide_odds: [
    { max: 2.9, points: 15 },
    { max: 5.9, points: 25 },
    { max: 9.9, points: 40 },
    { max: 19.9, points: 60 },
    { max: Infinity, points: 90 },
  ],

  // 三連複（◎○○/◎○△/◎△△が1-2-3着）: オッズ別
  trio_odds: [
    { max: 9.9, points: 20 },
    { max: 49.9, points: 50 },
    { max: 99.9, points: 80 },
    { max: 299.9, points: 120 },
    { max: 999.9, points: 180 },
    { max: Infinity, points: 300 },
  ],

  // △（抑え）の数に応じた倍率
  back_multiplier: [
    { count: 1, multiplier: 1.0 },
    { count: 2, multiplier: 0.8 },
    { count: 3, multiplier: 0.6 },
    { count: 4, multiplier: 0.4 },
    { count: 5, multiplier: 0.2 },
  ],

  // 馬単ボーナス（1着◎、2着○の順番通り）
  exacta_bonus: 2.0,

  // 3連単ボーナス（1着◎、2着○、3着○/△の順番通り）
  trifecta_bonus: {
    place_3rd: 5.0,  // 3着が○の場合
    back_3rd: 3.0,   // 3着が△の場合
  },

  // 危険馬的中: 人気別ポイント
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

  // 完全的中ボーナス（◎○⚠️全的中）
  perfect: 200,

  // 連続的中ボーナス（3の倍数ごと）
  streak3: 50,
} as const;

// ====================================================
// ポイント取得関数
// ====================================================

function getPointsByOdds(odds: number, table: readonly { max: number; points: number }[]): number {
  for (const tier of table) {
    if (odds <= tier.max) return tier.points;
  }
  return table[table.length - 1].points;
}

export function getWinPointsByOdds(odds: number): number {
  return getPointsByOdds(odds, POINT_RULES.win_odds);
}

export function getPlacePointsByOdds(odds: number): number {
  return getPointsByOdds(odds, POINT_RULES.place_odds);
}

export function getQuinellaPointsByOdds(odds: number): number {
  return getPointsByOdds(odds, POINT_RULES.quinella_odds);
}

export function getWidePointsByOdds(odds: number): number {
  return getPointsByOdds(odds, POINT_RULES.wide_odds);
}

export function getTrioPointsByOdds(odds: number): number {
  return getPointsByOdds(odds, POINT_RULES.trio_odds);
}

export function getBackMultiplier(backCount: number): number {
  if (backCount <= 0) return 1.0;
  const tier = POINT_RULES.back_multiplier.find(t => t.count === backCount);
  return tier?.multiplier ?? 0.2;
}

export function getDangerPoints(popularity: number): number {
  return POINT_RULES.danger[popularity] ?? POINT_RULES.danger.default;
}

export function getGradeBonus(grade: string | null): number {
  if (!grade) return 0;
  return (POINT_RULES.grade_bonus as Record<string, number>)[grade] ?? 0;
}

// 馬単ボーナス倍率
export function getExactaBonus(): number {
  return POINT_RULES.exacta_bonus;
}

// 3連単ボーナス倍率
export function getTrifectaBonus(thirdPickType: "place" | "back"): number {
  return thirdPickType === "place" 
    ? POINT_RULES.trifecta_bonus.place_3rd 
    : POINT_RULES.trifecta_bonus.back_3rd;
}

// ====================================================
// 旧関数（後方互換性のため残す）
// ====================================================

const WIN_POINTS_BY_POPULARITY: Record<number | string, number> = {
  1: 30, 2: 50, 3: 50,
  4: 80, 5: 80,
  6: 120, 7: 120,
  8: 200, 9: 200,
  default: 300,
};

export function getWinPoints(popularity: number): number {
  return WIN_POINTS_BY_POPULARITY[popularity] ?? WIN_POINTS_BY_POPULARITY.default;
}
