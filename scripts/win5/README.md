# WIN5 AI予想 - Phase 1: データ基盤

## 📁 ファイル構成

```
scripts/win5/
├── README.md                    ← このファイル
├── create-tables.sql            ← Supabaseテーブル作成SQL
├── scrape-win5-list.mjs         ← スクレイピング（推奨）
├── scrape-win5-results.mjs      ← スクレイピング（詳細ページ直接版）
├── import-win5-results.mjs      ← Supabaseインポート
└── verify-jrdb-match.mjs        ← JRDBマッチング検証
```

## 🚀 実行手順

### Step 1: テーブル作成

Supabase SQL Editor で `create-tables.sql` を実行。
3テーブル作成:
- `win5_results` — 過去結果
- `win5_predictions` — AI予想（Phase 2以降）
- `win5_backtest_results` — バックテスト結果（Phase 3以降）

### Step 2: スクレイピング

```bash
cd ~/gate-in/scripts/win5

# まず一覧データ取得（高速: 一覧ページのみ、約3分）
node scrape-win5-list.mjs

# 詳細データも取得（レース名・オッズ・人気、約10-15分）
node scrape-win5-list.mjs --detail

# 年を絞る場合
node scrape-win5-list.mjs --from 2022 --to 2026 --detail
```

**出力ファイル:**
- `win5-data/win5-list.json` — 基本データ（日付・馬番・配当）
- `win5-data/win5-full.json` — 詳細データ（＋レース名・オッズ・人気・JRDB race_key）

**途中再開:** 既存ファイルがあればスキップして差分のみ取得。

### Step 3: Supabaseインポート

```bash
cd ~/gate-in/scripts/win5
export $(grep -E '^(NEXT_PUBLIC_SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY)=' ~/gate-in/.env.local | xargs)

# 確認
node import-win5-results.mjs --dry-run

# 実行
node import-win5-results.mjs
```

### Step 4: JRDBマッチング検証

```bash
node verify-jrdb-match.mjs

# 詳細表示
node verify-jrdb-match.mjs --verbose

# 期間指定
node verify-jrdb-match.mjs --from 2024-01-01
```

**確認ポイント:**
- KYGマッチ率が80%以上あればバックテスト可能
- 不一致があればrace_keyの形式を確認（YYMMDD+場コード+R番号）
- IDM/総合指数のnull率が低いことを確認

## 📝 データ構造

### win5-full.json の構造
```json
{
  "race_date": "2025-02-02",
  "dor": "20250202",
  "winning_umabans": [7, 1, 4, 11, 9],
  "payout": 121304820,
  "hit_count": 5,
  "total_tickets": 10595501,
  "legs": [
    {
      "leg_number": 1,
      "course_code": "08",
      "course_name": "京都",
      "race_number": 10,
      "race_name": "八坂ステークス",
      "winning_umaban": 7,
      "winning_odds": 4.7,
      "winning_popularity": 3,
      "jrdb_race_key": "25020208010"
    }
  ]
}
```

### JRDB race_key 形式
```
YYMMDD + 場コード(2桁) + R番号(2桁) = 10桁
例: 2502020810 = 25年02月02日 京都(08) 10R

場コード:
01=札幌  02=函館  03=福島  04=新潟
05=東京  06=中山  07=中京  08=京都
09=阪神  10=小倉
```

> ⚠️ race_keyは8桁（YYMMDD+場2桁+R2桁）でjrdb_race_entriesと結合。
> ただしwinkeiba.jpのRacetrackCdがJRDBの場コードと一致するか要検証。

## 🔗 次のPhase

Phase 1完了後:
- **Phase 2**: 難易度スコア計算ロジック実装
- **Phase 3**: 買い目生成 + バックテスト
- 設計詳細: `win5-ai-design.md` 参照
