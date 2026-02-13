# DBバックアップ戦略

## Supabase Pro プラン: 毎日自動バックアップ / 7日保持 / PITR対応
## 手動: pg_dump "$SUPABASE_DB_URL" --format=custom --file=backup_$(date +%Y%m%d).dump
## 復元: pg_restore --dbname="$TARGET_DB_URL" --no-owner --clean backup.dump

## チェックリスト
- [ ] Pro プラン有効化
- [ ] PITR 有効化確認
- [ ] 復元テスト実施
