# Gate-In! 引継ぎドキュメント

最終更新: 2026-02-15

## プロジェクト概要

**Gate-In!（ゲートイン！）** は、競馬予想をポイント化してランキング形式で楽しむWebアプリです。

- **URL**: https://gate-in.vercel.app （本番）
- **技術スタック**: Next.js 16 (App Router) / TypeScript / Supabase / Tailwind CSS / Vercel
- **リポジトリ**: gate-in

---

## 最新の実装状況（2026-02-15）

### 今回実装した主要機能

#### 1. △抑え機能
- 投票時に△（抑え）を0〜5頭選択可能
- 三連複の判定に使用される
- △の数に応じて倍率適用（1頭:×1.0 〜 5頭:×0.2）

#### 2. オッズ連動ポイントシステム
従来の人気別固定ポイントから、実際のオッズに連動するシステムに全面刷新。

| 馬券種 | ポイント範囲 |
|--------|-------------|
| 単勝（◎1着） | 20〜250P |
| 複勝（○3着以内） | 10〜60P |
| 馬連（◎○が1-2着） | 30〜280P |
| ワイド（◎○が3着以内） | 15〜90P |
| 三連複（◎○△が1-2-3着） | 20〜300P |
| 危険馬（⚠️4着以下） | 10〜50P（人気別） |

#### 3. 馬券バッジ（6種類追加）
| バッジID | 名前 | 条件 |
|----------|------|------|
| odds_30 | 大穴スナイパー | 単勝30倍以上的中 |
| quinella_100 | 万馬券ハンター | 馬連100倍以上的中 |
| quinella_300 | 馬連マスター | 馬連300倍以上的中 |
| wide_10 | ワイドコレクター | ワイド10回的中 |
| trio_100 | 三連複ハンター | 三連複100倍以上的中 |
| trio_1000 | ミリオンショット | 三連複1000倍以上的中 |

#### 4. お気に入りバッジ設定
- プロフィールに表示するバッジを選択可能
- `profiles.featured_badge_id`で管理
- `/mypage/badges`から設定

#### 5. いいね機能
- 予想に❤️いいねを付けられる
- いいね数がカウント表示される
- いいねされると通知が届く
- `vote_likes`テーブルで管理

#### 6. フォロー中の予想（TOP画面）
- TOPページの「盛り上がりコメント」→「フォロー中の予想」に変更
- フォローしているユーザーの最新10件を表示

#### 7. タイムライン改修
- タブを分離：すべて / 🎯的中報告 / 🗳みんなの予想 / 💬コメント
- 的中報告（settled_hit）と投票（pending）を明確に分離

---

## 印の体系（最新版）

| 印 | 名称 | 用途 | 選択数 | 表示色 |
|----|------|------|:------:|--------|
| ◎ | 本命 | 単勝・馬連・三連複 | 1頭（必須） | 赤 |
| ○ | 相手 | 複勝・馬連・ワイド・三連複 | 0〜2頭 | 青 |
| △ | 抑え | 三連複のみ | 0〜5頭 | 黄 |
| ⚠️ | 危険馬 | 着外予想 | 0〜1頭 | グレー |

---

## DB変更履歴（2026-02-15）

```sql
-- vote_picksにback追加
ALTER TABLE vote_picks DROP CONSTRAINT vote_picks_pick_type_check;
ALTER TABLE vote_picks ADD CONSTRAINT vote_picks_pick_type_check 
CHECK (pick_type = ANY (ARRAY['win', 'place', 'danger', 'back']));

-- お気に入りバッジ用カラム
ALTER TABLE profiles ADD COLUMN featured_badge_id TEXT DEFAULT NULL;

-- 馬券バッジ追加
INSERT INTO badges (id, name, icon, description, category, condition) VALUES
  ('quinella_100', '万馬券ハンター', '💰', '馬連100倍以上を的中させた', 'ticket', '{"type": "quinella_odds", "min": 100}'),
  ('quinella_300', '馬連マスター', '🏆', '馬連300倍以上を的中させた', 'ticket', '{"type": "quinella_odds", "min": 300}'),
  ('wide_10', 'ワイドコレクター', '🎟️', 'ワイドを10回的中させた', 'ticket', '{"type": "wide_hits", "min": 10}'),
  ('trio_100', '三連複ハンター', '🎰', '三連複100倍以上を的中させた', 'ticket', '{"type": "trio_odds", "min": 100}'),
  ('trio_1000', 'ミリオンショット', '👑', '三連複1000倍以上を的中させた', 'ticket', '{"type": "trio_odds", "min": 1000}'),
  ('odds_30', '大穴スナイパー', '🎯', '単勝30倍以上を的中させた', 'ticket', '{"type": "win_odds", "min": 30}');

-- いいねテーブル
CREATE TABLE vote_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vote_id UUID NOT NULL REFERENCES votes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, vote_id)
);
ALTER TABLE votes ADD COLUMN like_count INT DEFAULT 0;

-- いいねカウント用RPC関数
CREATE FUNCTION increment_vote_like_count(vote_id_param UUID) ...
CREATE FUNCTION decrement_vote_like_count(vote_id_param UUID) ...
```

---

## 主要ファイル構成

### ポイント計算関連
- `src/lib/constants/ranks.ts` - オッズテーブル、ポイント計算関数
- `src/lib/services/settle-race.ts` - 精算ロジック（馬券判定含む）
- `src/lib/badges.ts` - バッジ自動付与ロジック

### 投票関連
- `src/components/races/VoteForm.tsx` - 投票フォーム（△タブ含む）
- `src/components/races/VoteEditForm.tsx` - 投票編集フォーム
- `src/components/races/VoteSummary.tsx` - 投票結果表示
- `src/components/races/HorseList.tsx` - 出馬表（△表示対応）
- `src/app/api/races/[raceId]/votes/route.ts` - 投票API

### 表示関連
- `src/components/social/TimelineItem.tsx` - タイムライン表示
- `src/components/social/TimelineFeed.tsx` - タイムラインフィード
- `src/components/social/UserActivityFeed.tsx` - ユーザーアクティビティ
- `src/components/social/FollowingVotes.tsx` - フォロー中の予想
- `src/components/social/LikeButton.tsx` - いいねボタン
- `src/components/races/VoteDistribution.tsx` - 投票分布

### API
- `src/app/api/votes/[voteId]/like/route.ts` - いいねAPI
- `src/app/api/timeline/following/route.ts` - フォロー中の予想取得
- `src/app/api/profile/featured-badge/route.ts` - お気に入りバッジ設定

### ガイド・バッジ
- `src/app/(main)/guide/points/page.tsx` - ポイントルール詳細
- `src/app/(main)/mypage/badges/page.tsx` - バッジコレクション
- `src/app/(main)/mypage/badges/BadgeGrid.tsx` - お気に入り選択UI

---

## 開発コマンド

```bash
# 開発サーバー起動
npm run dev

# ビルド
npm run build

# デプロイ（Vercel自動）
git push origin main
```

---

## 次回以降の候補タスク

- [ ] プロフィールページでお気に入りバッジを表示
- [ ] タイムラインにいいねボタン追加
- [ ] UI刷新（モダンなデザインへ）
- [ ] プッシュ通知の実装
- [ ] SNSシェア機能の強化
- [ ] 予想AIアシスタント機能
