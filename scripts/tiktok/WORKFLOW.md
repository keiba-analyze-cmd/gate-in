# TikTok動画制作ワークフロー

## 概要

```
fetch → generate → preview → (edit) → generate → render → post
```

## 週間運用フロー

### 金曜夜（予想動画制作）
```bash
cd ~/gate-in/scripts/tiktok

# 1. 環境変数セット
export $(grep -E '^(NEXT_PUBLIC_SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY)=' ~/gate-in/.env.local | xargs)

# 2. 土曜分のデータ取得
node pipeline.mjs fetch --date 2026-05-03

# 3. content/ のJSONを確認・編集
code content/

# 4. HTML生成
node pipeline.mjs generate

# 5. レビューダッシュボードで確認
node pipeline.mjs preview

# 6. 問題があればJSONを編集して再生成
#    例: content/prediction-kazan-NHKマイルC.json のserifを変更
node pipeline.mjs generate

# 7. MP4レンダリング
node pipeline.mjs render

# 8. 投稿チェックリスト
node pipeline.mjs post
```

### 日曜夜（結果速報制作）
```bash
# 結果データを含めて再取得
node pipeline.mjs fetch --date 2026-05-04

# 結果速報のみ生成
node pipeline.mjs generate --type results
node pipeline.mjs preview
node pipeline.mjs render
node pipeline.mjs post
```

## ファイル構成

```
scripts/tiktok/
├── pipeline.mjs              ← メインパイプライン
├── content/                   ← JSONコンテンツ（編集可能）
│   ├── prediction-kazan-*.json
│   ├── prediction-hayate-*.json
│   └── results-*.json
├── output-pipeline/           ← 生成物（HTML + MP4）
│   ├── dashboard.html         ← レビューダッシュボード
│   ├── prediction-*.html
│   ├── results-*.html
│   └── *.mp4
├── templates/                 ← テンプレート（変更不要）
│   ├── prediction/
│   ├── results/
│   ├── data-short/
│   ├── char-spotlight/
│   └── monthly-review/
└── gen-*-demo.mjs            ← デモ生成スクリプト
```

## JSONの編集方法

### 予想動画 (prediction)
```json
{
  "serif": "ここを編集するとキャラのセリフが変わる",
  "dataRows": [
    { "label": "ラベル", "value": "表示値", "pct": "バー幅%" }
  ],
  "honmei": { "number": 7, "name": "馬名" }
}
```

### 結果速報 (results)
```json
{
  "characters": [
    { "hit": true, "comment": "1着的中！" }  // hitとcommentを編集可能
  ],
  "kaishuu": 142  // 回収率を手動調整
}
```

## レビューダッシュボードの使い方

1. `node pipeline.mjs preview` でブラウザが開く
2. 左サイドバーから動画を選択 → 右のプレビューエリアで再生
3. ▶ ボタンでアニメーション再生
4. 📝 ボタン → JSONファイルの場所を表示
5. ✅ ボタン → 承認マーク（全部✅になったらrender）

## トラブルシューティング

- **fetch失敗**: `export $(grep ... .env.local | xargs)` を確認
- **画像が出ない**: `public/images/predictors/*.png` が存在するか確認
- **render失敗**: Hyperframesがインストールされているか確認 (`npx hyperframes --version`)
- **ダッシュボードでiframeが空**: CORSの制限。ファイルをローカルサーバーで配信するか、個別HTMLを直接開く
