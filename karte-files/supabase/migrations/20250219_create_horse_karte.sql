-- 馬カルテ機能用のマイグレーション
-- 実行日: 2025-02-19

-- =============================================
-- 1. horse_karte テーブル（馬カルテ・振り返り結果）
-- =============================================
CREATE TABLE IF NOT EXISTS horse_karte (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  horse_id UUID NOT NULL REFERENCES horses(id) ON DELETE CASCADE,
  vote_pick_id UUID REFERENCES vote_picks(id) ON DELETE SET NULL,
  race_id UUID REFERENCES races(id) ON DELETE SET NULL,
  
  -- 予想時の情報
  mark TEXT NOT NULL CHECK (mark IN ('◎', '○', '▲', '△', '×')),
  
  -- レース結果情報
  popularity INTEGER,          -- 人気
  odds DECIMAL(10, 2),         -- 単勝オッズ
  result_position INTEGER,     -- 着順
  time_diff TEXT,              -- タイム差（例: '+0.3', '-'）
  
  -- 振り返り結果
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'tracking', 'dismissed')),
  -- pending: 未判断
  -- tracking: 次も買う（追跡中）
  -- dismissed: 見限る
  
  memo TEXT,                   -- 次走へのメモ
  
  -- 統計用
  is_hit BOOLEAN DEFAULT FALSE, -- 的中したか
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  decided_at TIMESTAMPTZ,      -- 判断した日時
  
  -- 同じユーザー・同じ馬・同じレースの組み合わせはユニーク
  UNIQUE(user_id, horse_id, race_id)
);

-- インデックス
CREATE INDEX idx_horse_karte_user_id ON horse_karte(user_id);
CREATE INDEX idx_horse_karte_horse_id ON horse_karte(horse_id);
CREATE INDEX idx_horse_karte_status ON horse_karte(status);
CREATE INDEX idx_horse_karte_user_status ON horse_karte(user_id, status);
CREATE INDEX idx_horse_karte_created_at ON horse_karte(created_at DESC);

-- RLS有効化
ALTER TABLE horse_karte ENABLE ROW LEVEL SECURITY;

-- RLSポリシー: ユーザーは自分のカルテのみ操作可能
CREATE POLICY "Users can view own karte"
  ON horse_karte FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own karte"
  ON horse_karte FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own karte"
  ON horse_karte FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own karte"
  ON horse_karte FOR DELETE
  USING (auth.uid() = user_id);


-- =============================================
-- 2. tracked_horses ビュー（追跡中の馬一覧）
-- =============================================
CREATE OR REPLACE VIEW tracked_horses_view AS
SELECT 
  hk.id AS karte_id,
  hk.user_id,
  hk.horse_id,
  h.name AS horse_name,
  hk.mark,
  hk.memo,
  hk.status,
  hk.updated_at,
  -- 直近のレース情報
  r.id AS last_race_id,
  r.name AS last_race_name,
  r.race_date AS last_race_date,
  hk.popularity AS last_popularity,
  hk.odds AS last_odds,
  hk.result_position AS last_result,
  hk.time_diff AS last_time_diff,
  -- 次走情報（race_entriesから取得）
  next_race.id AS next_race_id,
  next_race.name AS next_race_name,
  next_race.race_date AS next_race_date,
  next_race.post_time AS next_race_time
FROM horse_karte hk
JOIN horses h ON h.id = hk.horse_id
LEFT JOIN races r ON r.id = hk.race_id
-- 次走を取得（今日以降で最も近いレース）
LEFT JOIN LATERAL (
  SELECT re.race_id, ra.id, ra.name, ra.race_date, ra.post_time
  FROM race_entries re
  JOIN races ra ON ra.id = re.race_id
  WHERE re.horse_id = hk.horse_id
    AND ra.race_date >= CURRENT_DATE
  ORDER BY ra.race_date, ra.post_time
  LIMIT 1
) next_race ON TRUE
WHERE hk.status = 'tracking';


-- =============================================
-- 3. user_horse_stats ビュー（ユーザーの馬別成績）
-- =============================================
CREATE OR REPLACE VIEW user_horse_stats AS
SELECT 
  user_id,
  horse_id,
  COUNT(*) AS total_votes,
  COUNT(*) FILTER (WHERE is_hit = TRUE) AS hits,
  ROUND(
    COUNT(*) FILTER (WHERE is_hit = TRUE)::DECIMAL / NULLIF(COUNT(*), 0) * 100,
    1
  ) AS hit_rate
FROM horse_karte
GROUP BY user_id, horse_id;


-- =============================================
-- 4. votesテーブルに公開設定カラムを追加
-- =============================================
ALTER TABLE votes 
ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'public' 
CHECK (visibility IN ('public', 'private', 'group'));

-- グループID（将来のグループ機能用）
ALTER TABLE votes 
ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES groups(id) ON DELETE SET NULL;

-- 予想理由メモ
ALTER TABLE votes 
ADD COLUMN IF NOT EXISTS memo TEXT;


-- =============================================
-- 5. updated_at の自動更新トリガー
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_horse_karte_updated_at
  BEFORE UPDATE ON horse_karte
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
