// src/lib/constants/gamification.ts
// ============================================================
// 🎮 ゲーミフィケーション — XP・バッジ・ランク定義
// ============================================================

// ── XPルール ──
export const XP_RULES = {
  // クイズ関連
  QUIZ_CORRECT: 10,        // 1問正解
  STAGE_CLEAR_1STAR: 30,   // ★1クリアボーナス
  STAGE_CLEAR_2STAR: 50,   // ★2クリアボーナス
  STAGE_CLEAR_3STAR: 100,  // ★3（全問正解）ボーナス
  BOSS_CLEAR: 200,         // BOSSクリアボーナス
  // デイリー
  DAILY_COMPLETE: 50,      // デイリー完了
  DAILY_STREAK_3: 20,      // 3日連続ボーナス
  DAILY_STREAK_7: 50,      // 7日連続ボーナス
  DAILY_STREAK_30: 200,    // 30日連続ボーナス
  // 記事
  ARTICLE_READ: 15,        // 記事読了
} as const;

export type XpAction =
  | "quiz_correct"
  | "stage_clear"
  | "boss_clear"
  | "daily_complete"
  | "daily_streak"
  | "article_read";

// ── バッジ定義 ──
export type BadgeDefinition = {
  id: string;
  name: string;
  description: string;
  emoji: string;
  category: "quiz" | "daily" | "article" | "special";
  rarity: "common" | "rare" | "epic" | "legendary";
  hidden?: boolean; // 獲得まで非表示
};

export const BADGES: BadgeDefinition[] = [
  // ── クイズ系 ──
  { id: "first_clear", name: "初陣突破", description: "はじめてステージをクリア", emoji: "🎯", category: "quiz", rarity: "common" },
  { id: "perfect_stage", name: "完璧な答え", description: "ステージを全問正解でクリア", emoji: "💎", category: "quiz", rarity: "rare" },
  { id: "star_collector_10", name: "星集め", description: "合計10個の★を獲得", emoji: "⭐", category: "quiz", rarity: "common" },
  { id: "star_collector_50", name: "スターハンター", description: "合計50個の★を獲得", emoji: "🌟", category: "quiz", rarity: "rare" },
  { id: "star_collector_100", name: "スターマスター", description: "合計100個の★を獲得", emoji: "✨", category: "quiz", rarity: "epic" },
  { id: "course_complete", name: "コース制覇", description: "1コースを全ステージクリア", emoji: "🏆", category: "quiz", rarity: "rare" },
  { id: "course_complete_5", name: "5コース制覇", description: "5コースを全ステージクリア", emoji: "🎖️", category: "quiz", rarity: "epic" },
  { id: "boss_slayer", name: "BOSS撃破", description: "はじめてBOSSをクリア", emoji: "👹", category: "quiz", rarity: "rare" },
  { id: "speed_demon", name: "スピードスター", description: "全問正解でステージクリア（3回）", emoji: "⚡", category: "quiz", rarity: "epic" },
  { id: "retry_master", name: "不屈の挑戦者", description: "同じステージに5回以上挑戦", emoji: "🔄", category: "quiz", rarity: "common" },

  // ── デイリー系 ──
  { id: "daily_first", name: "毎日の一歩", description: "はじめてデイリーチャレンジをクリア", emoji: "🔥", category: "daily", rarity: "common" },
  { id: "streak_3", name: "3日連続", description: "デイリーチャレンジ3日連続クリア", emoji: "🔥", category: "daily", rarity: "common" },
  { id: "streak_7", name: "1週間連続", description: "デイリーチャレンジ7日連続クリア", emoji: "🔥", category: "daily", rarity: "rare" },
  { id: "streak_14", name: "2週間連続", description: "デイリーチャレンジ14日連続クリア", emoji: "🔥", category: "daily", rarity: "rare" },
  { id: "streak_30", name: "1ヶ月連続", description: "デイリーチャレンジ30日連続クリア", emoji: "🔥", category: "daily", rarity: "epic" },
  { id: "streak_100", name: "100日の鍛錬", description: "デイリーチャレンジ100日連続クリア", emoji: "🔥", category: "daily", rarity: "legendary", hidden: true },

  // ── 記事系 ──
  { id: "first_read", name: "読書家の第一歩", description: "はじめて記事を読了", emoji: "📖", category: "article", rarity: "common" },
  { id: "reader_10", name: "勉強家", description: "10記事を読了", emoji: "📚", category: "article", rarity: "common" },
  { id: "reader_50", name: "知識の探求者", description: "50記事を読了", emoji: "🎓", category: "article", rarity: "rare" },
  { id: "reader_100", name: "競馬博士", description: "100記事を読了", emoji: "🧠", category: "article", rarity: "epic" },

  // ── スペシャル ──
  { id: "xp_1000", name: "1000XP到達", description: "累計1000XPを獲得", emoji: "🏅", category: "special", rarity: "common" },
  { id: "xp_5000", name: "5000XP到達", description: "累計5000XPを獲得", emoji: "🥈", category: "special", rarity: "rare" },
  { id: "xp_10000", name: "10000XP到達", description: "累計10000XPを獲得", emoji: "🥇", category: "special", rarity: "epic" },
  { id: "xp_50000", name: "レジェンド", description: "累計50000XPを獲得", emoji: "👑", category: "special", rarity: "legendary", hidden: true },
  { id: "all_clear", name: "道場完全制覇", description: "全コース全ステージをクリア", emoji: "🥋", category: "special", rarity: "legendary", hidden: true },
];

export const BADGE_MAP = Object.fromEntries(
  BADGES.map((b) => [b.id, b])
);

// レアリティカラー
export const RARITY_COLORS = {
  common: { bg: "bg-gray-100", text: "text-gray-600", dark_bg: "bg-slate-700", dark_text: "text-slate-300", label: "コモン" },
  rare: { bg: "bg-blue-100", text: "text-blue-600", dark_bg: "bg-blue-900/30", dark_text: "text-blue-400", label: "レア" },
  epic: { bg: "bg-purple-100", text: "text-purple-600", dark_bg: "bg-purple-900/30", dark_text: "text-purple-400", label: "エピック" },
  legendary: { bg: "bg-amber-100", text: "text-amber-600", dark_bg: "bg-amber-900/30", dark_text: "text-amber-400", label: "レジェンド" },
} as const;

// ── バッジ判定ロジック ──
export type BadgeCheckContext = {
  totalStars: number;
  totalXp: number;
  clearedStages: number;
  clearedCourses: number;
  bossCleared: number;
  perfectStages: number; // ★3の数
  dailyStreak: number;
  dailyTotal: number;
  articleReads: number;
  maxAttempts: number; // 最多挑戦回数
};

export function checkEarnedBadges(
  ctx: BadgeCheckContext,
  alreadyEarned: Set<string>
): string[] {
  const newBadges: string[] = [];

  function check(id: string, condition: boolean) {
    if (condition && !alreadyEarned.has(id)) newBadges.push(id);
  }

  // クイズ系
  check("first_clear", ctx.clearedStages >= 1);
  check("perfect_stage", ctx.perfectStages >= 1);
  check("star_collector_10", ctx.totalStars >= 10);
  check("star_collector_50", ctx.totalStars >= 50);
  check("star_collector_100", ctx.totalStars >= 100);
  check("course_complete", ctx.clearedCourses >= 1);
  check("course_complete_5", ctx.clearedCourses >= 5);
  check("boss_slayer", ctx.bossCleared >= 1);
  check("speed_demon", ctx.perfectStages >= 3);
  check("retry_master", ctx.maxAttempts >= 5);

  // デイリー系
  check("daily_first", ctx.dailyTotal >= 1);
  check("streak_3", ctx.dailyStreak >= 3);
  check("streak_7", ctx.dailyStreak >= 7);
  check("streak_14", ctx.dailyStreak >= 14);
  check("streak_30", ctx.dailyStreak >= 30);
  check("streak_100", ctx.dailyStreak >= 100);

  // 記事系
  check("first_read", ctx.articleReads >= 1);
  check("reader_10", ctx.articleReads >= 10);
  check("reader_50", ctx.articleReads >= 50);
  check("reader_100", ctx.articleReads >= 100);

  // スペシャル
  check("xp_1000", ctx.totalXp >= 1000);
  check("xp_5000", ctx.totalXp >= 5000);
  check("xp_10000", ctx.totalXp >= 10000);
  check("xp_50000", ctx.totalXp >= 50000);

  return newBadges;
}
