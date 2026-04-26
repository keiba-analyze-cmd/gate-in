# セットアップガイド

## 1. npm パッケージ追加

```bash
npm install iconv-lite
# node-fetch は Node 18+ なら不要（組み込みfetch使用可）
```

## 2. Supabase マイグレーション

`sql/migration-bloodline-and-columns.sql` を Supabase SQL Editor で実行。

作成されるテーブル:
- `jrdb_horses` — 馬基本データ（UKC由来、血統情報）
- `jrdb_race_results` — レース成績（SEC由来）
- `sire_course_distance_stats` — 種牡馬×コース×距離集計
- `ai_columns` — AIコラム

作成される関数:
- `refresh_sire_course_distance_stats()` — 種牡馬集計を再計算
- `get_sire_ranking_for_conditions()` — ハクセン用: 条件別種牡馬ランキング

作成されるビュー:
- `latest_ai_columns` — 各予想家の最新コラム

## 3. JRDB一括ダウンロード

```bash
# 環境変数設定
export JRDB_USER="your_user"
export JRDB_PASS="your_pass"
export JRDB_DIR="./jrdb-data"

# lha インストール (macOS)
brew install lha

# 7年分ダウンロード（約730ファイル、2-3時間）
cd scripts/jrdb
node pipeline.mjs download --from 2019-01-01

# Supabaseインポート
node pipeline.mjs import

# 種牡馬集計
node pipeline.mjs aggregate
```

⚠️ `bulk-download.mjs` のURL パターンはJRDB会員ページの構造に合わせて要調整。
   実際のURLは会員ページのリンクを確認してください。

## 4. vercel.json に追加する Cron

```json
{
  "crons": [
    {
      "path": "/api/cron/generate-columns",
      "schedule": "0 11 * * 1,5,6"
    }
  ]
}
```

| UTC | JST | 曜日 | 内容 |
|-----|-----|------|------|
| 0 11 * * 5 | 金曜20:00 | 金 | 土曜分プレビュー(4体) |
| 0 11 * * 6 | 土曜20:00 | 土 | 日曜分プレビュー(4体) |
| 0 11 * * 1 | 月曜20:00 | 月 | 日曜分振り返り(ヒバリ) |

## 5. 環境変数追加 (Vercel)

```
ANTHROPIC_API_KEY=sk-ant-...  # Claude API キー（コラム生成用）
```

## 6. ファイル配置

```
gate-in/
├── scripts/
│   ├── jrdb/
│   │   ├── pipeline.mjs          # 統合パイプライン
│   │   ├── bulk-download.mjs     # 一括DL
│   │   ├── parsers.mjs           # KYG/SEC/UKC/BABパーサー
│   │   └── supabase-import.mjs   # Supabaseインポーター
│   └── generate-ai-columns.mjs   # コラム手動生成
├── src/
│   ├── app/api/
│   │   ├── cron/generate-columns/route.ts  # コラム生成Cron
│   │   └── ai-columns/route.ts             # コラム取得API
│   └── components/predictors/
│       └── AIColumnCard.tsx      # コラム表示コンポーネント
└── sql/
    └── migration-bloodline-and-columns.sql
```

## 7. ai_columns の UNIQUE制約追加

コラム生成のupsertで使う制約（マイグレーションに含まれていない場合）:

```sql
ALTER TABLE ai_columns
ADD CONSTRAINT ai_columns_predictor_date_type_key
UNIQUE (predictor_id, target_date, column_type);
```

## 8. 使い方サマリー

### 週次運用（自動）
- 金曜20:00 → 土曜分プレビュー自動生成
- 土曜20:00 → 日曜分プレビュー自動生成
- 月曜20:00 → 日曜振り返り自動生成

### 週次運用（手動）
```bash
# 手動でコラム生成
node scripts/generate-ai-columns.mjs preview --date 2026-04-27
node scripts/generate-ai-columns.mjs review  --date 2026-04-26

# JRDB週次データ取得
node scripts/jrdb/pipeline.mjs weekly
```

### コンポーネント使用例

```tsx
import { AIColumnSection } from "@/components/predictors/AIColumnCard";

// トップページ
const res = await fetch("/api/ai-columns?latest=true");
const columns = await res.json();
<AIColumnSection columns={columns} />

// 予想家詳細ページ
const res = await fetch("/api/ai-columns?predictor_id=hayate&limit=20");
const columns = await res.json();
{columns.map(c => <AIColumnFull key={c.id} column={c} />)}
```
