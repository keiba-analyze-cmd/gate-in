-- Phase E: パフォーマンス用インデックス
-- 既に存在する場合はスキップされます

-- 投票の検索高速化
CREATE INDEX IF NOT EXISTS idx_votes_race_id ON votes(race_id);
CREATE INDEX IF NOT EXISTS idx_votes_user_id ON votes(user_id);
CREATE INDEX IF NOT EXISTS idx_votes_status ON votes(status);
CREATE INDEX IF NOT EXISTS idx_votes_settled_at ON votes(settled_at DESC);

-- 投票詳細
CREATE INDEX IF NOT EXISTS idx_vote_picks_vote_id ON vote_picks(vote_id);
CREATE INDEX IF NOT EXISTS idx_vote_picks_race_entry_id ON vote_picks(race_entry_id);

-- コメント
CREATE INDEX IF NOT EXISTS idx_comments_race_id ON comments(race_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);

-- レース
CREATE INDEX IF NOT EXISTS idx_races_status ON races(status);
CREATE INDEX IF NOT EXISTS idx_races_race_date ON races(race_date DESC);
CREATE INDEX IF NOT EXISTS idx_race_entries_race_id ON race_entries(race_id);

-- フォロー
CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON follows(following_id);

-- ポイント履歴
CREATE INDEX IF NOT EXISTS idx_points_transactions_user_id ON points_transactions(user_id);

-- 通知
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_is_read ON notifications(user_id, is_read);

-- 大会エントリー
CREATE INDEX IF NOT EXISTS idx_contest_entries_contest_id ON contest_entries(contest_id);
CREATE INDEX IF NOT EXISTS idx_contest_entries_total_points ON contest_entries(total_points DESC);
