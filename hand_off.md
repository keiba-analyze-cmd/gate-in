# 🏇 ゲートイン！ 引き継ぎドキュメント

> **最終更新: 2026-02-15**

---

## プロジェクト概要

**ゲートイン！**は競馬予想SNSアプリ。ユーザーが◎○△⚠️の印を選んで投票し、結果に応じてポイントを獲得、ランクアップする仕組み。

- **URL**: https://gate-in.jp
- **GitHub**: https://github.com/keiba-analyze-cmd/gate-in
- **Tech**: Next.js 16 (App Router) + Supabase + Vercel + TypeScript + Tailwind CSS

---

## 現在の状態

- **進捗**: 90/107タスク完了（Phase A〜M完了）
- **次のフェーズ**: Phase N（UIリデザイン）
- **ビルド**: ✅ 全てパス

---

## 直近で実施した作業（Phase M: 2026-02-15）

### 1. いいねランキング機能
- **API**: `src/app/api/rankings/likes/route.ts`
- **Component**: `src/components/rankings/LikesRanking.tsx`
- 投票へのいいね数によるランキング表示
- 期間フィルター: 今日/今週/今月

### 2. 週間MVP表彰機能
- **API**: `src/app/api/rankings/weekly/route.ts`
- **Component**: `src/components/rankings/WeeklyMVP.tsx`
- 週間ポイント1位を自動選出・表彰
- TOPページにMVPバナー追加

### 3. 乗っかり（コピー投票）機能
- **API**: `src/app/api/votes/[voteId]/copy/route.ts`
- **DB**: `copy_source_vote_id` カラム追加
- 他ユーザーの予想をベースに投票可能
- 投票元の通知機能付き

### 4. My競馬新聞機能
- **DB**: `newspaper_members` テーブル新規作成
- **API**: `src/app/api/newspaper-members/route.ts`
- **API**: `src/app/api/newspaper/[raceId]/route.ts`
- **Page**: `src/app/(main)/mypage/newspaper/page.tsx`
- フォロー中から最大5人を選択
- レース詳細で競馬新聞風に印を一覧表示

### 5. スタイル診断機能
- **API**: `src/app/api/diagnosis/route.ts`
- **Page**: `src/app/(main)/mypage/diagnosis/page.tsx`
- 投票履歴から予想スタイルを診断
- 6タイプ: 穴党/本命党/堅実派/完璧主義/逆張り/バランス型

### 6. UIリデザイン設計
- **ワイヤーフレーム**: `/mnt/user-data/outputs/gate-in-wireframes-v2.jsx`
- ライト/ダークモード対応
- 全10ページのデザイン策定

---

## 重要な設計判断

### 投票締切ロジック
```typescript
const deadline = new Date(race.post_time).getTime() - 2 * 60 * 1000;
// 発走2分前が投票締切
```

### ポイント制度（オッズ連動）
- 基本: 単勝10P×オッズ（上限100P）
- 対抗: 複勝5P×オッズ
- 抑え: 複勝3P×オッズ（6番人気以下ボーナス）
- 危険馬的中: +50P
- グレード倍率: G1×2.0, G2×1.5, G3×1.3

### 的中5段階区分（新）
| ランク | 名称 | 条件 |
|--------|------|------|
| S | パーフェクト | ◎1着 + ○2-3着 |
| A | 単勝的中 | ◎が1着 |
| B | 複勝的中 | ◎が2-3着 |
| C | 一部的中 | ○か△のみ的中 |
| D | ハズレ | 全外れ |

### Cron設定（vercel.json）
```json
{
  "crons": [
    { "path": "/api/cron/auto-settle", "schedule": "*/10 * * * *" },
    { "path": "/api/cron/update-entries", "schedule": "0 */3 * * *" },
    { "path": "/api/cron/monthly-contest", "schedule": "0 0 1 * *" },
    { "path": "/api/cron/monthly-reset", "schedule": "0 0 1 * *" }
  ]
}
```

### RLSバイパス
- 管理者操作: `createAdminClient()`（`@/lib/admin`）を使用

---

## 次のフェーズ: Phase N（UIリデザイン）

### ワイヤーフレーム
`/mnt/user-data/outputs/gate-in-wireframes-v2.jsx`

### 実装計画

#### Phase N-1: 基盤整備（1日）
```
src/
├── contexts/ThemeContext.tsx      # テーマ切り替え
├── components/ui/
│   ├── Button.tsx, Card.tsx, Badge.tsx, Tab.tsx
├── components/layout/
│   ├── Header.tsx, BottomNav.tsx, MainLayout.tsx
└── styles/theme.ts
```

#### Phase N-2: 主要ページ（2-3日）
1. レース一覧（セクション分け + 的中5段階色分け）
2. レース詳細（出馬表に自分の印統合、タブ4つ）
3. TOPページ（ヒーロー + MVP + 人気予想）

#### Phase N-3: サブページ（2日）
- ランキング、タイムライン、投票フォーム、マイページ

#### Phase N-4: 新機能ページ（1日）
- My競馬新聞設定、スタイル診断、ユーザー詳細

#### Phase N-5: 仕上げ（1日）
- アニメーション、エラー/ローディング状態、テスト

---

## 主要ファイル構成

### ページ
```
src/app/(main)/page.tsx              - トップページ
src/app/(main)/races/page.tsx        - レース一覧
src/app/(main)/races/[raceId]/page.tsx - レース詳細・投票
src/app/(main)/users/[userId]/page.tsx - ユーザープロフィール
src/app/(main)/mypage/page.tsx       - マイページ
src/app/(main)/mypage/newspaper/     - My競馬新聞設定
src/app/(main)/mypage/diagnosis/     - スタイル診断
src/app/(main)/rankings/page.tsx     - ランキング
src/app/(main)/timeline/page.tsx     - タイムライン
src/app/(main)/admin/page.tsx        - 管理画面
```

### API（新規追加分）
```
src/app/api/rankings/likes/route.ts     - いいねランキング
src/app/api/rankings/weekly/route.ts    - 週間MVP
src/app/api/votes/[voteId]/copy/route.ts - 乗っかり
src/app/api/votes/[voteId]/like/route.ts - いいね
src/app/api/newspaper-members/route.ts  - 新聞メンバー管理
src/app/api/newspaper/[raceId]/route.ts - 新聞データ取得
src/app/api/diagnosis/route.ts          - スタイル診断
```

---

## 開発ルール

- 修正はPythonスクリプト(.py)で作成し、ローカルで実行
- TASKLIST.md（プロジェクトルート）をフェーズ完了時に更新してcommit
- 発走時刻カラムは `post_time`（start_timeではない）
- RLSバイパスは `createAdminClient()`（@/lib/admin）
- DB接続: Supabase SQL Editorでマイグレーション実行

---

## デプロイ

```bash
npm run build
git add -A && git commit -m "メッセージ" && git push
# Vercelが自動デプロイ
```
