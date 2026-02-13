-- contest_entries に unique 制約追加（upsert用）
ALTER TABLE contest_entries
  ADD CONSTRAINT IF NOT EXISTS contest_entries_contest_user_unique
  UNIQUE (contest_id, user_id);

-- points_transactions に reason カラム追加
ALTER TABLE points_transactions
  ADD COLUMN IF NOT EXISTS reason TEXT;
