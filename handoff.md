# ゲートイン！ 引き継ぎドキュメント

## 📅 最終更新: 2026-02-18

---

## 🏇 プロジェクト概要

**ゲートイン！** は競馬予想SNS＋学習プラットフォーム。ユーザーが競馬レースの予想を投稿し、的中率を競い合うソーシャルサービス。加えて、初心者向け学習記事やクイズも提供。

**本番URL**: Vercel にデプロイ済み
**リポジトリ**: `gate-in` (GitHub)

---

## 🏗️ アーキテクチャ

```
gate-in/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (main)/             # 認証後の主要ページ群
│   │   │   ├── mypage/         # マイページ、編集、セットアップ
│   │   │   ├── races/          # レース一覧・詳細
│   │   │   ├── rankings/       # ランキング
│   │   │   ├── timeline/       # タイムライン
│   │   │   ├── users/          # ユーザー検索・プロフィール
│   │   │   ├── settings/       # 設定
│   │   │   ├── contest/        # 大会
│   │   │   ├── dojo/           # 道場
│   │   │   └── admin/          # 管理画面
│   │   ├── api/                # APIルート
│   │   │   ├── profile/        # プロフィール CRUD + check-handle
│   │   │   ├── races/          # レース関連
│   │   │   ├── comments/       # コメント
│   │   │   ├── timeline/       # タイムライン
│   │   │   ├── rankings/       # ランキング
│   │   │   ├── follows/        # フォロー
│   │   │   └── ...
│   │   ├── auth/callback/      # OAuth コールバック
│   │   └── login/              # ログインページ
│   ├── components/
│   │   ├── ui/                 # 共通UI（AvatarPicker, UserAvatar, HandleInput, BackLink等）
│   │   ├── social/             # SNS系（TimelineItem, FollowList等）
│   │   ├── comments/           # コメント系
│   │   ├── rankings/           # ランキング系
│   │   ├── mypage/             # マイページ系（ProfileEditForm）
│   │   ├── layout/             # Header, HeaderClient
│   │   ├── landing/            # LandingPage
│   │   └── onboarding/         # WelcomeModal
│   ├── lib/
│   │   ├── constants/          # 定数
│   │   │   ├── avatars.ts      # アバター絵文字定義（20種類）
│   │   │   ├── handles.ts      # ユーザーハンドル バリデーション
│   │   │   ├── ng-words.ts     # NGワードフィルター（約250語）
│   │   │   └── ranks.ts        # ランク定義
│   │   ├── supabase/           # Supabase クライアント
│   │   └── rate-limit.ts       # レート制限
│   └── contexts/
│       └── ThemeContext.tsx     # ダークモード
├── gate-in-article-gen/        # 記事生成ツール（gitignore済）
│   ├── generate_articles.py    # Claude API で記事生成
│   ├── microcms-bulk-import.mjs # microCMS 一括投入
│   ├── masterplan.md           # 416記事のマスタープラン
│   └── output/                 # 生成済み記事JSON
└── supabase/migrations/        # DBマイグレーション
```

---

## 🗄️ データベース（Supabase）

### profiles テーブル（主要カラム）
| カラム | 型 | 説明 |
|--------|------|------|
| id | UUID (PK) | auth.users.id と同じ |
| display_name | TEXT | 表示名（1-20文字） |
| user_handle | TEXT (UNIQUE) | @handle（英小文字・数字・_、3-20文字） |
| bio | TEXT | 自己紹介（200文字以内） |
| avatar_url | TEXT | 画像URL（レガシー、未使用） |
| avatar_emoji | TEXT | アバター絵文字（デフォルト🏇） |
| rank_id | TEXT | ランクID |
| cumulative_points | INT | 累計ポイント |
| monthly_points | INT | 月間ポイント |
| total_votes | INT | 総投票数 |
| win_hits | INT | 1着的中数 |
| place_hits | INT | 複勝的中数 |
| best_streak | INT | 最長連勝 |
| current_streak | INT | 現在連勝 |
| is_verified | BOOL | 認証済みフラグ |
| setup_completed | BOOL | 初期設定完了フラグ |
| featured_badge_id | UUID | 表示バッジ |

### その他の主要テーブル
- **votes** — 予想投票
- **vote_picks** — 投票の各馬選択（◎○▲△）
- **comments** — レースコメント
- **comment_reactions** — コメントリアクション
- **follows** — フォロー関係
- **blocks** — ブロック関係
- **notifications** — 通知
- **user_badges** — ユーザーバッジ
- **badges** — バッジ定義
- **races** — レース情報
- **race_entries** — 出走馬
- **horses** — 馬情報
- **contests** — 大会
- **newspaper_members** — 予想新聞メンバー

---

## 🔑 重要な実装詳細

### アバターシステム
- `avatar_emoji` を優先、次に `avatar_url`、どちらもなければデフォルト（🏇）
- `UserAvatar` 共通コンポーネントで一元管理（xs/sm/md/lg/xl サイズ）
- 全API select クエリに `avatar_emoji` 追加済み

### ユーザーハンドル（@handle）
- `/users/[userId]` は UUID とハンドルの両方に対応
- UUID形式判定: `/^[0-9a-f]{8}-[0-9a-f]{4}-...$/i.test(userId)`
- 予約語ブロック: admin, api, login 等約30語
- リアルタイム重複チェック: `/api/profile/check-handle?handle=xxx`

### NGワードフィルター
- `checkNGWords()` — 複数フィールド一括チェック
- `checkNGWord()` — 単一テキストチェック
- `maskNGWords()` — マスク表示（＊＊＊置換）
- 全角→半角変換してもチェック
- 適用箇所: profile/setup, profile/PATCH, comments POST, comments PATCH

### LP（ランディングページ）
- `LandingPage.tsx` で `useEffect` による強制ライトモード
- アンマウント時にダークモード復帰
- ダークモード関連のクラスは削除済み

---

## 📰 記事生成システム

### ツール構成（gate-in-article-gen/）
- `masterplan.md` — 416記事の全体計画（15カテゴリ、Wave 1-13）
- `generate_articles.py` — Claude API (claude-sonnet-4-20250514) で記事生成
  - `--wave N` でWave指定、`--dry-run` でプレビュー
  - HTML形式で出力、メタデータ（articleType, quizCategory等）付き
- `microcms-bulk-import.mjs` — 生成JSONをmicroCMSに一括投入
  - カテゴリマッピング、スラッグ生成、重複スキップ

### microCMS スキーマ
- **articles** API: title, content, category, articleType[], parentPillar, relatedArticles[], quizCategory, readTime, difficulty, slug, excerpt
- **15カテゴリ**: beginner-basics, betting-types, race-analysis, pedigree, jockey-trainer, course-guide, data-statistics, advanced-strategy, uma-musume, mental-management, laws-manners, history-culture, overseas-racing, regional-racing, seasonal-guide
- **6クイズカテゴリ**: g1, basics, betting, analysis, trivia, records

### 生成進捗
| Wave | 本数 | コスト | ステータス |
|------|------|--------|-----------|
| W5 | 40本 | $2.23 | ✅ 投入済 |
| W6 | 53本 | $2.98 | ✅ 投入済 |
| W7 | - | - | 🔄 生成中 |
| W8-13 | - | - | ⏳ 未着手 |

### 投入手順
```bash
cd gate-in-article-gen
export ANTHROPIC_API_KEY=xxx

# 生成
python3 generate_articles.py --wave N

# **太字** → <strong> 変換
python3 -c "
import json, re, glob
files = glob.glob('output/WN/article-WN-*.json')
fixed = 0
for f in files:
    with open(f, 'r') as fh: d = json.load(fh)
    original = d['content']
    d['content'] = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', d['content'])
    if d['content'] != original:
        fixed += 1
        with open(f, 'w') as fh: json.dump(d, fh, ensure_ascii=False, indent=2)
print(f'{fixed}/{len(files)}件を修正')
"

# microCMS投入
export MICROCMS_API_KEY=xxx
node microcms-bulk-import.mjs WN
```

---

## 🔧 開発環境

```bash
cd ~/gate-in
npm run dev        # localhost:3000 (Turbopack)
```

### 環境変数（.env.local）
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_MICROCMS_SERVICE_DOMAIN`
- `NEXT_PUBLIC_MICROCMS_API_KEY`

---

## ⚠️ 既知の注意点

1. **avatar_url はレガシー** — 画像アップロード機能は未実装、avatar_emoji を使用
2. **全角バッククォート問題** — 一部のテンプレートリテラルが `` ` `` ではなく全角 `` ` `` になっている可能性（HeaderClient等で発生歴あり）
3. **NGワードの「バカ」「アホ」** — 競馬会話で「バカ当たり！」等の用途あり、必要に応じ調整
4. **backup-*.json, gate-in-article-gen/** は .gitignore 済み
5. **記事生成の後処理** — `**bold**` → `<strong>bold</strong>` 変換が毎回必要
