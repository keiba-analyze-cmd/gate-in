// src/lib/rating/rating.ts
//
// 「予想の上手さ」を、市場（控除率込みオッズ）に対する相対値として測る恒久レーティング。
// レートは「加算」ではなく「直近スコアの収縮平均」として定義する（有界・安定・現在の調子を反映）。
// 思想・校正手順・大会ポイントとの棲み分けは rating-spec.md を参照。
//
// 検証済みの性質（合成データ）:
//   ・外したら必ず下がる / 的中は人気薄ほど大きく上がる
//   ・無策(edge=0)は基準レート(≈1500)付近で横ばい、実力に応じて単調上昇
//   ・有界（発散しない） / サンプルが少ない間は基準へ収縮（幸運な新人は実力者を超えない）

export interface RatingConfig {
  /** 無策◎の基準スコア。これを引くことで「市場に勝った分」だけが残る。要校正（calibrate-rating.mjs）。 */
  b: number;
  /** スコア→レート表示への変換係数。レートの広がりを決める装飾値。要校正。 */
  scale: number;
  /** 「現在の調子」とみなす直近予想数（指数移動平均の地平線）。 */
  nWin: number;
  /** 低サンプル時に基準(=0)へ引き戻す擬似カウント。大きいほど新人が慎重に扱われる。 */
  shrinkC: number;
  /** これ未満の予想数は「暫定」表示。 */
  provisionalN: number;
  /** 初期レート R0。絶対値は装飾。 */
  baseRating: number;

  /** v1.1: ○▲△・危険馬への部分点を有効化（既定 false = ◎のみ）。 */
  enablePartial: boolean;
  wTaiko: number;
  wTanana: number;
  wRenka: number;
  wDanger: number;
}

/**
 * 既定値。b と scale は合成データ由来の暫定値。
 * 本番投入前に必ず 7年JRDBで校正し、ここを差し替えること。
 */
export const DEFAULT_RATING_CONFIG: RatingConfig = {
  b: 0.224,
  scale: 3439,
  nWin: 100,
  shrinkC: 50,
  provisionalN: 30,
  baseRating: 1500,
  enablePartial: false,
  wTaiko: 0.05,
  wTanana: 0.03,
  wRenka: 0.02,
  wDanger: 0.04,
};

/** 1件の予想（人・AI共通）。馬は安定IDで参照する。 */
export interface Prediction {
  honmeiHorseId: string; // ◎
  taikoHorseId?: string | null; // ○
  tananaHorseId?: string | null; // ▲
  renkaHorseIds?: string[]; // △
  dangerHorseIds?: string[]; // 危険馬
}

/** レース確定結果。 */
export interface RaceResult {
  /** 1着の馬ID（同着なら複数）。 */
  winnerHorseIds: string[];
  /** 3着内の馬ID。部分点(v1.1)で使用。 */
  top3HorseIds: string[];
  /** 馬ID → 確定単勝オッズ（JRDB SEC pos175）。 */
  winOddsByHorseId: Record<string, number>;
  /** レース不成立・中止など。true ならレーティング対象外。 */
  voided?: boolean;
}

export interface ScoreResult {
  /** 反映するスコア s（voided 時は 0）。 */
  score: number;
  /** ◎が1着だったか。 */
  hit: boolean;
  /** ◎馬の確定単勝オッズ（対象外は null）。 */
  honmeiOdds: number | null;
  /** true ならレーティング更新をスキップ（取消・除外・欠損・不成立）。 */
  voided: boolean;
}

/**
 * 1予想のスコア s を計算する。
 *   s_core = (◎が1着 ? ln(オッズ) : 0) − b
 *   （v1.1）+ ○▲が複勝圏 / 危険馬が圏外 への小さな加点
 */
export function computePredictionScore(
  pred: Prediction,
  result: RaceResult,
  cfg: RatingConfig = DEFAULT_RATING_CONFIG,
): ScoreResult {
  if (result.voided) {
    return { score: 0, hit: false, honmeiOdds: null, voided: true };
  }
  const O = result.winOddsByHorseId[pred.honmeiHorseId];
  // オッズ欠損・取消・除外（オッズ無し or 不正値）は対象外
  if (O == null || !Number.isFinite(O) || O <= 1) {
    return { score: 0, hit: false, honmeiOdds: null, voided: true };
  }

  const winners = new Set(result.winnerHorseIds);
  const hit = winners.has(pred.honmeiHorseId); // 同着1着も hit
  let s = (hit ? Math.log(O) : 0) - cfg.b;

  if (cfg.enablePartial) {
    const top3 = new Set(result.top3HorseIds);
    if (pred.taikoHorseId && top3.has(pred.taikoHorseId)) s += cfg.wTaiko;
    if (pred.tananaHorseId && top3.has(pred.tananaHorseId)) s += cfg.wTanana;
    if (pred.renkaHorseIds?.some((h) => top3.has(h))) s += cfg.wRenka;
    if (
      pred.dangerHorseIds?.length &&
      pred.dangerHorseIds.every((h) => !top3.has(h))
    ) {
      s += cfg.wDanger;
    }
  }

  return { score: s, hit, honmeiOdds: O, voided: false };
}

/** DBに保存する恒久レート状態。 */
export interface RatingState {
  /** 直近スコアの指数移動平均。 */
  m: number;
  /** 採点済み予想数。 */
  n: number;
}

export const INITIAL_RATING_STATE: RatingState = { m: 0, n: 0 };

/**
 * 1予想ぶんレートを更新（オンライン）。
 * α = 1/min(n, nWin)。n≤nWin は累積平均、n>nWin は地平線 nWin の指数移動平均。
 */
export function updateRating(
  state: RatingState,
  score: number,
  cfg: RatingConfig = DEFAULT_RATING_CONFIG,
): RatingState {
  const n = state.n + 1;
  const alpha = 1 / Math.min(n, cfg.nWin);
  const m = state.m + alpha * (score - state.m);
  return { m, n };
}

/** 表示・順位用のレート値（低サンプルは基準へ収縮）。 */
export function ratingValue(
  state: RatingState,
  cfg: RatingConfig = DEFAULT_RATING_CONFIG,
): number {
  if (state.n === 0) return cfg.baseRating;
  const shrunk = (state.m * state.n) / (state.n + cfg.shrinkC);
  return cfg.baseRating + cfg.scale * shrunk;
}

/** 暫定（信頼度が低い）か。UIで「暫定」バッジ表示に使う。 */
export function isProvisional(
  state: RatingState,
  cfg: RatingConfig = DEFAULT_RATING_CONFIG,
): boolean {
  return state.n < cfg.provisionalN;
}

/**
 * 保存済みスコア列から状態を再構築（冪等）。
 * 校正値(b, scale等)を変えた後の全再計算や、整合性チェックに使う。
 * scores は確定順（古い→新しい）で渡すこと。
 */
export function recomputeRating(
  scores: number[],
  cfg: RatingConfig = DEFAULT_RATING_CONFIG,
): RatingState {
  let st: RatingState = { ...INITIAL_RATING_STATE };
  for (const s of scores) st = updateRating(st, s, cfg);
  return st;
}
