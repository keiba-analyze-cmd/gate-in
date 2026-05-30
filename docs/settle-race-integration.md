# settle-race レーティング統合 設計書

## 📅 2026-05-30 ／ フェーズ1-A

関連: `src/lib/rating/rating.ts`, `src/lib/rating/settle.ts`, `migrations/2026xxxx_rating.sql`

---

## 🧭 結論：置き換えず「共存」。settle-race を“結果1回→精算ハンドラ複数”に

レート（恒久・下がる・全レース）と 大会ポイント（週次・加算・大会のみ）は役割も数学も逆。
混ぜると週次のお祭り性と恒久の実力指標が両方壊れる。だから **別系統で共存**させる。

settle-race の構造を、確定結果を1回作ってから独立ハンドラを順に当てる形にする：

```
settleRace(raceId):
  result = buildRaceResult(raceId)        // 勝ち馬・3着内・確定オッズ。ここで1回だけ

  // ① レーティング：全レース・全予想（人＋AI）
  await settleRaceRating(raceId, ratingDeps)

  // ② 大会ポイント：大会レースのみ（既存ロジックは触らない）
  if (isContestRace(raceId)) await awardContestPoints(raceId, result)

  // ③ その他（連勝・バッジ・通知など、既存のまま）
```

- **既存のポイント計算式は変更しない。** 役割が違うので式が違っていてよい（人気薄爆発はお祭りとして維持）。
- ただし **ポイント付与が「全レース」に走っているなら大会レースのみに限定**する（要確認・後述）。

---

## 🔒 冪等性（settle-race 再実行で二重加算しない）

レートの収縮平均は経路依存なので、ここが正しさの肝。検証済みの設計：

- **権威データ = 各予想に保存する `rating_score`（確定後は不変）。**
- レート状態 `predictor_ratings(m, n, rating)` は **そこから再計算できる派生値**。
- `settleRaceRating` は：
  1. 各予想の score を計算して書き戻す（同値の再書き込みは無害）
  2. **`rating_applied=false` かつ非void の予想だけ**をレートに前進させ、`applied=true` を立てる
  → 再実行すると未適用が無くなっているので**二重加算されない**（検証済み）。
- **修復・校正変更時**は `recomputePredictor(key)` で履歴の score 列から完全再計算（経路依存でも正しく復元）。

---

## 🗄 スキーマ（`migrations/2026xxxx_rating.sql`）

- `predictor_ratings`：**人とAIを同一テーブル**（`predictor_type` + `predictor_id`）。
  アリーナのリーダーボードは `select ... order by rating desc` 一発。
- `votes` / `ai_predictions` に `rating_score` / `rating_voided` / `rating_applied` を追加。

---

## 🔌 adapter（`SettleRatingDeps`）に埋める対応表

`settle.ts` 本体はスキーマ非依存。以下を自分のテーブルに合わせて実装する：

| メソッド | やること |
|---|---|
| `getRaceResult` | 確定結果を `{winnerHorseIds, top3HorseIds, winOddsByHorseId, voided}` で返す（JRDB SEC: 着順pos141/オッズpos175） |
| `getPredictionsForRating` | `votes` と `ai_predictions` を**両方**集めて統合キー(`user:` / `ai:`)で返す。`applied` は現在値 |
| `savePredictionScores` | `rating_score/voided/hit` を各行へ書き戻し |
| `getRatingStates` / `saveRatingStates` | `predictor_ratings` の読み書き（バッチ） |
| `markApplied` | `rating_applied=true` をバッチで |
| `getOrderedScores` | 再計算用。非voidの `rating_score` を**確定順**（発走/確定時刻→predId）で |

`createServerClient` は無いので `createClient`（`@/lib/supabase/server`）を使用。

---

## ⚡ パフォーマンス

- 結果取得はレース1回。状態の読み書きはレース内の predictor をまとめてバッチ。
- `predictor_ratings (rating desc)` 索引でリーダーボードは軽量。

---

## 🔁 バックフィル（既存の人・AIの過去予想からレート初期化）

確定済みレースを**時系列順**に `settleRaceRating` で流すか、predictorごとに
`getOrderedScores` → `recomputePredictor` を回す。`ai_predictions` は ROI補完済みなので
AIのレートもそのまま埋まる。完了後、アリーナに人とAIが同じ盤で並ぶ。

---

## ❓ 着手前に確認したいこと（これが分かれば実コードまで書けます）

1. **現状のポイント付与は全レース？それとも大会のみ？**（全レースなら大会限定にスコープする）
2. `votes` の列名：レース参照・◎○▲△・危険馬・確定/発走時刻はどの列か。
3. `ai_predictions` の列名：predictor識別子の型（uuid? slug?）・◎などの列。
4. 確定結果はどのテーブル/列から取れるか（着順・確定単勝オッズ・3着内）。

---

## ✅ フェーズ1-A 完了条件

- [ ] `migrations/2026xxxx_rating.sql` 適用
- [ ] `SettleRatingDeps` を実スキーマで実装
- [ ] settle-race の確定後に `settleRaceRating` を差し込み（ポイントは大会のみに分離）
- [ ] 同一レース2回 settle で二重加算しないことを本番データで確認
- [ ] 過去レースをバックフィルし、人・AIのレートを初期化
