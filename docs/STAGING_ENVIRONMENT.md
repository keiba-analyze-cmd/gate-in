# ステージング環境

## ブランチ: main→本番 / develop→Preview / feature/*→PR Preview
## Vercel環境変数: Production と Preview で SUPABASE接続先を分離
## NEXT_PUBLIC_ENV=preview をPreview環境に設定

## チェックリスト
- [ ] develop ブランチ作成
- [ ] ステージング用 Supabase プロジェクト作成
- [ ] Vercel Preview 環境変数設定
- [ ] main Branch Protection 設定
