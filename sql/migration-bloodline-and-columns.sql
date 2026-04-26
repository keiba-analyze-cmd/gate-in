-- =====================================================
-- ゲートイン！ 血統 + AIコラム マイグレーション
-- 実行: Supabase SQL Editor にコピペ
-- =====================================================

-- ─── 1. 馬基本データ (UKC由来) ──────────────────────────
CREATE TABLE IF NOT EXISTS jrdb_horses (
  horse_code TEXT PRIMARY KEY,
  horse_name TEXT,
  sex_code TEXT,                      -- 1牡 2牝 3セ
  sire_name TEXT,                     -- 父馬名 ★
  dam_sire_name TEXT,                 -- 母父馬名 ★
  sire_lineage_code TEXT,            -- 父系統コード
  dam_lineage_code TEXT,             -- 母系統コード
  trainer_name TEXT,
  birth_year INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_jrdb_horses_sire ON jrdb_horses(sire_name);
CREATE INDEX IF NOT EXISTS idx_jrdb_horses_dam_sire ON jrdb_horses(dam_sire_name);
CREATE INDEX IF NOT EXISTS idx_jrdb_horses_lineage ON jrdb_horses(sire_lineage_code);

-- ─── 2. レース成績データ (SEC由来) ──────────────────────
CREATE TABLE IF NOT EXISTS jrdb_race_results (
  race_key TEXT NOT NULL,
  umaban INTEGER NOT NULL,
  horse_code TEXT,
  finish_position INTEGER,
  abnormal_code TEXT,
  odds NUMERIC(8,1),
  popularity INTEGER,
  agari_3f NUMERIC(4,1),
  weight INTEGER,
  weight_diff INTEGER,
  idm NUMERIC(6,1),
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (race_key, umaban)
);

CREATE INDEX IF NOT EXISTS idx_jrdb_results_horse ON jrdb_race_results(horse_code);
CREATE INDEX IF NOT EXISTS idx_jrdb_results_position ON jrdb_race_results(finish_position);

-- ─── 3. jrdb_race_entries にカラム追加 (既存テーブル) ────
-- horse_code が無い場合のみ追加
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jrdb_race_entries' AND column_name = 'horse_code'
  ) THEN
    ALTER TABLE jrdb_race_entries ADD COLUMN horse_code TEXT;
  END IF;
END $$;

-- ─── 4. 種牡馬×コース×距離 集計テーブル ─────────────────
CREATE TABLE IF NOT EXISTS sire_course_distance_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sire_name TEXT NOT NULL,
  course_code TEXT NOT NULL,           -- 場コード(01-10)
  distance INTEGER NOT NULL,           -- 距離(m)
  track_type TEXT,                     -- 芝/ダート
  runs INTEGER DEFAULT 0,              -- 出走数
  wins INTEGER DEFAULT 0,              -- 1着数
  place_count INTEGER DEFAULT 0,       -- 3着内数
  show_count INTEGER DEFAULT 0,        -- 5着内数
  win_rate NUMERIC(5,3),
  place_rate NUMERIC(5,3),
  avg_finish NUMERIC(5,2),
  avg_odds NUMERIC(8,1),               -- 平均オッズ
  roi_win NUMERIC(6,1),                -- 単勝回収率
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(sire_name, course_code, distance, track_type)
);

CREATE INDEX IF NOT EXISTS idx_sire_stats_sire ON sire_course_distance_stats(sire_name);
CREATE INDEX IF NOT EXISTS idx_sire_stats_course ON sire_course_distance_stats(course_code, distance);

-- ─── 5. 集計関数 (RPC) ─────────────────────────────────
CREATE OR REPLACE FUNCTION refresh_sire_course_distance_stats()
RETURNS void AS $$
BEGIN
  -- 一旦クリアして再集計
  TRUNCATE sire_course_distance_stats;

  INSERT INTO sire_course_distance_stats (
    sire_name, course_code, distance, track_type,
    runs, wins, place_count, show_count,
    win_rate, place_rate, avg_finish, avg_odds, roi_win
  )
  SELECT
    h.sire_name,
    SUBSTRING(e.race_key FROM 1 FOR 2) AS course_code,
    COALESCE(
      -- BABからdistanceが取れない場合はrace_keyから推定不可なのでNULL
      -- → jrdb_race_entriesにdistanceカラムがあればそちらを使う
      0
    ) AS distance,
    '' AS track_type,
    COUNT(*) AS runs,
    COUNT(*) FILTER (WHERE r.finish_position = 1) AS wins,
    COUNT(*) FILTER (WHERE r.finish_position <= 3) AS place_count,
    COUNT(*) FILTER (WHERE r.finish_position <= 5) AS show_count,
    ROUND(COUNT(*) FILTER (WHERE r.finish_position = 1)::numeric / NULLIF(COUNT(*), 0), 3) AS win_rate,
    ROUND(COUNT(*) FILTER (WHERE r.finish_position <= 3)::numeric / NULLIF(COUNT(*), 0), 3) AS place_rate,
    ROUND(AVG(r.finish_position)::numeric, 2) AS avg_finish,
    ROUND(AVG(r.odds)::numeric, 1) AS avg_odds,
    ROUND(
      SUM(CASE WHEN r.finish_position = 1 THEN r.odds ELSE 0 END)::numeric / NULLIF(COUNT(*), 0) * 100,
      1
    ) AS roi_win
  FROM jrdb_race_entries e
  JOIN jrdb_horses h ON e.horse_code = h.horse_code
  JOIN jrdb_race_results r ON e.race_key = r.race_key AND e.umaban = r.umaban
  WHERE h.sire_name IS NOT NULL
    AND h.sire_name != ''
    AND r.finish_position IS NOT NULL
    AND r.finish_position > 0
    AND (r.abnormal_code IS NULL OR r.abnormal_code = '0')
  GROUP BY h.sire_name, SUBSTRING(e.race_key FROM 1 FOR 2)
  HAVING COUNT(*) >= 5;  -- 最低5走以上

  -- updated_at を更新
  UPDATE sire_course_distance_stats SET updated_at = now();
END;
$$ LANGUAGE plpgsql;

-- ─── 6. ハクセン用: 種牡馬ランキング取得関数 ────────────
CREATE OR REPLACE FUNCTION get_sire_ranking_for_conditions(
  p_course_code TEXT DEFAULT NULL,
  p_distance INTEGER DEFAULT NULL,
  p_min_runs INTEGER DEFAULT 10
)
RETURNS TABLE (
  sire_name TEXT,
  runs INTEGER,
  wins INTEGER,
  place_count INTEGER,
  win_rate NUMERIC,
  place_rate NUMERIC,
  roi_win NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.sire_name,
    s.runs,
    s.wins,
    s.place_count,
    s.win_rate,
    s.place_rate,
    s.roi_win
  FROM sire_course_distance_stats s
  WHERE (p_course_code IS NULL OR s.course_code = p_course_code)
    AND (p_distance IS NULL OR s.distance = p_distance)
    AND s.runs >= p_min_runs
  ORDER BY s.win_rate DESC, s.runs DESC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql;

-- ─── 7. AIコラムテーブル ────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_columns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  predictor_id TEXT NOT NULL REFERENCES ai_predictors(id),
  title TEXT NOT NULL,
  body TEXT NOT NULL,                  -- マークダウン形式
  column_type TEXT NOT NULL CHECK (column_type IN ('preview', 'review')),
    -- preview = 前日プレビュー, review = 振り返り
  target_date DATE NOT NULL,           -- 対象開催日
  race_ids TEXT[],                     -- 関連レースID (gate-in.jpのrace.id)
  jrdb_race_keys TEXT[],               -- 関連JRDBレースキー
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_columns_predictor ON ai_columns(predictor_id);
CREATE INDEX IF NOT EXISTS idx_ai_columns_date ON ai_columns(target_date DESC);
CREATE INDEX IF NOT EXISTS idx_ai_columns_type ON ai_columns(column_type);
CREATE INDEX IF NOT EXISTS idx_ai_columns_published ON ai_columns(published_at DESC);

-- ─── 8. RLS ポリシー ────────────────────────────────────
ALTER TABLE jrdb_horses ENABLE ROW LEVEL SECURITY;
ALTER TABLE jrdb_race_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE sire_course_distance_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_columns ENABLE ROW LEVEL SECURITY;

-- 全ユーザーが読み取り可能
CREATE POLICY "jrdb_horses_read" ON jrdb_horses FOR SELECT USING (true);
CREATE POLICY "jrdb_results_read" ON jrdb_race_results FOR SELECT USING (true);
CREATE POLICY "sire_stats_read" ON sire_course_distance_stats FOR SELECT USING (true);
CREATE POLICY "ai_columns_read" ON ai_columns FOR SELECT
  USING (published_at IS NOT NULL AND published_at <= now());

-- service_role のみ書き込み（Cron/管理用）
-- ※ supabase-js で service_role_key を使えばRLSをバイパス可能

-- ─── 9. ai_columns 用ビュー (最新コラム取得) ────────────
CREATE OR REPLACE VIEW latest_ai_columns AS
SELECT DISTINCT ON (predictor_id)
  id, predictor_id, title, body, column_type,
  target_date, published_at, created_at
FROM ai_columns
WHERE published_at IS NOT NULL AND published_at <= now()
ORDER BY predictor_id, published_at DESC;

-- ─── 完了 ───────────────────────────────────────────────
-- 実行後の確認:
-- SELECT count(*) FROM jrdb_horses;
-- SELECT count(*) FROM jrdb_race_results;
-- SELECT count(*) FROM sire_course_distance_stats;
-- SELECT count(*) FROM ai_columns;
