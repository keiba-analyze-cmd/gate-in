-- supabase/migrations/20260219_create_push_tokens.sql
-- プッシュ通知トークン管理テーブル

CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 同じユーザー・同じトークンの重複を防ぐ
  UNIQUE(user_id, token)
);

-- インデックス
CREATE INDEX idx_push_tokens_user_id ON push_tokens(user_id);
CREATE INDEX idx_push_tokens_token ON push_tokens(token);

-- RLS（Row Level Security）
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のトークンのみ操作可能
CREATE POLICY "Users can manage own tokens" ON push_tokens
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service Role は全てのトークンにアクセス可能（通知送信用）
CREATE POLICY "Service role can access all tokens" ON push_tokens
  FOR ALL
  USING (auth.role() = 'service_role');

-- コメント
COMMENT ON TABLE push_tokens IS 'FCMプッシュ通知トークン';
COMMENT ON COLUMN push_tokens.token IS 'Firebase Cloud Messaging トークン';
