export const RANKS = [
  { id: "beginner_1", name: "ビギナー Ⅰ", icon: "🔰", tier: "ビギナー", threshold: 0 },
  { id: "beginner_2", name: "ビギナー Ⅱ", icon: "🔰", tier: "ビギナー", threshold: 50 },
  { id: "beginner_3", name: "ビギナー Ⅲ", icon: "🔰", tier: "ビギナー", threshold: 100 },
  { id: "beginner_4", name: "ビギナー Ⅳ", icon: "🔰", tier: "ビギナー", threshold: 200 },
  { id: "beginner_5", name: "ビギナー Ⅴ", icon: "🔰", tier: "ビギナー", threshold: 350 },
  { id: "forecaster_1", name: "予想士 Ⅰ", icon: "⭐", tier: "予想士", threshold: 500 },
  { id: "forecaster_2", name: "予想士 Ⅱ", icon: "⭐", tier: "予想士", threshold: 800 },
  { id: "forecaster_3", name: "予想士 Ⅲ", icon: "⭐", tier: "予想士", threshold: 1200 },
  { id: "forecaster_4", name: "予想士 Ⅳ", icon: "⭐", tier: "予想士", threshold: 2000 },
  { id: "forecaster_5", name: "予想士 Ⅴ", icon: "⭐", tier: "予想士", threshold: 2500 },
  { id: "advanced_1", name: "上級予想士 Ⅰ", icon: "⭐⭐", tier: "上級予想士", threshold: 3000 },
  { id: "advanced_2", name: "上級予想士 Ⅱ", icon: "⭐⭐", tier: "上級予想士", threshold: 4500 },
  { id: "advanced_3", name: "上級予想士 Ⅲ", icon: "⭐⭐", tier: "上級予想士", threshold: 6500 },
  { id: "advanced_4", name: "上級予想士 Ⅳ", icon: "⭐⭐", tier: "上級予想士", threshold: 9000 },
  { id: "advanced_5", name: "上級予想士 Ⅴ", icon: "⭐⭐", tier: "上級予想士", threshold: 12000 },
  { id: "master_1", name: "予想マスター Ⅰ", icon: "👑", tier: "予想マスター", threshold: 15000 },
  { id: "master_2", name: "予想マスター Ⅱ", icon: "👑", tier: "予想マスター", threshold: 22000 },
  { id: "master_3", name: "予想マスター Ⅲ", icon: "👑", tier: "予想マスター", threshold: 35000 },
  { id: "master_4", name: "予想マスター Ⅳ", icon: "👑", tier: "予想マスター", threshold: 55000 },
  { id: "master_5", name: "予想マスター Ⅴ", icon: "👑", tier: "予想マスター", threshold: 80000 },
  { id: "legend", name: "レジェンド", icon: "🏆", tier: "レジェンド", threshold: 100000 },
] as const;

export function getRank(rankId: string) {
  return RANKS.find((r) => r.id === rankId) ?? RANKS[0];
}

export function getNextRank(rankId: string) {
  const idx = RANKS.findIndex((r) => r.id === rankId);
  if (idx < 0 || idx >= RANKS.length - 1) return null;
  return RANKS[idx + 1];
}

export const POINT_RULES = {
  win: { 1: 50, 2: 100, 3: 100, 4: 200, 5: 200, 6: 200, 7: 350, 8: 350, 9: 350, default: 500 },
  place: 30,
  danger: 10,
  perfect: 300,
  streak3: 50,
  g1: 100,
} as const;

export function getWinPoints(popularity: number): number {
  const rules = POINT_RULES.win as Record<number | string, number>;
  return rules[popularity] ?? rules.default;
}
