#!/usr/bin/env python3
"""
TASKLIST.md と hand_off.md を更新するスクリプト

更新内容:
1. 既知の課題を解決済みに更新
2. Phase M（新機能）を追加
3. Phase N（UI刷新）を追加
4. hand_off.md にブレスト結果・UI方針を追記

使用方法:
  mv ~/Downloads/update_project_docs.py ~/gate-in/scripts/
  cd ~/gate-in && python scripts/update_project_docs.py
  git add -A && git commit -m "docs: Phase M/N追加、UI刷新方針を記録" && git push
"""

from pathlib import Path
from datetime import datetime

def update_tasklist(project_root: Path) -> bool:
    """TASKLIST.md を更新"""
    tasklist_path = project_root / "TASKLIST.md"
    
    if not tasklist_path.exists():
        print(f"❌ TASKLIST.md が見つかりません: {tasklist_path}")
        return False
    
    content = tasklist_path.read_text(encoding="utf-8")
    today = datetime.now().strftime("%Y-%m-%d")
    
    # 最終更新日を更新
    import re
    content = re.sub(
        r'> \*\*最終更新: \d{4}-\d{2}-\d{2}\*\*',
        f'> **最終更新: {today}**',
        content
    )
    
    # サマリーを更新（73→73完了、17→23未着手、合計90→96）
    content = re.sub(
        r'\| ✅ 完了 \| \d+ \|',
        '| ✅ 完了 | 73 |',
        content
    )
    content = re.sub(
        r'\| 🔴 未着手 \| \d+ \|',
        '| 🔴 未着手 | 23 |',
        content
    )
    content = re.sub(
        r'\| \*\*合計\*\* \| \*\*\d+\*\* \|',
        '| **合計** | **96** |',
        content
    )
    
    # 実施順序に Phase M, N を追加
    old_order = "Phase G        → 将来機能（3ヶ月〜） ← 次はここ"
    new_order = """Phase M        → 新機能開発 ← 次はここ
Phase N        → UI刷新
Phase G        → 将来機能（3ヶ月〜）"""
    
    if old_order in content:
        content = content.replace(old_order, new_order)
    
    # 既知の課題セクションを更新
    old_issues = """## 📝 既知の課題・TODO

- [ ] 京都記念のgradeがOP→G2に修正必要（SQL: `UPDATE races SET grade = 'G2' WHERE name = '京都記念' AND race_date = '2026-02-15';`）
- [ ] 共同通信杯のgradeがOP→G3に修正必要（SQL: `UPDATE races SET grade = 'G3' WHERE name = '共同通信杯' AND race_date = '2026-02-15';`）
- [ ] スクレイプ時のグレード判定ロジック確認（G2/G3が正しく取得できていない可能性 → `src/app/api/admin/scrape/route.ts` 要調査）
- [ ] Cron投票カウント更新の動作確認"""

    new_issues = """## 📝 既知の課題・TODO

### ✅ 解決済み（2026-02-15）
- [x] 京都記念のgrade修正（OP→G2）→ DB反映済み
- [x] 共同通信杯のgrade修正（OP→G3）→ DB反映済み
- [x] スクレイプのグレード判定ロジック改善 → titleタグ・Icon_GradeTypeクラス名から判定するよう修正
- [x] Cron投票カウント確認 → votesテーブルからリアルタイム集計で問題なし

### 🔴 未解決
（現在なし）"""

    if old_issues in content:
        content = content.replace(old_issues, new_issues)
    
    # Phase G の前に Phase M, N を追加
    phase_m_n = """
---

## 🔴 Phase M: 新機能（Tier 1-2）

> ブレスト実施日: 2026-02-15
> 優先順位: Tier 1 → Tier 2 の順で実装

### Tier 1: コア機能（差別化 × 実装価値 高）

| # | タスク | 説明 | 状態 |
|---|--------|------|------|
| 88 | My競馬新聞 | フォロー5人の印を横並び表示（競馬新聞風UI） | 🔴未着手 |
| 89 | WIN5予想 | 5レースまとめて予想、的中シミュレーター付き | 🔴未着手 |
| 90 | グループ対戦 | 仲間内でポイント勝負、期間・対象レース指定可 | 🔴未着手 |

### Tier 2: エンゲージメント強化

| # | タスク | 説明 | 状態 |
|---|--------|------|------|
| 91 | 予想の「乗っかり」機能 | 上級者の予想をワンタップコピー | 🔴未着手 |
| 92 | 週間MVP表彰 | 自動表彰でタイムライン投稿 | 🔴未着手 |
| 93 | 予想バトル（1on1） | ユーザー同士の直接対決 | 🔴未着手 |

---

## 🔴 Phase N: UI刷新

> 方針決定日: 2026-02-15
> コンセプト: 白ベース × プレミアム × SNS強調 + ダークモード選択制

| # | タスク | 説明 | 状態 |
|---|--------|------|------|
| 94 | テーマシステム実装 | ライト/ダークモード切り替え、localStorage永続化 | 🔴未着手 |
| 95 | トップページリデザイン | SNS要素強調、みんなの印、予想フィード中心 | 🔴未着手 |
| 96 | 共通コンポーネント刷新 | テーマ対応のカード、ボタン、バッジ等 | 🔴未着手 |

"""

    # Phase G の直前に挿入
    phase_g_marker = "## 🔴 Phase G: 将来機能（3ヶ月〜）"
    if phase_g_marker in content and "## 🔴 Phase M:" not in content:
        content = content.replace(phase_g_marker, phase_m_n + phase_g_marker)
    
    tasklist_path.write_text(content, encoding="utf-8")
    print("✅ TASKLIST.md を更新しました")
    return True


def update_handoff(project_root: Path) -> bool:
    """hand_off.md を更新"""
    handoff_path = project_root / "hand_off.md"
    
    if not handoff_path.exists():
        print(f"❌ hand_off.md が見つかりません: {handoff_path}")
        return False
    
    content = handoff_path.read_text(encoding="utf-8")
    today = datetime.now().strftime("%Y-%m-%d")
    
    # 最終更新日を更新
    import re
    content = re.sub(
        r'> \*\*最終更新: \d{4}-\d{2}-\d{2}\*\*',
        f'> **最終更新: {today}**',
        content
    )
    
    # 現在の状態を更新
    content = re.sub(
        r'\*\*進捗\*\*: \d+/\d+タスク完了',
        '**進捗**: 73/96タスク完了',
        content
    )
    content = re.sub(
        r'\*\*次のフェーズ\*\*: Phase G',
        '**次のフェーズ**: Phase M（新機能）→ Phase N（UI刷新）',
        content
    )
    
    # 新しいセクションを追加（ファイル末尾）
    new_section = """

---

## 新機能ブレスト結果（2026-02-15）

### 決定した優先順位

| Tier | 機能 | 狙い |
|------|------|------|
| **Tier 1** | My競馬新聞、WIN5予想、グループ対戦 | 差別化、コア機能 |
| **Tier 2** | 乗っかり機能、週間MVP、予想バトル | エンゲージメント |
| **Tier 3** | 予想根拠カード、スタイル診断、推し馬一覧 | 分析・可視化 |
| **Tier 4** | 実況チャット、師弟システム | コミュニティ深化 |

### 各機能の概要

#### My競馬新聞 🗞️
- フォロー中のユーザーをMAX5人指定
- 競馬新聞の印表記風に横並び表示
- 自分の印も含めて6列表示

#### WIN5予想 🎯
- 対象5レースを一画面で表示
- フォーメーション（各レース複数頭選択可）
- 的中シミュレーター（組み合わせ数・金額表示）
- WIN5的中者には特別バッジ

#### グループ対戦 ⚔️
- ユーザー同士でグループ作成
- 期間・対象レースを指定して勝負
- グループ内ランキング表示

---

## UI刷新方針（2026-02-15）

### コンセプト
「白ベース × プレミアムな見せ方 × SNS強調」+ ダークモード選択制

### 配色

| モード | 背景 | アクセント | 印象 |
|--------|------|-----------|------|
| ライト | 白〜グレー50 | グリーン600 | 爽やか、初心者向け |
| ダーク | スレート950 | アンバー400（金） | 高級感、玄人向け |

### 主要UIセクション（トップページ）
1. **ヒーロー**: 今日のメイン重賞、予想人数、カウントダウン
2. **みんなの印**: 馬別の◎○△分布バー
3. **予想フィード**: フォロー中/人気/最新タブ切り替え
4. **予想カード**: ユーザー情報、印、コメント、「乗っかる」ボタン
5. **注目の予想家**: 横スクロール、的中率・連勝表示
6. **本日のレース**: 予想人数付きリスト
7. **ボトムナビ**: 中央に予想CTAボタン

### ワイヤーフレーム
以下のファイルをダウンロード済み:
- `gate-in-redesign.jsx` - 白ベース版
- `gate-in-pro-design.jsx` - ダーク版
- `gate-in-theme-switcher.jsx` - テーマ切り替え統合版

### 実装時の考慮点
- テーマ設定は `localStorage` で永続化
- `prefers-color-scheme` でOS設定との連動も可能
- 全色設定を1つのテーマオブジェクトで管理
"""

    # 既に追加済みかチェック
    if "## 新機能ブレスト結果" not in content:
        content += new_section
        handoff_path.write_text(content, encoding="utf-8")
        print("✅ hand_off.md を更新しました")
    else:
        print("ℹ️ hand_off.md は既に更新済みです")
    
    return True


def main():
    script_dir = Path(__file__).parent
    if script_dir.name == "scripts":
        project_root = script_dir.parent
    else:
        project_root = Path.cwd()
    
    print("📝 プロジェクトドキュメントを更新します...")
    print(f"   プロジェクトルート: {project_root}")
    print("")
    
    success1 = update_tasklist(project_root)
    success2 = update_handoff(project_root)
    
    if success1 and success2:
        print("")
        print("🎉 更新完了！")
        print("")
        print("🚀 次のステップ:")
        print("   git add -A && git commit -m 'docs: Phase M/N追加、UI刷新方針を記録' && git push")
    else:
        print("")
        print("⚠️ 一部の更新に失敗しました。手動で確認してください。")


if __name__ == "__main__":
    main()
