-- 週間予想大会対応

-- 1. contests テーブル拡張
ALTER TABLE contests ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'monthly';
ALTER TABLE contests ADD COLUMN IF NOT EXISTS week_start DATE;
ALTER TABLE contests ADD COLUMN IF NOT EXISTS week_end DATE;
ALTER TABLE contests ADD COLUMN IF NOT EXISTS prize_1st INTEGER DEFAULT 5000;
ALTER TABLE contests ADD COLUMN IF NOT EXISTS prize_2nd INTEGER DEFAULT 3000;
ALTER TABLE contests ADD COLUMN IF NOT EXISTS prize_3rd INTEGER DEFAULT 2000;

-- 2. contest_entries テーブル拡張
ALTER TABLE contest_entries ADD COLUMN IF NOT EXISTS hit_race_count INTEGER DEFAULT 0;
ALTER TABLE contest_entries ADD COLUMN IF NOT EXISTS streak_bonus INTEGER DEFAULT 0;
ALTER TABLE contest_entries ADD COLUMN IF NOT EXISTS earliest_vote_at TIMESTAMPTZ;

-- 3. contest_races テーブル新規作成
CREATE TABLE IF NOT EXISTS contest_races (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contest_id UUID REFERENCES contests(id) ON DELETE CASCADE NOT NULL,
  race_id UUID REFERENCES races(id) ON DELETE CASCADE NOT NULL,
  race_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(contest_id, race_id)
);

CREATE INDEX IF NOT EXISTS idx_contest_races_contest ON contest_races(contest_id);
CREATE INDEX IF NOT EXISTS idx_contest_entries_ranking
  ON contest_entries(contest_id, total_points DESC, hit_race_count DESC, earliest_vote_at ASC);
