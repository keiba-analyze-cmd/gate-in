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
- `src/app/api/races/[raceId]/votes/route.ts` - 投票API

### 表示関連
- `src/components/social/TimelineItem.tsx` - タイムライン表示
- `src/components/social/UserActivityFeed.tsx` - ユーザーアクティビティ
- `src/components/races/VoteDistribution.tsx` - 投票分布

### ガイド
- `src/app/(main)/guide/points/page.tsx` - ポイントルール詳細

### バッジ
- `src/app/(main)/mypage/badges/page.tsx` - バッジコレクション
- `src/app/(main)/mypage/badges/BadgeGrid.tsx` - お気に入り選択UI
- `src/app/api/profile/featured-badge/route.ts` - お気に入り設定API

---

## 印の体系

| 印 | 名称 | 用途 | 選択数 |
|----|------|------|:------:|
| ◎ | 本命 | 単勝・馬連・三連複 | 1頭（必須） |
| ○ | 相手 | 複勝・馬連・ワイド・三連複 | 0〜2頭 |
| △ | 抑え | 三連複のみ | 0〜5頭 |
| ⚠️ | 危険馬 | 着外予想 | 0〜1頭 |

---

## 既知の課題・注意点

1. **危険馬の人気取得**
   - 結果取得時に人気・オッズを更新するよう修正済み
   - 人気不明の場合は「人気不明」と表示

2. **払戻情報の取得**
   - `payouts`テーブルから馬連・ワイド・三連複のオッズを取得
   - 払戻がない場合はデフォルト値を使用

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

- [ ] UI刷新（モダンなデザインへ）
- [ ] プッシュ通知の実装
- [ ] SNSシェア機能の強化
- [ ] 予想AIアシスタント機能
- [ ] 過去データ分析機能
