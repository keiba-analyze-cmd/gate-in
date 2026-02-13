-- プロフィール拡充: デモグラフィック情報
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS age_group TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS horse_racing_exp TEXT DEFAULT 'beginner';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS favorite_course TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT false;
