-- ユーザーハンドル（@user_id）追加
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS user_handle TEXT;

-- ユニーク制約
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_user_handle 
  ON profiles (user_handle) WHERE user_handle IS NOT NULL;

-- 既存ユーザーにデフォルトハンドルを生成（user_ + id先頭8文字）
UPDATE profiles 
SET user_handle = 'user_' || LEFT(id::text, 8)
WHERE user_handle IS NULL;
