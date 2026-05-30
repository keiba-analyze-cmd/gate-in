// src/lib/rating/settle.ts
//
// settle-race に差し込むレーティング精算。
//   ・全レース・全予想（人＋AI）が対象（大会ポイントとは別系統）
//   ・冪等：再実行しても二重加算しない（applied フラグ＋scoreが権威データ）
//   ・修復／校正値変更時は recomputePredictor で履歴から完全再計算
//
// DBアクセスは SettleRatingDeps（adapter）に逃がし、本体はスキーマ非依存。
// 設計の全体像は settle-race-integration.md を参照。

import {
  computePredictionScore,
  updateRating,
  ratingValue,
  isProvisional,
  recomputeRating,
  INITIAL_RATING_STATE,
  DEFAULT_RATING_CONFIG,
  type Prediction,
  type RaceResult,
  type RatingConfig,
  type RatingState,
} from "./rating";

/** "user:<id>" または "ai:<id>"。人とAIを同じ盤に乗せるための統合キー。 */
export type PredictorKey = string;
export const predictorKey = (type: "user" | "ai", id: string): PredictorKey =>
  `${type}:${id}`;

/** 精算対象の1予想。 */
export interface RatingPredictionInput {
  predId: string;
  predictorKey: PredictorKey;
  prediction: Prediction;
  /** 既にレートへ適用済みか（冪等性の要）。 */
  applied: boolean;
}

/** 予想行へ書き戻すスコア。 */
export interface ScoredPredictionRow {
  predId: string;
  score: number | null; // voided 時は null
  voided: boolean;
  hit: boolean;
}

/** predictor_ratings の更新行。 */
export interface RatingStateUpsert {
  predictorKey: PredictorKey;
  m: number;
  n: number;
  value: number; // 表示レート（materialized）
  provisional: boolean;
}

/** DBアクセス（スキーマに合わせて実装する）。 */
export interface SettleRatingDeps {
  /** 確定結果（勝ち馬・3着内・確定単勝オッズ）。 */
  getRaceResult(raceId: string): Promise<RaceResult>;
  /** このレースの全予想（人＋AI）。applied は現在値を返すこと。 */
  getPredictionsForRating(raceId: string): Promise<RatingPredictionInput[]>;
  /** 各予想行へ score / voided / hit を書き戻す（同値の再書き込みは無害）。 */
  savePredictionScores(rows: ScoredPredictionRow[]): Promise<void>;
  /** 指定 predictor の現在のレート状態をまとめて取得。 */
  getRatingStates(keys: PredictorKey[]): Promise<Map<PredictorKey, RatingState>>;
  /** predictor_ratings をまとめて upsert。 */
  saveRatingStates(states: RatingStateUpsert[]): Promise<void>;
  /** 予想行の applied=true をまとめて立てる。 */
  markApplied(predIds: string[]): Promise<void>;
  /** （再計算用）指定 predictor の非void scoreを確定順に取得。 */
  getOrderedScores(key: PredictorKey): Promise<number[]>;
}

/**
 * 1レースぶんのレートを精算する（冪等）。
 * settle-race の確定処理から、結果確定後に呼ぶ。
 */
export async function settleRaceRating(
  raceId: string,
  deps: SettleRatingDeps,
  cfg: RatingConfig = DEFAULT_RATING_CONFIG,
): Promise<{ scored: number; applied: number }> {
  const result = await deps.getRaceResult(raceId);
  const preds = await deps.getPredictionsForRating(raceId);

  // 1) スコア計算 → 書き戻し（同値の再書き込みは無害＝冪等）
  const scored = preds.map((p) => ({
    ...p,
    ...computePredictionScore(p.prediction, result, cfg),
  }));
  await deps.savePredictionScores(
    scored.map((s) => ({
      predId: s.predId,
      score: s.voided ? null : s.score,
      voided: s.voided,
      hit: s.hit,
    })),
  );

  // 2) レート前進：未適用かつ非voidのみ（applied フラグが二重加算を防ぐ）
  const toApply = scored.filter((s) => !s.applied && !s.voided);
  const keys = [...new Set(toApply.map((s) => s.predictorKey))];
  const states = await deps.getRatingStates(keys);

  const upserts: RatingStateUpsert[] = [];
  const appliedIds: string[] = [];
  for (const key of keys) {
    let st: RatingState = states.get(key) ?? { ...INITIAL_RATING_STATE };
    // 同一レース内は predId で決定的に順序付け
    const items = toApply
      .filter((s) => s.predictorKey === key)
      .sort((a, b) => (a.predId < b.predId ? -1 : 1));
    for (const it of items) {
      st = updateRating(st, it.score, cfg);
      appliedIds.push(it.predId);
    }
    upserts.push({
      predictorKey: key,
      m: st.m,
      n: st.n,
      value: ratingValue(st, cfg),
      provisional: isProvisional(st, cfg),
    });
  }

  await deps.saveRatingStates(upserts);
  await deps.markApplied(appliedIds);

  return { scored: scored.length, applied: appliedIds.length };
}

/**
 * 指定 predictor のレートを履歴から完全再計算する（権威データ＝保存済み score 列）。
 * 用途:
 *   ・結果修正やレース取消で score が変わった後の修復
 *   ・b/scale など校正値を変えた後の全再計算（全 predictor に対して回す）
 */
export async function recomputePredictor(
  key: PredictorKey,
  deps: SettleRatingDeps,
  cfg: RatingConfig = DEFAULT_RATING_CONFIG,
): Promise<RatingState> {
  const scores = await deps.getOrderedScores(key); // 非void・確定順
  const st = recomputeRating(scores, cfg);
  await deps.saveRatingStates([
    {
      predictorKey: key,
      m: st.m,
      n: st.n,
      value: ratingValue(st, cfg),
      provisional: isProvisional(st, cfg),
    },
  ]);
  return st;
}
