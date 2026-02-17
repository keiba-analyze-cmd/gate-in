# ゲートイン！開発引き継ぎドキュメント
## 2026年2月17日 セッション時点

---

## 📁 プロジェクト概要

- **プロジェクト名**: ゲートイン！（競馬予想SNS＆学習プラットフォーム）
- **リポジトリ**: gate-in
- **技術スタック**: Next.js 16, TypeScript, Tailwind CSS, Supabase, MicroCMS
- **本番URL**: https://www.gate-in.jp

---

## ✅ これまでに完了した作業

### 1. Phase N完了 - UIリデザイン＆ダークモード対応（2026-02-16）

以下のコンポーネント/ページをダークモード対応：

| ファイル | 内容 |
|----------|------|
| RaceResultTable.tsx | レース結果テーブル・払戻金 |
| VoteDistribution.tsx | みんなの予想 |
| VoteSummary.tsx | あなたの予想 |
| MyNewspaperTab.tsx | My競馬新聞タブ |
| CommentSection.tsx | 掲示板 |
| LikeRankingList.tsx | いいねランキング |
| WeeklyMVPCard.tsx | 週間MVP |
| ContestClient.tsx | 月間大会ページ |
| UserActivityFeed.tsx | ユーザーアクティビティ |
| RankingList.tsx | ランキングリスト |

### 2. バグ修正（2026-02-16）

- `RaceResultTable.tsx`: payout undefined エラー修正
- `RankingList.tsx`: className構文エラー + key重複修正

### 3. MicroCMS連携＆コンテンツ投入（2026-02-17）

- MicroCMSとのAPI連携完了
- クイズ100問作成（6カテゴリ: 血統/コース/騎手/調教師/予想術/名馬）
- 記事18本作成・投入完了（血統4・コース3・騎手3・調教師2・予想術3・名馬2＋初回1）
- テーブルスタイル修正（MicroCMSリッチエディタのHTML構造対応）
- カテゴリフィルター追加（記事タブにカテゴリ切替ボタン）
- クイズ連携修正（記事↔クイズの自動紐づけ＆直接リンク）

### 4. SEO Phase 1完了 - SEO基盤構築（2026-02-17）

| 項目 | 内容 |
|------|------|
| 記事ページ公開化 | 認証ガード解除、Googleクローラーが記事を読める状態に |
| 動的メタデータ | 各記事のtitle/descriptionをMicroCMSから自動生成 |
| JSON-LD構造化データ | Article Schema + BreadcrumbList Schema |
| パンくずリスト | UIコンポーネント + 構造化データ |
| サイトマップ | `src/app/sitemap.ts` → `/sitemap.xml` 自動生成 |
| robots.txt | `src/app/robots.ts` → `/robots.txt` |
| ルートメタデータ | title.template / description / OGP設定 |
| 各ページメタデータ | 道場/記事一覧/デイリー/クイズカテゴリの個別metadata |
| 運営者情報ページ | `/about` ページ新規作成 |
| OGP画像 | `/public/og-default.png`（1200x630px） |

---

## 🚀 次に実装予定のタスク

### SEO Phase 2: コンテンツ拡充

**SEO戦略書**: `/mnt/user-data/uploads/seo-strategy.md`
**実装手順書**: `/mnt/user-data/uploads/00_IMPLEMENTATION_GUIDE.md`

#### 要件

1. **血統ピラーページ作成**
   - 「競馬の血統入門｜知識ゼロから分かる血統の見方と活用法」
   - 5,000〜10,000字の包括的な記事
   - 狙うKW：「競馬 血統 入門」「競馬 血統 見方」「血統 わからない」

2. **既存18記事→ピラーページ内部リンク**
   - 各記事本文内にピラーページへのリンク追加
   - ピラーページから各記事へのリンク追加
   - クラスター間の横断リンクも設置

3. **記事末尾クイズCTA設置**
   - 記事カテゴリに対応するクイズへの導線
   - 「この知識をクイズで確認する」ボタン

4. **X（Twitter）アカウント開設・運用開始**
   - 毎日のミニクイズ投稿
   - 記事公開時の告知

5. **FAQ Schema対応**
   - FAQ形式の記事にFAQPage構造化データを追加

### SEO全体戦略の要点

- **ポジション**: 「予想サイト」ではなく「競馬学習プラットフォーム」
- **トピッククラスター**: 6クラスター（血統/コース/騎手/調教/予想/名馬）
- **キーワード戦略**: 「なぜ」「違い」「入門」「仕組み」系のロングテールを狙う
- **大手との差別化**: netkeiba等とは戦わず、学習意図のクエリで勝つ

---

## 📊 タスク進捗

- **完了**: 120/125 タスク（96%）
- **残り**: SEO Phase 2 の5タスク（#130〜#134）
- **Phase O**（レース一覧UI改善）: SEO Phase 2後に実施予定

---

## 📂 関連ファイル

### SEO関連
- `src/app/layout.tsx`（メタデータ追加済み）
- `src/app/sitemap.ts`
- `src/app/robots.ts`
- `src/components/seo/JsonLd.tsx`
- `src/components/seo/Breadcrumbs.tsx`
- `src/app/(main)/about/page.tsx`
- `src/app/(main)/dojo/articles/[articleId]/page.tsx`（公開化済み）

### レース一覧（Phase O改修対象）
- `src/app/(main)/races/page.tsx`
- `src/app/(main)/races/RacesClient.tsx`

### ドキュメント
- `TASKLIST_latest.md`
- `seo-strategy.md`
- `00_IMPLEMENTATION_GUIDE.md`

---

## 🔧 開発コマンド

```bash
# 開発サーバー起動
npm run dev

# ビルド
npm run build

# デプロイ（Vercel自動）
git push origin main
```

---

## 📝 次のチャットで伝えること

```
ゲートイン！の開発を続けます。

前回のセッションで以下が完了しています：
- Phase N（UIリデザイン＆ダークモード対応）完了
- MicroCMS連携完了（クイズ100問・記事18本投入済み）
- SEO Phase 1完了（メタデータ/JSON-LD/sitemap/robots/about等）

次のタスクは「SEO Phase 2: コンテンツ拡充」です。
SEO戦略書とImplementation Guideを添付します。

要件：
1. 血統ピラーページ作成（5,000〜10,000字）
2. 既存18記事⇔ピラーの相互内部リンク
3. 記事末尾クイズCTA設置
4. X（Twitter）運用開始
5. FAQ Schema対応
```

---

## ⚠️ 注意事項

- ダークモードは `useTheme()` フックで `isDark` を取得
- アクセントカラー: ダーク=amber-500、ライト=green-600
- サーバー/クライアントコンポーネント分離パターンを使用
- 記事ページは認証不要（公開）、クイズ受験・コメント等は認証必要
- MicroCMSからの記事取得: `getArticleDetail` 関数（`src/lib/microcms.ts`）
