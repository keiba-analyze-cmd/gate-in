# 配置マップ (PLACEMENT)

この `gate-in/` を、実リポジトリのルートに重ねて展開してください。各パスは既存構成に合わせて調整可。

## 配置一覧

| パス | 種別 | 目的 / 注意 |
|------|------|-------------|
| `CLAUDE.md` | リポ直下 | Claude Code が毎セッション読む方針・規約・現在地 |
| `docs/TASKLIST-arena-pivot.md` | ドキュメント | 全体計画（フェーズ1〜5・完了条件） |
| `docs/rating-spec.md` | ドキュメント | レーティング仕様（実装の根拠） |
| `docs/settle-race-integration.md` | ドキュメント | settle-race統合（共存・冪等・要確認4点） |
| `docs/design-system.md` | ドキュメント | デザインシステムA（トークン・部品・適用方針） |
| `docs/design/styleguide.html` | 参照のみ | デザインシステムの描画版（ブラウザで開く） |
| `docs/design/top-redesign-AB.html` | 参照のみ | トップ A/B 比較モック |
| `docs/design/top-layouts-A.html` | 参照のみ | トップ レイアウト3案 |
| `docs/design/arena.html` | 参照のみ | アリーナ（TL×ランキング統合）モック |
| `src/lib/rating/rating.ts` | 実装 | レート中核（純関数）。テスト済み |
| `src/lib/rating/settle.ts` | 実装 | settle-race用の精算（adapter方式）。冪等 |
| `src/lib/rating/rating.test.ts` | テスト | `npx vitest run src/lib/rating` |
| `src/app/theme.css` | 実装 | Tailwind v4 トークン |
| `migrations/2026xxxx_rating.sql` | DB | predictor_ratings + 各予想テーブルへのスコア列 |
| `scripts/jrdb/calibrate-rating.mjs` | スクリプト | b・scale 校正（取得部はスキーマに合わせ実装） |

## 配線メモ（展開後にやること）

1. **theme.css** … `src/app/globals.css` の冒頭で取り込む（または globals.css に内容を統合）。旧来の色直書き・紫を撤去。
2. **migration** … `migrations/2026xxxx_rating.sql` のファイル名を採番し直して適用。列の型（user_id / ai_predictor_id）は自分のスキーマに合わせる。
3. **settle.ts の adapter** … `SettleRatingDeps` を実テーブル（`votes` / `ai_predictions` / 確定結果）で実装し、settle-race の確定後に `settleRaceRating` を差し込む。
4. **docs/design/** … 参照専用。アプリには含めない（ビルド対象外でよい）。
5. フォント … `M PLUS Rounded 1c` / `Roboto Mono` を読み込む（next/font 推奨）。

詳細・次タスクは `CLAUDE.md` と `docs/` を参照。
