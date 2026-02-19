# 馬カルテ機能 実装ガイド

## 📁 作成されたファイル一覧

### 1. データベース（マイグレーション）
```
supabase/migrations/20250219_create_horse_karte.sql
```
- `horse_karte` テーブル作成
- `tracked_horses_view` ビュー
- `user_horse_stats` ビュー
- `votes` テーブルへのカラム追加（visibility, memo）

### 2. API
```
src/app/api/karte/route.ts          # カルテ一覧取得・作成
src/app/api/karte/tracking/route.ts # 追跡リスト
src/app/api/karte/stats/route.ts    # 統計ダッシュボード
```

### 3. ページ
```
src/app/(main)/mypage/karte/page.tsx                    # 馬カルテページ
src/app/(main)/mypage/karte/KarteClient.tsx             # カルテクライアント
src/app/(main)/mypage/karte/tracking/page.tsx           # 追跡リストページ
src/app/(main)/mypage/karte/tracking/TrackingClient.tsx # 追跡リストクライアント
src/app/(main)/mypage/stats/page.tsx                    # 統計ページ
src/app/(main)/mypage/stats/StatsClient.tsx             # 統計クライアント
```

### 4. コンポーネント
```
src/components/votes/VoteVisibilitySelector.tsx  # 公開設定・メモ入力
```

---

## 🚀 実装手順

### Step 1: ファイルをコピー

```bash
# karte-files フォルダの中身をプロジェクトにコピー
cp -r karte-files/* ~/gate-in/
```

### Step 2: マイグレーション実行

```bash
# Supabase CLIでマイグレーション実行
cd ~/gate-in
npx supabase db push

# または Supabase Dashboard の SQL Editor で直接実行
# supabase/migrations/20250219_create_horse_karte.sql の内容を貼り付け
```

### Step 3: 依存パッケージ確認

```bash
# framer-motion がなければインストール
npm install framer-motion
```

### Step 4: 既存の votes API を更新

`src/app/api/races/[raceId]/votes/route.ts` を編集して、
`visibility` と `memo` を受け取れるようにする：

```typescript
// POST 関数内
const { picks, visibility = "public", memo = "" } = await request.json();

// insert 時に追加
const { data: vote, error: voteError } = await supabase
  .from("votes")
  .insert({
    user_id: user.id,
    race_id: raceId,
    visibility,  // 追加
    memo,        // 追加
  })
  .select()
  .single();
```

### Step 5: 既存の VoteForm を更新

予想投稿フォームに公開設定とメモ入力を追加：

```tsx
import { VoteVisibilitySelector, VoteMemoInput } from "@/components/votes/VoteVisibilitySelector";

// フォーム内に追加
<VoteVisibilitySelector value={visibility} onChange={setVisibility} />
<VoteMemoInput value={memo} onChange={setMemo} />
```

### Step 6: マイページにリンク追加

`src/app/(main)/mypage/page.tsx` にカルテと統計へのリンクを追加：

```tsx
<Link href="/mypage/karte">
  📋 馬カルテ
</Link>
<Link href="/mypage/stats">
  📊 統計ダッシュボード
</Link>
```

---

## 📝 注意点

### 1. マイグレーションの注意

`groups` テーブルがまだない場合、マイグレーションファイルの以下の行をコメントアウト：

```sql
-- ALTER TABLE votes 
-- ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES groups(id) ON DELETE SET NULL;
```

### 2. 既存データとの整合性

- 既存の `votes` に `visibility` カラムが追加される（デフォルト: `public`）
- 既存の予想はすべて公開扱いになる

### 3. RLSポリシー

`horse_karte` テーブルはRLSが有効
- ユーザーは自分のカルテのみ閲覧・編集可能

---

## 🔍 動作確認

1. `/mypage/karte` にアクセス
2. 振り返りモードで馬が表示されることを確認
3. 「次も買う」「見限る」をクリックして保存されることを確認
4. `/mypage/karte/tracking` で追跡リストを確認
5. `/mypage/stats` で統計が表示されることを確認

---

## 📊 機能概要

### 馬カルテ（振り返りモード）
- 印をつけた全馬（◎○▲△）を表示
- Tinder形式で「次も買う/見限る」を判断
- 人気・オッズ・着順・タイム差を表示
- メモを残せる

### 追跡リスト
- 「次も買う」と判断した馬の一覧
- 今週出走予定と次走待ちに分類
- 次走情報と前走情報を表示

### 統計ダッシュボード
- 的中率・本命的中率
- 印別・馬場別・距離別・騎手別の成績
- 期間選択（今週/今月/全期間）

### 予想の公開設定
- 全体公開/非公開を選択
- 予想理由メモを追加可能
