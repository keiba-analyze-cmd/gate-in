// ====================================================
// 5段階的中ランク定義
// 既存のvoteデータから計算（DBスキーマ変更不要）
// ====================================================

export type HitRank = 'S' | 'A' | 'B' | 'C' | 'D' | null;

export interface HitRankConfig {
  rank: HitRank;
  name: string;
  description: string;
  emoji: string;
  // ライトモード
  bgClass: string;
  borderClass: string;
  textClass: string;
  badgeBg: string;
  badgeText: string;
  // ダークモード
  darkBgClass: string;
  darkBorderClass: string;
  darkTextClass: string;
  darkBadgeBg: string;
  darkBadgeText: string;
}

export const HIT_RANKS: Record<Exclude<HitRank, null>, HitRankConfig> = {
  S: {
    rank: 'S',
    name: 'パーフェクト',
    description: '◎1着 + ○複勝 + ⚠️的中',
    emoji: '🎊',
    // ライトモード - 金グラデーション
    bgClass: 'bg-gradient-to-br from-yellow-50 to-amber-100',
    borderClass: 'border-yellow-400',
    textClass: 'text-yellow-700',
    badgeBg: 'bg-gradient-to-r from-yellow-400 to-amber-500',
    badgeText: 'text-white',
    // ダークモード
    darkBgClass: 'bg-gradient-to-br from-yellow-900/30 to-amber-900/30',
    darkBorderClass: 'border-yellow-600',
    darkTextClass: 'text-yellow-400',
    darkBadgeBg: 'bg-gradient-to-r from-yellow-500 to-amber-500',
    darkBadgeText: 'text-slate-900',
  },
  A: {
    rank: 'A',
    name: '単勝的中',
    description: '◎が1着',
    emoji: '🎯',
    // ライトモード - 緑
    bgClass: 'bg-green-50',
    borderClass: 'border-green-400',
    textClass: 'text-green-700',
    badgeBg: 'bg-green-500',
    badgeText: 'text-white',
    // ダークモード
    darkBgClass: 'bg-green-900/30',
    darkBorderClass: 'border-green-600',
    darkTextClass: 'text-green-400',
    darkBadgeBg: 'bg-green-600',
    darkBadgeText: 'text-white',
  },
  B: {
    rank: 'B',
    name: '複勝的中',
    description: '◎が2-3着',
    emoji: '○',
    // ライトモード - 青
    bgClass: 'bg-blue-50',
    borderClass: 'border-blue-400',
    textClass: 'text-blue-700',
    badgeBg: 'bg-blue-500',
    badgeText: 'text-white',
    // ダークモード
    darkBgClass: 'bg-blue-900/30',
    darkBorderClass: 'border-blue-600',
    darkTextClass: 'text-blue-400',
    darkBadgeBg: 'bg-blue-600',
    darkBadgeText: 'text-white',
  },
  C: {
    rank: 'C',
    name: '一部的中',
    description: '○か△のみ的中',
    emoji: '△',
    // ライトモード - 薄灰
    bgClass: 'bg-gray-50',
    borderClass: 'border-gray-300',
    textClass: 'text-gray-600',
    badgeBg: 'bg-gray-400',
    badgeText: 'text-white',
    // ダークモード
    darkBgClass: 'bg-slate-800/50',
    darkBorderClass: 'border-slate-600',
    darkTextClass: 'text-slate-400',
    darkBadgeBg: 'bg-slate-600',
    darkBadgeText: 'text-white',
  },
  D: {
    rank: 'D',
    name: 'ハズレ',
    description: '全外れ',
    emoji: '×',
    // ライトモード - 灰
    bgClass: 'bg-gray-100',
    borderClass: 'border-gray-200',
    textClass: 'text-gray-400',
    badgeBg: 'bg-gray-300',
    badgeText: 'text-gray-600',
    // ダークモード
    darkBgClass: 'bg-slate-900',
    darkBorderClass: 'border-slate-700',
    darkTextClass: 'text-slate-500',
    darkBadgeBg: 'bg-slate-700',
    darkBadgeText: 'text-slate-400',
  },
};

// ====================================================
// 的中ランク計算関数
// ====================================================

type VotePick = {
  pick_type: string;
  is_hit: boolean | null;
  race_entry_id?: string;
};

type Vote = {
  status: string;
  is_perfect?: boolean;
  earned_points?: number;
  vote_picks?: VotePick[];
};

/**
 * 投票データから5段階的中ランクを計算
 * @param vote 投票データ
 * @returns HitRank ('S' | 'A' | 'B' | 'C' | 'D' | null)
 */
export function calculateHitRank(vote: Vote | null | undefined): HitRank {
  if (!vote) return null;
  
  // まだ結果確定前
  if (vote.status === 'pending') return null;
  
  // ハズレ
  if (vote.status === 'settled_miss') return 'D';
  
  // 的中した場合
  if (vote.status === 'settled_hit') {
    // パーフェクト
    if (vote.is_perfect) return 'S';
    
    const picks = vote.vote_picks ?? [];
    const winPick = picks.find(p => p.pick_type === 'win');
    
    // ◎が1着 → A
    if (winPick?.is_hit) return 'A';
    
    // ◎が2-3着かどうかを判定するには追加情報が必要
    // 現状のDBでは「◎が2-3着」を直接判定できないため、
    // earned_points > 0 かつ ◎外れ の場合は C として扱う
    // ※ 将来的にDBに finish_position を追加すれば B を判定可能
    
    // ○か△のみ的中 → C
    const placePicks = picks.filter(p => p.pick_type === 'place');
    const backPicks = picks.filter(p => p.pick_type === 'back');
    const dangerPick = picks.find(p => p.pick_type === 'danger');
    
    const placeHit = placePicks.some(p => p.is_hit);
    const backHit = backPicks.some(p => p.is_hit);
    const dangerHit = dangerPick?.is_hit;
    
    if (placeHit || backHit || dangerHit) {
      return 'C';
    }
  }
  
  return 'D';
}

/**
 * 的中ランクの設定を取得
 * @param rank 的中ランク
 * @returns HitRankConfig または undefined
 */
export function getHitRankConfig(rank: HitRank): HitRankConfig | undefined {
  if (!rank) return undefined;
  return HIT_RANKS[rank];
}

/**
 * 的中ランクのスタイルクラスを取得
 * @param rank 的中ランク
 * @param isDark ダークモードかどうか
 * @param voted 投票済みかどうか
 */
export function getHitRankStyle(
  rank: HitRank,
  isDark: boolean = false,
  voted: boolean = true
): {
  bg: string;
  border: string;
  text: string;
  badgeBg: string;
  badgeText: string;
} {
  // 未投票
  if (!voted || !rank) {
    return {
      bg: isDark ? 'bg-slate-900' : 'bg-white',
      border: isDark ? 'border-slate-700' : 'border-gray-200',
      text: isDark ? 'text-slate-400' : 'text-gray-400',
      badgeBg: isDark ? 'bg-slate-700' : 'bg-gray-200',
      badgeText: isDark ? 'text-slate-400' : 'text-gray-500',
    };
  }
  
  const config = HIT_RANKS[rank];
  
  return {
    bg: isDark ? config.darkBgClass : config.bgClass,
    border: isDark ? config.darkBorderClass : config.borderClass,
    text: isDark ? config.darkTextClass : config.textClass,
    badgeBg: isDark ? config.darkBadgeBg : config.badgeBg,
    badgeText: isDark ? config.darkBadgeText : config.badgeText,
  };
}

/**
 * 旧形式(hit/miss)から5段階に変換
 * @param voteResult 旧形式の結果
 * @param isPerfect 完全的中かどうか
 */
export function convertLegacyResult(
  voteResult: 'none' | 'pending' | 'hit' | 'miss',
  isPerfect: boolean = false
): HitRank {
  switch (voteResult) {
    case 'hit':
      return isPerfect ? 'S' : 'A'; // 詳細不明の場合はAとして扱う
    case 'miss':
      return 'D';
    case 'pending':
    case 'none':
    default:
      return null;
  }
}

// ====================================================
// グレード別倍率（参考：ranks.tsから）
// ====================================================

export const GRADE_MULTIPLIERS: Record<string, number> = {
  G1: 2.0,
  G2: 1.5,
  G3: 1.3,
  OP: 1.0,
  L: 1.0,
};

export function getGradeMultiplier(grade: string | null): number {
  if (!grade) return 1.0;
  return GRADE_MULTIPLIERS[grade] ?? 1.0;
}
