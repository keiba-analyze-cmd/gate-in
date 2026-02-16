# 🏇 ゲートイン！ 引き継ぎドキュメント

> **最終更新: 2026-02-16**

---

## プロジェクト概要

**ゲートイン！**は競馬予想SNSアプリ。ユーザーが◎○△⚠️の印を選んで投票し、結果に応じてポイントを獲得、ランクアップする仕組み。

| 項目 | 内容 |
|------|------|
| URL | https://www.gate-in.jp |
| GitHub | https://github.com/keiba-analyze-cmd/gate-in |
| Tech | Next.js 16 (App Router) + Supabase + Vercel + TypeScript + Tailwind CSS |
| CMS | MicroCMS（記事・クイズ管理） |

---

## 現在の状態

| 項目 | 内容 |
|------|------|
| 進捗 | 118/128タスク完了 |
| 次のタスク | MicroCMS API作成の続き（quiz-questions, articles） |
| ビルド | ✅ パス |

---

## 直近で実施した作業（2026-02-16）

### Phase P: コアループ強化 ✅

| 機能 | 説明 | ファイル |
|------|------|----------|
| 的中アニメーション | 紙吹雪 + バイブレーション | `VoteSummary.tsx` |
| 的中報告シェアカード | 画像生成 + SNS共有 | `HitShareCard.tsx` |
| 予想理由コメント | 投票時入力 → TL表示 | `VoteForm.tsx`, `TimelineItem.tsx` |

### Phase Q: G1特設機能 ✅

| 機能 | 説明 | ファイル |
|------|------|----------|
| G1特設カード | カウントダウン、投票数表示 | `G1FeatureCard.tsx` |
| 予想投稿シェアカード | 投票完了後にSNS共有 | `VoteShareCard.tsx` |
| Xシェアボタン強化 | URLコピー、ハッシュタグ自動 | `ShareButtons.tsx` |

### Phase R: MicroCMS連携 🔄

| 状態 | 内容 |
|------|------|
| ✅ 完了 | MicroCMSサービス作成（gatein） |
| ✅ 完了 | 環境変数設定（.env.local） |
| ✅ 完了 | MicroCMSクライアント作成（src/lib/microcms.ts） |
| ✅ 完了 | API: article-categories |
| ✅ 完了 | API: tags |
| ✅ 完了 | API: quiz-categories |
| 🔄 途中 | API: quiz-questions |
| 🔴 未着手 | API: articles |

---

## 🔐 環境変数

### MicroCMS（設定済み）
```
MICROCMS_SERVICE_DOMAIN=gatein
MICROCMS_API_KEY=wexGay9HtOEvOqFaNMu8RB9tBguAvICDy1bu
```

---

## 🔜 次回再開時のタスク

### 1. MicroCMS API作成の続き

#### quiz-questions のフィールド（確認・完成）

| フィールドID | 表示名 | 種類 | 必須 |
|-------------|--------|------|:----:|
| question | 問題文 | テキストエリア | ✅ |
| category | カテゴリ | コンテンツ参照(quiz-categories) | ✅ |
| level | レベル | テキストフィールド | ✅ |
| choice1 | 選択肢1 | テキストフィールド | ✅ |
| choice2 | 選択肢2 | テキストフィールド | ✅ |
| choice3 | 選択肢3 | テキストフィールド | - |
| choice4 | 選択肢4 | テキストフィールド | - |
| correctIndex | 正解番号 | 数値 | ✅ |
| explanation | 解説 | リッチエディタ | - |
| order | 表示順 | 数値 | - |

#### articles API作成

| フィールドID | 表示名 | 種類 | 必須 |
|-------------|--------|------|:----:|
| title | タイトル | テキストフィールド | ✅ |
| slug | スラッグ | テキストフィールド | ✅ |
| category | カテゴリ | コンテンツ参照(article-categories) | ✅ |
| thumbnail | サムネイル画像 | 画像 | - |
| emoji | アイコン絵文字 | テキストフィールド | - |
| excerpt | 概要 | テキストエリア | - |
| content | 本文 | リッチエディタ | ✅ |
| readTime | 読了時間(分) | 数値 | - |
| hasQuiz | クイズ付き | 真偽値 | - |
| isPremium | プレミアム記事 | 真偽値 | - |
| tags | タグ | 複数コンテンツ参照(tags) | - |
| publishedAt | 公開日 | 日時 | - |

### 2. MicroCMS → アプリ連携

- 道場ページ（dojo）をMicroCMSデータに接続
- 記事一覧・詳細ページ作成
- クイズ機能実装

### 3. Phase S: 習慣形成（Phase2）

- デイリーミッション
- 週末レースプレビュー記事
- 予想家分析ダッシュボード
- お気に入り馬登録

---

## 📁 作成済みファイル一覧

### MicroCMS
- `src/lib/microcms.ts` - クライアント + 型定義 + API関数

### シェア機能
- `src/components/share/HitShareCard.tsx` - 的中報告シェアカード
- `src/components/share/VoteShareCard.tsx` - 予想投稿シェアカード
- `src/components/social/ShareButtons.tsx` - 汎用シェアボタン

### G1特設
- `src/components/races/G1FeatureCard.tsx` - G1特設カード

### アニメーション
- `src/components/races/VoteSummary.tsx` - 的中アニメーション追加

### 投票関連（更新）
- `src/components/races/VoteForm.tsx` - コメント入力追加
- `src/app/api/timeline/route.ts` - コメント取得追加
- `src/components/social/TimelineItem.tsx` - コメント表示追加

---

## 📦 追加パッケージ
```json
{
  "canvas-confetti": "^1.9.2",
  "@types/canvas-confetti": "^1.6.4",
  "html2canvas": "^1.4.1",
  "microcms-js-sdk": "^3.1.0"
}
```

---

## 📝 Supabase実行済みSQL
```sql
-- 予想理由コメント（2026-02-16）
ALTER TABLE votes ADD COLUMN IF NOT EXISTS comment TEXT;
COMMENT ON COLUMN votes.comment IS '予想理由のコメント';
```

---

## ⚠️ 注意事項

1. **MicroCMS不具合**: 2026-02-16時点でログインエラー発生中。復旧後にAPI作成を続行。

2. **APIキーの扱い**: `MICROCMS_API_KEY`は`.env.local`にのみ記載。Gitにはコミットしない。

3. **ビルド時のPython使用**: bashのヒアドキュメントでJSX/TSXファイルを作成すると`<`がエスケープ問題を起こすため、Python経由で書き込むのが安定。

---

## 📞 連絡先

質問があれば開発チームまで。
