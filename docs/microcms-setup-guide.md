# MicroCMS API設定ガイド & 一括投入スクリプト

---

## Part 1: APIスキーマ設定手順

### 1-1. `articles`（記事）API を作成する

MicroCMS管理画面で **「APIを作成」** → 以下の通り設定してください。

```
API名:     記事
エンドポイント: articles
APIの型:    リスト形式
```

**フィールド設定（上から順に追加）：**

| # | フィールド名 | 表示名 | 種類 | 必須 | 補足設定 |
|---|-------------|--------|------|:----:|---------|
| 1 | title | タイトル | テキストフィールド | ✅ | — |
| 2 | slug | スラッグ | テキストフィールド | ✅ | 「ユニーク」にチェック |
| 3 | category | カテゴリ | コンテンツ参照 | ✅ | 参照先: `article-categories` |
| 4 | thumbnail | サムネイル | 画像 | — | — |
| 5 | emoji | アイコン絵文字 | テキストフィールド | — | — |
| 6 | excerpt | 概要（meta description） | テキストエリア | — | — |
| 7 | content | 本文 | リッチエディタ | ✅ | — |
| 8 | readTime | 読了時間（分） | 数値 | — | — |
| 9 | hasQuiz | クイズ付き | 真偽値 | — | — |
| 10 | isPremium | プレミアム記事 | 真偽値 | — | — |
| 11 | tags | タグ | 複数コンテンツ参照 | — | 参照先: `tags` |
| 12 | publishedAt | 公開日時 | 日時 | — | — |

**操作手順（1フィールドずつ）：**

```
1. 管理画面 → 「API設定」 → 「APIスキーマ」タブ
2. 「フィールドを追加」をクリック
3. 「フィールドID」に上表のフィールド名を入力（例: title）
4. 「表示名」を入力（例: タイトル）
5. 「種類」をプルダウンから選択
6. 必須の場合は「必須項目にする」にチェック
7. 特殊設定がある場合は詳細設定で追加
8. 「追加」をクリック
9. 次のフィールドへ → 2に戻る
```

**slug フィールドの追加設定：**
```
→ 詳細設定で「ユニーク」にチェックを入れる
  （同じスラッグの記事が重複作成されるのを防止）
```

**category フィールドの設定：**
```
→ 種類「コンテンツ参照」を選択
→ 参照先のAPIで「article-categories」を選択
```

**tags フィールドの設定：**
```
→ 種類「複数コンテンツ参照」を選択
→ 参照先のAPIで「tags」を選択
```

---

### 1-2. `quiz-questions`（クイズ問題）API を作成する

```
API名:     クイズ問題
エンドポイント: quiz-questions
APIの型:    リスト形式
```

**フィールド設定：**

| # | フィールド名 | 表示名 | 種類 | 必須 | 補足設定 |
|---|-------------|--------|------|:----:|---------|
| 1 | question | 問題文 | テキストエリア | ✅ | — |
| 2 | category | カテゴリ | コンテンツ参照 | ✅ | 参照先: `quiz-categories` |
| 3 | level | 難易度 | セレクトフィールド | ✅ | 選択肢: beginner / intermediate / advanced / master |
| 4 | choice1 | 選択肢1 | テキストフィールド | ✅ | — |
| 5 | choice2 | 選択肢2 | テキストフィールド | ✅ | — |
| 6 | choice3 | 選択肢3 | テキストフィールド | — | — |
| 7 | choice4 | 選択肢4 | テキストフィールド | — | — |
| 8 | correctIndex | 正解番号 | 数値 | ✅ | 1〜4の数値 |
| 9 | explanation | 解説 | リッチエディタ | — | — |
| 10 | order | 表示順 | 数値 | — | — |

**level フィールドの設定：**
```
→ 種類「セレクトフィールド」を選択
→ 選択肢に以下を1つずつ追加:
   beginner
   intermediate
   advanced
   master
```

**category フィールドの設定：**
```
→ 種類「コンテンツ参照」を選択
→ 参照先のAPIで「quiz-categories」を選択
```

---

### 1-3. 設定完了チェックリスト

```
□ articles API が作成できた
  □ 12フィールドすべて追加した
  □ slug にユニーク制約を設定した
  □ category → article-categories への参照が正しい
  □ tags → tags への複数参照が正しい

□ quiz-questions API が作成できた
  □ 10フィールドすべて追加した
  □ level にセレクトフィールド（4択）を設定した
  □ category → quiz-categories への参照が正しい

□ APIキーの確認
  □ 管理画面 → 「APIキー」で書き込み権限付きキーを確認
  □ サービスID（gatein）を確認
```

---

## Part 2: カテゴリ・タグの登録（スクリプトで自動化）

カテゴリとタグの中身はまだ空なので、投入スクリプトで一括登録します。
手動で1つずつ入力する必要はありません。

スクリプトが `PUT`（IDを指定して作成）で以下を自動登録します：

```
■ article-categories（6件）:
  blood       → 🧬 血統
  course      → 🏟️ コース攻略
  jockey      → 👨‍✈️ 騎手分析
  trainer     → 👔 調教師
  prediction  → 📊 予想術
  legend      → 🏆 名馬列伝

■ quiz-categories（4件）:
  blood   → 🧬 血統マスター
  g1      → 🏇 G1メモリアル
  jockey  → 👨‍✈️ 騎手検定
  course  → 🏟️ コース攻略

■ tags（24件）:
  deep-impact, kitasan-black, lord-kanaloa, blood, sire,
  turf, dirt, middle-distance, sprint, long-distance,
  tokyo, nakayama, hanshin, kyoto, lemaire, take-yutaka,
  g1, triple-crown, pedigree-analysis, heavy-track,
  course-strategy, pace, odds, recovery-rate
```

IDを自分で指定しているため、後のクイズ・記事投入時に
カテゴリ参照がそのまま動きます。

---

## Part 3: 一括投入の実行手順

### 準備

ファイルはgate-inプロジェクト内に以下の通り配置済みです：

```
gate-in/
├── docs/
│   ├── microcms-setup-guide.md          ← このガイド
│   ├── gate-in-content-strategy.md      ← コンテンツ戦略
│   └── quiz-factcheck-list.md           ← ファクトチェックリスト
└── scripts/
    ├── microcms-import.mjs              ← 投入スクリプト
    └── data/
        ├── quiz-questions-all-100.json  ← クイズ100問
        └── sample-article-deep-impact.json ← サンプル記事
```

### MicroCMS APIキーの確認

```
管理画面 → 左メニュー「APIキー」→ 書き込み権限のあるキーをコピー
（デフォルトのキーは読み取り専用の場合があるので注意）
```

### 実行（順番が重要！）

```bash
# gate-in/scripts ディレクトリに移動
cd scripts

# Step 1: カテゴリ＋タグを先に登録（クイズ・記事の参照先になる）
MICROCMS_API_KEY=xxxxx node microcms-import.mjs categories

# Step 2: クイズ100問を投入（約2分かかります）
MICROCMS_API_KEY=xxxxx node microcms-import.mjs quiz

# Step 3: サンプル記事を投入
MICROCMS_API_KEY=xxxxx node microcms-import.mjs article

# または全部一括（Step 1→2→3 を自動で順番に実行）
MICROCMS_API_KEY=xxxxx node microcms-import.mjs all
```

### エラーが出た場合

| エラー | 原因 | 対処 |
|-------|------|------|
| `401 Unauthorized` | APIキーが無効 | 書き込み権限付きキーか確認 |
| `404 Not Found` | APIエンドポイントが存在しない | articles / quiz-questions のAPI作成を確認 |
| `400 Bad Request` | フィールド名の不一致 | APIスキーマのフィールドIDがガイド通りか確認 |
| `409 Conflict` | 同じIDのコンテンツが既に存在 | 再実行時はPUTで上書きされるため基本OK |

### 投入後の確認

```
1. MicroCMS管理画面で各APIを開いてデータが入っているか確認
2. article-categories → 6件表示されるか
3. quiz-categories → 4件表示されるか
4. tags → 24件表示されるか
5. quiz-questions → 100件表示されるか
6. articles → 1件表示されるか
```
