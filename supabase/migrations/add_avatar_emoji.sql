-- アバター絵文字カラム追加
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_emoji TEXT DEFAULT '🏇';
