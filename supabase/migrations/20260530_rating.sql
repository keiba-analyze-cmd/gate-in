-- supabase/migrations/20260530_rating.sql
-- フェーズ1-A: レーティング用スキーマ。
-- 大会ポイントの既存テーブル(votes / ai_predictions / contest_entries 等)の既存列・既存ロジックには手を入れない（純粋に列の追加のみ）。
-- predictor_id は text（人=uuid文字列 / AI='hayate'/'kazan'/... のスラッグ、ai_predictions.predictor_id と同型）。

-- 1) 人とAIを同じ盤に乗せる統合レート（アリーナのリーダーボード用）
create table if not exists predictor_ratings (
  predictor_type text not null check (predictor_type in ('user', 'ai')),
  predictor_id   text not null,                          -- user_id(uuid文字列) / ai_predictor_id(slug)
  m              double precision not null default 0,    -- 直近スコアの指数移動平均
  n              integer          not null default 0,    -- 採点済み予想数
  rating         double precision not null default 1500, -- 表示レート（materialized）
  provisional    boolean          not null default true, -- 暫定フラグ（n<30）
  updated_at     timestamptz      not null default now(),
  primary key (predictor_type, predictor_id)
);

-- リーダーボード（rating降順）
create index if not exists idx_predictor_ratings_rating
  on predictor_ratings (rating desc);

-- 2) 予想行にスコア・適用フラグを追加（冪等性の要）
--    votes（ユーザー予想）
alter table votes
  add column if not exists rating_score   double precision,
  add column if not exists rating_voided  boolean not null default false,
  add column if not exists rating_applied boolean not null default false;

--    ai_predictions（AI予想）
alter table ai_predictions
  add column if not exists rating_score   double precision,
  add column if not exists rating_voided  boolean not null default false,
  add column if not exists rating_applied boolean not null default false;

-- 3) 再計算（recomputePredictor）用：predictorごとに確定順でscoreを引くための索引
create index if not exists idx_votes_rating_applied   on votes (user_id) where rating_applied;
create index if not exists idx_ai_pred_rating_applied on ai_predictions (predictor_id) where rating_applied;
