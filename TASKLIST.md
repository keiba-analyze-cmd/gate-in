# 🏇 ゲートイン！ タスク一覧

> **最終更新: 2026-02-16**

---

## 📊 サマリー

| 状態 | 件数 |
|------|------|
| ✅ 完了 | 118 |
| 🔄 進行中 | 2 |
| 🔴 未着手 | 8 |
| **合計** | **128** |

---

## 🎯 フェーズ進捗

| Phase | 内容 | 状態 |
|-------|------|:----:|
| Phase A | 初期セットアップ | ✅ 完了 |
| Phase B | レース機能 | ✅ 完了 |
| Phase B-fix | バグ修正 | ✅ 完了 |
| Phase C-social | SNS機能 | ✅ 完了 |
| Phase D | 投票機能 | ✅ 完了 |
| Phase E | ポイントシステム | ✅ 完了 |
| Phase F | ランキング | ✅ 完了 |
| Phase H | マイページ | ✅ 完了 |
| Phase I | UI改善 | ✅ 完了 |
| Phase I-polish | UI仕上げ | ✅ 完了 |
| Phase J | 道場基盤 | ✅ 完了 |
| Phase K | いいね機能 | ✅ 完了 |
| Phase L | LP改善 | ✅ 完了 |
| Phase M | ランキング拡張 | ✅ 完了 |
| Phase M-2 | ワイヤーフレームv4 | ✅ 完了 |
| Phase N | UIリデザイン | ✅ 完了 |
| Phase O | レース一覧UI改善 | ⏳ 後回し |
| Phase P | Phase1機能 | ✅ 完了 |
| Phase Q | G1特設機能 | ✅ 完了 |
| Phase R | MicroCMS連携 | 🔄 進行中 |
| Phase S | Phase2 習慣形成 | 🔴 未着手 |
| Phase G | 将来機能（3ヶ月〜） | 🔴 未着手 |

---

## ✅ Phase P: コアループ強化（完了 2026-02-16）

| # | タスク | 説明 | 状態 |
|---|--------|------|:----:|
| 116 | 的中アニメーション | 紙吹雪 + バイブレーション（canvas-confetti） | ✅ |
| 117 | 的中報告シェアカード | 画像生成 + X/LINE共有（html2canvas） | ✅ |
| 118 | 予想理由コメント | 投票時入力 → タイムライン表示 | ✅ |
| 119 | Push通知基盤 | Web Push API | ⏳ 後回し |

---

## ✅ Phase Q: G1特設機能（完了 2026-02-16）

| # | タスク | 説明 | 状態 |
|---|--------|------|:----:|
| 120 | G1特設カード | カウントダウン、投票数表示、豪華デザイン | ✅ |
| 121 | 予想投稿シェアカード | 投票完了後にSNS共有 | ✅ |
| 122 | Xシェアボタン強化 | URLコピー、ハッシュタグ自動付与 | ✅ |

---

## 🔄 Phase R: MicroCMS連携（進行中）

### API作成状況

| # | API名 | エンドポイント | 状態 |
|---|-------|---------------|:----:|
| 123 | 記事カテゴリ | article-categories | ✅ 完了 |
| 124 | タグ | tags | ✅ 完了 |
| 125 | クイズカテゴリ | quiz-categories | ✅ 完了 |
| 126 | クイズ問題 | quiz-questions | 🔄 途中 |
| 127 | 記事 | articles | 🔴 未着手 |

### quiz-questions 残りフィールド

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

### articles フィールド（次に作成）

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

### 実装タスク

| # | タスク | 状態 |
|---|--------|:----:|
| 128 | MicroCMSクライアント作成 | ✅ src/lib/microcms.ts |
| 129 | 道場ページMicroCMS接続 | 🔴 未着手 |
| 130 | 記事一覧・詳細ページ | 🔴 未着手 |
| 131 | クイズ機能実装 | 🔴 未着手 |

---

## 🔴 Phase S: Phase2 習慣形成（未着手）

| # | タスク | 説明 | 状態 |
|---|--------|------|:----:|
| 132 | デイリーミッション | 毎日のタスク達成でボーナス | 🔴 |
| 133 | 週末レースプレビュー記事 | G1前の注目記事 | 🔴 |
| 134 | 予想家分析ダッシュボード | 成績グラフ・傾向表示 | 🔴 |
| 135 | お気に入り馬登録 | 出走時通知 | 🔴 |

---

## 🔴 Phase G: 将来機能（3ヶ月〜）

| # | タスク | 説明 | 優先度 |
|---|--------|------|:------:|
| 44 | 大会・コンテスト機能 | 週間/月間ランキング争い | 🟡中 |
| 45 | レース回顧投稿 | レース後の振り返り | 🟡中 |
| 46 | 予想の公開/非公開設定 | 締切後に公開 | 🟡中 |
| 50 | PWA対応 | Service Worker + マニフェスト | 🟢低 |
| 51 | Push通知 | Web Push でリマインド | 🟡中 |
| 52 | AI予想サポート | 推奨馬候補表示 | 🟢低 |

---

## 📂 主要ファイル一覧（最新）

### MicroCMS連携
- `src/lib/microcms.ts` - クライアント + API関数

### Phase P: コアループ強化
- `src/components/races/VoteSummary.tsx` - 的中アニメーション
- `src/components/share/HitShareCard.tsx` - 的中報告シェアカード
- `src/components/share/VoteShareCard.tsx` - 予想投稿シェアカード
- `src/components/races/VoteForm.tsx` - コメント入力追加

### Phase Q: G1特設
- `src/components/races/G1FeatureCard.tsx` - G1特設カード
- `src/components/social/ShareButtons.tsx` - シェアボタン強化版

---

## 📝 Supabase実行済みSQL
```sql
-- 予想理由コメント（2026-02-16）
ALTER TABLE votes ADD COLUMN IF NOT EXISTS comment TEXT;
```
