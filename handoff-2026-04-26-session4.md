# ゲートイン！ 引き継ぎドキュメント

## 📅 最終更新: 2026-04-26 (セッション4)

---

## ✅ 本セッションで完了した作業

### 1. JRDB統合パイプライン (Group A: 3タスクを1つに統合)

一括DL + パーサー + Supabaseインポートを統合パイプラインとして構築。

| ファイル | 内容 |
|---------|------|
| `scripts/jrdb/pipeline.mjs` | 統合CLI: download / import / aggregate / all / weekly |
| `scripts/jrdb/bulk-download.mjs` | 7年分(2019-2026)一括DL。LZH自動解凍。レート制限付き |
| `scripts/jrdb/parsers.mjs` | KYG/SEC/UKC/BAB 全パーサーを1ファイルに統合 |
| `scripts/jrdb/supabase-import.mjs` | バッチupsert。KYG→jrdb_race_entries, SEC→jrdb_race_results, UKC→jrdb_horses |

#### パーサー仕様

| ファイル | レコード長 | 主要フィールド |
|---------|-----------|---------------|
| KYG | 543byte | race_key, umaban, horse_code, horse_name, IDM, jockey_index, composite_index, base_odds, base_popularity, ten_index, agari_index, position_index |
| SEC | 342byte | race_key, umaban, finish_position, odds, popularity, agari_3f, weight, weight_diff |
| UKC | 290byte | horse_code, horse_name, sire_name, dam_sire_name, sire_lineage_code, dam_lineage_code |

#### 使い方
```bash
# 全自動 (DL → インポート → 集計)
node scripts/jrdb/pipeline.mjs all --from 2019-01-01

# 週次 (今週分のみ)
node scripts/jrdb/pipeline.mjs weekly

# UKCのみインポート
node scripts/jrdb/pipeline.mjs import --type ukc
```

### 2. DBマイグレーション (Group B: 全テーブルを1 SQLに統合)

`sql/migration-bloodline-and-columns.sql` に以下を統合:

| テーブル/関数 | 用途 |
|-------------|------|
| `jrdb_horses` | 馬基本データ（血統: 父、母父、系統コード） |
| `jrdb_race_results` | レース成績（着順、オッズ、上がり3F） |
| `sire_course_distance_stats` | 種牡馬×コース×距離の集計（ハクセン用） |
| `ai_columns` | AIコラム（preview/review） |
| `refresh_sire_course_distance_stats()` | 集計テーブル再計算RPC |
| `get_sire_ranking_for_conditions()` | 条件別種牡馬ランキング取得 |
| `latest_ai_columns` ビュー | 各予想家の最新コラム |
| RLSポリシー | 読み取り: 全ユーザー、書き込み: service_role |

### 3. AIコラムシステム (Group C: 生成+API+表示を統合)

| ファイル | 内容 |
|---------|------|
| `scripts/generate-ai-columns.mjs` | 手動コラム生成（preview/review/auto） |
| `src/app/api/cron/generate-columns/route.ts` | Cron API（金土月に自動実行） |
| `src/app/api/ai-columns/route.ts` | コラム取得API（latest, predictor_id, typeフィルター） |
| `src/components/predictors/AIColumnCard.tsx` | 表示コンポーネント3種: カード/フル/セクション |

#### コラム生成スケジュール
| 曜日 | JST | 生成内容 |
|------|-----|---------|
| 金曜 | 20:00 | 土曜分プレビュー（ハヤテ、カザン、ハクセン、ガンテツ） |
| 土曜 | 20:00 | 日曜分プレビュー（同上4体） |
| 月曜 | 20:00 | 日曜分振り返り（ヒバリ） |

---

## 📋 次回セッションでやるべきこと

### 最優先
1. **JRDB URLパターン確認** — 会員ページでDL URLを確認し、bulk-download.mjs のURLを修正
2. **実際にDL実行** — `node pipeline.mjs download --year 2025` でテスト
3. **マイグレーション実行** — SQLをSupabaseで実行
4. **デプロイ** — feature/ai-predictors → main マージ + 本番デプロイ

### 次の段階
5. **race_key ↔ race.id マッピング** — JRDBレースキーとgate-inのレースIDの紐付け
6. **コラム生成テスト** — `node generate-ai-columns.mjs preview --date 2026-04-27`
7. **TikTok集客戦略**

---

## ⚠️ 注意事項

### JRDB URL
`bulk-download.mjs` のURLパターンは推定値。実際のJRDB会員ページのリンク構造を確認して調整が必要。

### パーサーのバイト位置
KYG/SEC/UKCのレコード長とフィールド位置は、前回セッションのバックテストで検証済みの値を使用。ただし、JRDB仕様書のバージョンにより微妙にずれる可能性あり。初回インポート時に数件目視確認推奨。

### ai_columns UNIQUE制約
`SETUP.md` に記載のUNIQUE制約を追加する必要あり（upsertのonConflictで使用）。

### 環境変数
Vercelに `ANTHROPIC_API_KEY` の追加が必要（コラム生成Cron用）。
