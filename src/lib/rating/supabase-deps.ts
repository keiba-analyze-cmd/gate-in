// src/lib/rating/supabase-deps.ts
//
// SettleRatingDeps の Supabase 実装。settle-race.ts の後段から呼ぶ。
// 実スキーマ対応:
//   - 確定単勝オッズ / 着順: race_results × race_entries(odds, horse_id, post_number)
//   - ユーザー予想: votes × vote_picks(pick_type, race_entry_id) → race_entries.horse_id
//   - AI予想: ai_predictions(umaban 等) → race_entries(post_number).horse_id
//   - 人もAIも同じ式(computePredictionScore)で採点（既存のポイントとは別系統）

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  settleRaceRating,
  recomputePredictor,
  type SettleRatingDeps,
  type RatingPredictionInput,
  type ScoredPredictionRow,
  type RatingStateUpsert,
  type PredictorKey,
} from "./settle";
import type { RaceResult, RatingState } from "./rating";

type Table = "votes" | "ai_predictions";

const keyOf = (type: "user" | "ai", id: string): PredictorKey => `${type}:${id}`;
const parseKey = (key: PredictorKey) => {
  const i = key.indexOf(":");
  return { type: key.slice(0, i) as "user" | "ai", id: key.slice(i + 1) };
};

export function createSupabaseRatingDeps(supabase: SupabaseClient): SettleRatingDeps {
  // 予想ID → どのテーブルへ書き戻すか（getPredictionsForRating で構築）
  const tableByPredId = new Map<string, Table>();
  let postToHorse = new Map<number, string>();
  let entryToHorse = new Map<string, string>();

  async function loadEntryMaps(raceId: string) {
    const { data, error } = await supabase
      .from("race_entries")
      .select("id, post_number, horse_id")
      .eq("race_id", raceId);
    if (error) throw error;
    postToHorse = new Map();
    entryToHorse = new Map();
    for (const e of (data ?? []) as any[]) {
      if (e.horse_id == null) continue;
      if (e.post_number != null) postToHorse.set(e.post_number, e.horse_id);
      if (e.id != null) entryToHorse.set(e.id, e.horse_id);
    }
  }

  return {
    async getRaceResult(raceId: string): Promise<RaceResult> {
      const { data: results, error } = await supabase
        .from("race_results")
        .select("finish_position, race_entries(horse_id, odds)")
        .eq("race_id", raceId);
      if (error) throw error;
      const winnerHorseIds: string[] = [];
      const top3HorseIds: string[] = [];
      const winOddsByHorseId: Record<string, number> = {};
      for (const r of (results ?? []) as any[]) {
        const e = r.race_entries;
        if (!e?.horse_id) continue;
        if (e.odds != null) winOddsByHorseId[e.horse_id] = e.odds;
        if (r.finish_position === 1) winnerHorseIds.push(e.horse_id);
        if (r.finish_position != null && r.finish_position <= 3) top3HorseIds.push(e.horse_id);
      }
      return {
        winnerHorseIds,
        top3HorseIds,
        winOddsByHorseId,
        voided: (results?.length ?? 0) === 0,
      };
    },

    async getPredictionsForRating(raceId: string): Promise<RatingPredictionInput[]> {
      await loadEntryMaps(raceId);
      const out: RatingPredictionInput[] = [];

      // --- ユーザー（votes + vote_picks） ---
      const { data: votes, error: vErr } = await supabase
        .from("votes")
        .select("id, user_id, rating_applied, vote_picks(pick_type, race_entry_id)")
        .eq("race_id", raceId);
      if (vErr) throw vErr;
      for (const v of (votes ?? []) as any[]) {
        const picks = (v.vote_picks ?? []) as { pick_type: string; race_entry_id: string }[];
        const win = picks.find((p) => p.pick_type === "win");
        const place = picks.find((p) => p.pick_type === "place");
        const backs = picks.filter((p) => p.pick_type === "back");
        const dangers = picks.filter((p) => p.pick_type === "danger");
        out.push({
          predId: v.id,
          predictorKey: keyOf("user", v.user_id),
          applied: v.rating_applied ?? false,
          prediction: {
            honmeiHorseId: win ? entryToHorse.get(win.race_entry_id) ?? "" : "",
            taikoHorseId: place ? entryToHorse.get(place.race_entry_id) ?? null : null,
            renkaHorseIds: backs
              .map((b) => entryToHorse.get(b.race_entry_id))
              .filter(Boolean) as string[],
            dangerHorseIds: dangers
              .map((d) => entryToHorse.get(d.race_entry_id))
              .filter(Boolean) as string[],
          },
        });
        tableByPredId.set(v.id, "votes");
      }

      // --- AI（ai_predictions） ---
      const { data: ais, error: aErr } = await supabase
        .from("ai_predictions")
        .select("id, predictor_id, umaban, taikou_umaban, tanpou_umaban, osae_umaban, rating_applied")
        .eq("race_id", raceId);
      if (aErr) throw aErr;
      for (const a of (ais ?? []) as any[]) {
        out.push({
          predId: a.id,
          predictorKey: keyOf("ai", a.predictor_id),
          applied: a.rating_applied ?? false,
          prediction: {
            honmeiHorseId: a.umaban != null ? postToHorse.get(a.umaban) ?? "" : "",
            taikoHorseId: a.taikou_umaban != null ? postToHorse.get(a.taikou_umaban) ?? null : null,
            tananaHorseId: a.tanpou_umaban != null ? postToHorse.get(a.tanpou_umaban) ?? null : null,
            renkaHorseIds:
              a.osae_umaban != null ? ([postToHorse.get(a.osae_umaban)].filter(Boolean) as string[]) : [],
          },
        });
        tableByPredId.set(a.id, "ai_predictions");
      }

      return out;
    },

    async savePredictionScores(rows: ScoredPredictionRow[]): Promise<void> {
      for (const r of rows) {
        const table = tableByPredId.get(r.predId);
        if (!table) continue;
        const { error } = await supabase
          .from(table)
          .update({ rating_score: r.score, rating_voided: r.voided })
          .eq("id", r.predId);
        if (error) throw error;
      }
    },

    async getRatingStates(keys: PredictorKey[]): Promise<Map<PredictorKey, RatingState>> {
      const map = new Map<PredictorKey, RatingState>();
      if (keys.length === 0) return map;
      const ids = keys.map((k) => parseKey(k).id);
      const { data, error } = await supabase
        .from("predictor_ratings")
        .select("predictor_type, predictor_id, m, n")
        .in("predictor_id", ids);
      if (error) throw error;
      for (const row of (data ?? []) as any[]) {
        map.set(keyOf(row.predictor_type, row.predictor_id), { m: row.m, n: row.n });
      }
      return map;
    },

    async saveRatingStates(states: RatingStateUpsert[]): Promise<void> {
      if (states.length === 0) return;
      const rows = states.map((s) => {
        const { type, id } = parseKey(s.predictorKey);
        return {
          predictor_type: type,
          predictor_id: id,
          m: s.m,
          n: s.n,
          rating: s.value,
          provisional: s.provisional,
          updated_at: new Date().toISOString(),
        };
      });
      const { error } = await supabase
        .from("predictor_ratings")
        .upsert(rows, { onConflict: "predictor_type,predictor_id" });
      if (error) throw error;
    },

    async markApplied(predIds: string[]): Promise<void> {
      const byTable: Record<Table, string[]> = { votes: [], ai_predictions: [] };
      for (const id of predIds) {
        const t = tableByPredId.get(id);
        if (t) byTable[t].push(id);
      }
      for (const table of ["votes", "ai_predictions"] as Table[]) {
        if (byTable[table].length === 0) continue;
        const { error } = await supabase
          .from(table)
          .update({ rating_applied: true })
          .in("id", byTable[table]);
        if (error) throw error;
      }
    },

    async getOrderedScores(key: PredictorKey): Promise<number[]> {
      const { type, id } = parseKey(key);
      const table = type === "user" ? "votes" : "ai_predictions";
      const col = type === "user" ? "user_id" : "predictor_id";
      const { data, error } = await supabase
        .from(table)
        .select("rating_score")
        .eq(col, id)
        .eq("rating_applied", true)
        .not("rating_score", "is", null)
        .order("created_at", { ascending: true }); // 確定時刻の代理。厳密化が要れば races.post_time で order
      if (error) throw error;
      return (data ?? []).map((r: any) => r.rating_score as number);
    },
  };
}

/** settleRace の後段から呼ぶ用。 */
export async function settleRaceRatingWithSupabase(supabase: SupabaseClient, raceId: string) {
  return settleRaceRating(raceId, createSupabaseRatingDeps(supabase));
}

/** 結果修正後の修復用：1 predictor を履歴から再計算。 */
export async function recomputePredictorWithSupabase(supabase: SupabaseClient, key: PredictorKey) {
  return recomputePredictor(key, createSupabaseRatingDeps(supabase));
}
