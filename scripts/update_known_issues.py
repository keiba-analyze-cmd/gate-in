#!/usr/bin/env python3
"""
TASKLIST.mdの既知の課題セクションを更新するスクリプト

使用方法:
  mv ~/Downloads/update_known_issues.py ~/gate-in/scripts/
  cd ~/gate-in && python scripts/update_known_issues.py
  git add -A && git commit -m "docs: 既知の課題を解決済みに更新" && git push
"""

from pathlib import Path
from datetime import datetime

def main():
    script_dir = Path(__file__).parent
    if script_dir.name == "scripts":
        project_root = script_dir.parent
    else:
        project_root = Path.cwd()
    
    tasklist_path = project_root / "TASKLIST.md"
    
    if not tasklist_path.exists():
        print(f"❌ ファイルが見つかりません: {tasklist_path}")
        return False
    
    content = tasklist_path.read_text(encoding="utf-8")
    
    # 最終更新日を今日に
    today = datetime.now().strftime("%Y-%m-%d")
    content = content.replace(
        "> **最終更新: 2026-02-15**",
        f"> **最終更新: {today}**"
    )
    
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
        tasklist_path.write_text(content, encoding="utf-8")
        print("✅ TASKLIST.md を更新しました！")
        print("")
        print("📝 変更内容:")
        print("   - 既知の課題4件を「解決済み」に更新")
        print("")
        print("🚀 次のステップ:")
        print("   git add -A && git commit -m 'docs: 既知の課題を解決済みに更新' && git push")
        return True
    else:
        print("⚠️ 既知の課題セクションが見つからないか、既に更新済みです。")
        
        # 部分一致で確認
        if "京都記念のgradeがOP→G2に修正必要" in content:
            print("📝 パターンが若干異なります。手動での更新をお勧めします。")
        elif "解決済み（2026-02-15）" in content:
            print("✅ 既に更新済みです。")
        
        return False

if __name__ == "__main__":
    main()
