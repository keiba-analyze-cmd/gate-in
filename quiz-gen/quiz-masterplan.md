# 🎯 クイズ作問マスタープラン

> **目標: 50コース × 10ステージ × 10問 = 5,000問**
> **方式: 記事ベースClaude API自動生成 → microCMSアップロード**

---

## 📊 50コース設計（15クラスター → 50コース）

| # | クラスター | 記事数 | コース数 | コースID例 |
|---|----------|--------|---------|-----------|
| 1 | 血統 | 45 | 4 | blood_basics / blood_sire / blood_broodmare / blood_advanced |
| 2 | コース攻略 | 55 | 5 | course_tokyo / course_nakayama / course_kyoto / course_hanshin / course_local |
| 3 | 馬券・予想理論 | 60 | 5 | ticket_basics / ticket_types / ticket_odds / ticket_strategy / ticket_advanced |
| 4 | 騎手 | 40 | 3 | jockey_basics / jockey_data / jockey_strategy |
| 5 | 調教・厩舎 | 35 | 3 | training_basics / training_analysis / stable_guide |
| 6 | 名馬・歴史 | 50 | 4 | history_classics / history_champions / history_records / history_modern |
| 7 | 競馬場ガイド | 50 | 5 | venue_kanto / venue_kansai / venue_local_east / venue_local_west / venue_facilities |
| 8 | 馬券術・回収率 | 40 | 3 | roi_basics / roi_methods / roi_advanced |
| 9 | 初心者入門 | 35 | 3 | beginner_first / beginner_watching / beginner_betting |
| 10 | データ分析 | 30 | 3 | data_basics / data_pace / data_tools |
| 11 | 地方競馬 | 30 | 3 | local_intro / local_races / local_betting |
| 12 | 海外競馬 | 25 | 2 | overseas_basics / overseas_major |
| 13 | POG・一口馬主 | 25 | 2 | pog_basics / pog_advanced |
| 14 | 競馬メディア活用 | 20 | 2 | media_newspaper / media_digital |
| 15 | ウマ娘→リアル競馬 | 30 | 3 | umamusume_intro / umamusume_real / umamusume_advanced |
| | **合計** | **570** | **50** | |

---

## 🏗️ コース別詳細設計

### クラスター1: 血統（4コース）

**コース1: blood_basics — 血統入門**
| Stage | トピック | 対応記事例 |
|-------|---------|-----------|
| 1 | サラブレッドの血統とは | 血統とは？初心者ガイド |
| 2 | 父系・母系の基本 | 父系と母系の違い |
| 3 | サンデーサイレンス系 | SS系の特徴と予想活用 |
| 4 | ディープインパクト産駒 | ディープ産駒の傾向 |
| 5 | キングカメハメハ系 | キンカメ産駒の特徴 |
| 6 | ロードカナロア産駒 | ロードカナロア産駒 |
| 7 | 距離適性と血統 | 血統と距離適性の関係 |
| 8 | 馬場適性と血統 | 重馬場に強い血統 |
| 9 | 2歳戦での血統活用 | 新馬戦で血統が重要な理由 |
| 10 | 血統予想の実践 | 血統予想データ検証 |

**コース2: blood_sire — 種牡馬研究**
（キズナ/モーリス/オルフェーヴル/ハーツクライ/エピファネイア/ドゥラメンテ...）

**コース3: blood_broodmare — 母系研究**
（母父/ファミリー/牝系/繁殖牝馬...）

**コース4: blood_advanced — 血統上級**
（ニックス/インブリード/リーディングサイアー/海外血統...）

### クラスター9: 初心者入門（3コース）

**コース1: beginner_first — はじめての競馬**
| Stage | トピック | 対応記事例 |
|-------|---------|-----------|
| 1 | 競馬のルールを知ろう | 競馬の基本ルール |
| 2 | 競馬場に行ってみよう | 競馬場の楽しみ方 |
| 3 | 馬券の種類を覚えよう | 馬券の種類と買い方 |
| 4 | 単勝・複勝で始めよう | 初心者は単複から |
| 5 | オッズの見方 | オッズの仕組み |
| 6 | 出馬表の見方 | 出馬表の読み方 |
| 7 | パドックの見方 | パドック観察入門 |
| 8 | 返し馬の見方 | 返し馬チェック |
| 9 | 初めての予想 | 初心者でもできる予想法 |
| 10 | 実践！馬券を買おう | 馬券購入ガイド |

（他48コースも同様の構成）

---

## 🤖 クイズ自動生成フロー

```
記事HTML(microCMS) → Claude API → 10問のクイズJSON → microCMSにPOST
```

### ステップ

1. **記事取得**: microCMSから記事コンテンツを取得
2. **クイズ生成**: Claude APIで記事内容から4択10問を生成
3. **品質チェック**: 自動バリデーション（重複/形式）
4. **アップロード**: microCMS quiz-questions エンドポイントにPOST
5. **マッピング**: コースID・ステージIDとクイズ問題を紐付け

### 1記事 → 10問の生成プロンプト

```
以下の記事の内容に基づいて、4択クイズを10問作成してください。

## ルール
- 記事の重要ポイントから出題すること
- 4つの選択肢を用意し、正解は1つ
- 解説は記事の内容を踏まえて100-200文字で
- 難易度はステージ番号に応じて調整（1=易 → 10=難）
- 選択肢は紛らわしいが明確に間違いとわかるものを含める
- 「すべて正しい」「どれも違う」等の選択肢は避ける

## 出力形式（JSON）
[
  {
    "question": "問題文",
    "choice1": "選択肢A",
    "choice2": "選択肢B", 
    "choice3": "選択肢C",
    "choice4": "選択肢D",
    "correctIndex": 1,  // 1-4
    "explanation": "解説文",
    "difficulty": 1  // 1-5
  }
]
```

---

## 📁 データモデル拡張

### microCMS: quiz-questions スキーマ
既存フィールドに加えて以下を追加:
- `courseId` (テキスト): コースID（例: "blood_basics"）
- `stageId` (数値): ステージ番号（1-10）
- `sourceArticleId` (テキスト): 元記事のID

### Supabase: dojo_progress テーブル
既存のまま使用可能（course_id, stage_id, stars, best_score）

### コース定義: src/lib/constants/dojo.ts
4コース → 50コースに拡張。コースメタデータ（名前、アイコン、説明、クラスター）を追加。

---

## 📅 実行スケジュール

| フェーズ | 内容 | 所要時間 |
|---------|------|---------|
| Phase A | 50コースマスターデータ作成 + dojo.ts拡張 | 1日 |
| Phase B | クイズ生成スクリプト開発・テスト | 1日 |
| Phase C | 記事Wave5-6対応分（82記事 → 820問） | 2-3日 |
| Phase D | 記事Wave7-9対応分（134記事 → 1340問） | 3-5日 |
| Phase E | 残り記事対応（284記事 → 2840問） | 5-8日 |
| | **合計** | **~2-3週間** |

※ Claude APIの並列実行で大幅短縮可能
