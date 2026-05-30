# ゲートイン！ — プロジェクト指針 (CLAUDE.md)

> このファイルは Claude Code が毎セッション読む。方針・規約・現在地を把握してから作業すること。

## プロジェクト概要
競馬予想SNS「ゲートイン！」(gate-in.jp)。ユーザーが◎○▲△を投稿し、5体のAI予想家（ハヤテ/カザン/ハクセン/ヒバリ/ガンテツ）と競う。
北極星 = **WAU-voters**（週に1回以上投票したアクティブユーザー）。

## 技術スタック
Next.js (App Router) / Tailwind CSS v4 / Supabase (PostgreSQL) / Vercel。
データ: JRDB（KYG/SEC/UKC）・netkeiba・microCMS。AIコメント生成は Claude API。

## 🎯 現在の方針（最重要）— 「実力主義のアリーナ」転換
「予想できるSNS」→ **「予想の上手さが“検証可能”に証明される場所」** へ。
背骨は **検証可能なレーティング**。これを軸にUI・機能の優先順位を決める。
全体計画は `docs/TASKLIST-arena-pivot.md`（フェーズ1〜5）。

## 📚 主要ドキュメント（作業前に該当を読む）
- `docs/TASKLIST-arena-pivot.md` — 全体計画と各フェーズの完了条件
- `docs/rating-spec.md` — レーティング仕様（スコア式・収縮平均・校正・棲み分け）
- `docs/settle-race-integration.md` — settle-raceへの統合（共存・冪等）
- `docs/design-system.md` — デザインシステムA（トークン・部品・適用方針）
- 実装: `src/lib/rating/{rating.ts, settle.ts, rating.test.ts}` / `src/app/theme.css` / `migrations/`

## ⚠️ コーディング規約・既知の落とし穴
- Supabaseは **`createClient` from `@/lib/supabase/server`** を使う。`createServerClient` は**存在しない**。
- スクリプトは **`.mjs`** で書く。zsh の inline `node -e` は `!` で落ちるため使わない。`scripts/jrdb/` に置く。
- Node: Vercel=20 / ローカル=24（nvm管理）。`.npmrc` は `legacy-peer-deps=true`。
- JRDB ファイルは `./jrdb-data/lzh/` に置く（`./jrdb-data/` 直下ではない）。`bulk-download.mjs` は既存ファイルをスキップするので、更新データは `.lzh` を消してから再取得。
- JRDB フィールド位置: KYG テン359/上がり369/位置374。SEC 着順141/オッズ175/人気181/斤量333（レコード長344）。UKC 馬名9（レコード長290）。

## 🔒 レーティングの不変条件（壊すと検証可能性が崩壊）
- 確定後の予想は **削除・編集不可**。
- 各予想に `rating_score` を保存し、履歴から冪等に再計算できること。
- settle-race は**全レース**にレートを適用。大会ポイントは**大会レースのみ**（別系統・共存。既存ポイント式は触らない）。
- 再実行で二重加算しないこと（`rating_applied` フラグで防ぐ。`recomputePredictor` で修復）。

## 🎨 デザインシステム
- トークンは `src/app/theme.css`（意味ベース・ライト/ダーク両対応）。直書きの色を撤去。
- 色は意味で: 緑=主役/GO、ゴールド=**G1・賞金のみ**、赤=締切/危険/外し。キャラ色はアバター/ドット専用。
- **紫グラデ禁止**。ヒーローは1画面1つ。フォント = M PLUS Rounded 1c（数値は Roboto Mono）。
- 共通 `.card` を使い、ページごとに作り直さない。
- BottomNav = ホーム / レース / ⊕予想(中央FAB) / アリーナ / マイページ。
- **触らないページ**: 道場系・マイページ副ページ（統合/廃止予定）。無駄打ち禁止。

## 🧪 テスト/実行
- 単体テスト: `npx vitest run src/lib/rating`
- レート校正: `node scripts/jrdb/calibrate-rating.mjs`（要 SUPABASE_URL / SERVICE_ROLE_KEY）

## 📍 現在地と次のタスク
- フェーズ1（レート中核）: `rating.ts` / `settle.ts` 実装・テスト済み（11件＋冪等検証パス）。
- **次**: フェーズ1-A — `migrations/2026xxxx_rating.sql` 適用 → `SettleRatingDeps` を実スキーマで実装 → settle-race に `settleRaceRating` を差し込み → 過去レースをバックフィル。
- 着手前に確認が要る点（`docs/settle-race-integration.md` 末尾）:
  1. 現状のポイント付与は全レース？大会のみ？（全レースなら大会限定にスコープ）
  2. `votes` の列名（レース参照・◎○▲△・危険馬・確定/発走時刻）
  3. `ai_predictions` の列名・predictor識別子の型
  4. 確定結果（着順・確定単勝オッズ・3着内）の取得元
