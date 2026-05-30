// src/lib/rating/rating.test.ts
//
// 実行: `npx vitest run src/lib/rating` （jest の場合は import を調整）
//
// 検証する性質:
//   外しは負 / 的中は正 / 人気薄ほど大 / void / 同着1着hit /
//   無策≈基準 / 外しで低下 / 暫定フラグ / サンプル正直 / 冪等

import { describe, it, expect } from "vitest";
import {
  computePredictionScore,
  updateRating,
  ratingValue,
  isProvisional,
  recomputeRating,
  INITIAL_RATING_STATE,
  DEFAULT_RATING_CONFIG as C,
  type RaceResult,
} from "./rating";

const res = (win: boolean, odds: number): RaceResult => ({
  winnerHorseIds: win ? ["A"] : ["Z"],
  top3HorseIds: ["A"],
  winOddsByHorseId: { A: odds },
  voided: false,
});

describe("computePredictionScore", () => {
  it("外しはスコアが負", () => {
    expect(computePredictionScore({ honmeiHorseId: "A" }, res(false, 8)).score).toBeLessThan(0);
  });

  it("人気馬の的中はスコアが正", () => {
    expect(computePredictionScore({ honmeiHorseId: "A" }, res(true, 2)).score).toBeGreaterThan(0);
  });

  it("人気薄の的中ほどスコアが大きい", () => {
    const big = computePredictionScore({ honmeiHorseId: "A" }, res(true, 30)).score;
    const small = computePredictionScore({ honmeiHorseId: "A" }, res(true, 2)).score;
    expect(big).toBeGreaterThan(small);
  });

  it("オッズ欠損・取消・除外は対象外(void)", () => {
    const r: RaceResult = { winnerHorseIds: ["A"], top3HorseIds: [], winOddsByHorseId: {}, voided: false };
    expect(computePredictionScore({ honmeiHorseId: "A" }, r).voided).toBe(true);
  });

  it("レース不成立は対象外(void)", () => {
    const r: RaceResult = { winnerHorseIds: [], top3HorseIds: [], winOddsByHorseId: {}, voided: true };
    expect(computePredictionScore({ honmeiHorseId: "A" }, r).voided).toBe(true);
  });

  it("同着1着も的中扱い", () => {
    const r: RaceResult = { winnerHorseIds: ["A", "B"], top3HorseIds: ["A", "B"], winOddsByHorseId: { A: 5 }, voided: false };
    expect(computePredictionScore({ honmeiHorseId: "A" }, r).hit).toBe(true);
  });

  it("部分点: 有効時に○が複勝圏なら加点", () => {
    const cfg = { ...C, enablePartial: true };
    const r: RaceResult = { winnerHorseIds: ["Z"], top3HorseIds: ["O"], winOddsByHorseId: { A: 4 }, voided: false };
    const withTaiko = computePredictionScore({ honmeiHorseId: "A", taikoHorseId: "O" }, r, cfg).score;
    const without = computePredictionScore({ honmeiHorseId: "A" }, r, cfg).score;
    expect(withTaiko).toBeCloseTo(without + cfg.wTaiko, 6);
  });
});

describe("レート更新", () => {
  it("無策(平均スコア≈0)は基準レート付近に収まる", () => {
    let st = { ...INITIAL_RATING_STATE };
    // 的中率23%・平均勝ちオッズ2.8 の無策を再現（期待スコア≈0）
    let seed = 1;
    const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    for (let i = 0; i < 3000; i++) st = updateRating(st, (rnd() < 0.23 ? Math.log(2.8) : 0) - C.b, C);
    expect(Math.abs(ratingValue(st, C) - C.baseRating)).toBeLessThan(180);
  });

  it("外すとレートが下がる", () => {
    let st = { ...INITIAL_RATING_STATE };
    for (let i = 0; i < 60; i++) st = updateRating(st, 0.1, C);
    const before = ratingValue(st, C);
    const after = ratingValue(updateRating(st, -C.b, C), C);
    expect(after).toBeLessThan(before);
  });

  it("暫定フラグは予想数で決まる", () => {
    expect(isProvisional({ m: 0.4, n: 5 }, C)).toBe(true);
    expect(isProvisional({ m: 0.1, n: 200 }, C)).toBe(false);
  });

  it("幸運な新人は確立した実力者を超えない（収縮）", () => {
    let newbie = { ...INITIAL_RATING_STATE };
    for (const s of [Math.log(30) - C.b, -C.b, -C.b, -C.b, -C.b]) newbie = updateRating(newbie, s, C);
    let vet = { ...INITIAL_RATING_STATE };
    let seed = 2;
    const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    for (let i = 0; i < 4000; i++) vet = updateRating(vet, (rnd() < 0.3 ? Math.log(3.5) : 0) - C.b, C);
    expect(ratingValue(newbie, C)).toBeLessThan(ratingValue(vet, C));
  });

  it("recomputeRating は逐次更新と一致（冪等）", () => {
    const scores = [0.3, -C.b, 1.1, -C.b, 0.5];
    let seq = { ...INITIAL_RATING_STATE };
    for (const s of scores) seq = updateRating(seq, s, C);
    const rc = recomputeRating(scores, C);
    expect(rc.m).toBeCloseTo(seq.m, 9);
    expect(rc.n).toBe(seq.n);
  });
});
