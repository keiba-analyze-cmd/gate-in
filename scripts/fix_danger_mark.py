#!/usr/bin/env python3
"""
危険馬マーク（△→⚠️）を一括置換するスクリプト

使用方法:
  mv ~/Downloads/fix_danger_mark.py ~/gate-in/scripts/
  cd ~/gate-in && python scripts/fix_danger_mark.py
  npm run build
  git add -A && git commit -m "fix: 危険馬マークを△から⚠️に変更" && git push
"""

from pathlib import Path
import re

# 置換対象ファイルと置換ルール
TARGET_FILES = [
    "src/app/(main)/guide/points/page.tsx",
    "src/app/(main)/mypage/votes/page.tsx",
    "src/app/(main)/mypage/points/page.tsx",
    "src/app/(main)/races/[raceId]/page.tsx",
    "src/components/social/UserActivityFeed.tsx",
    "src/components/social/TimelineItem.tsx",
    "src/components/races/VoteEditForm.tsx",
    "src/components/races/VoteDistribution.tsx",
    "src/components/races/HorseList.tsx",
    "src/components/races/RaceResultTable.tsx",
    "src/components/races/VoteForm.tsx",
    "src/components/races/VoteSummary.tsx",
    "src/components/onboarding/WelcomeModal.tsx",
    "src/lib/constants/ranks.ts",
]

def replace_danger_mark(content: str) -> str:
    """△を⚠️に置換（危険馬関連のコンテキストのみ）"""
    
    # パターン別に置換
    replacements = [
        # mark: "△" → mark: "⚠️"
        (r'mark: "△"', 'mark: "⚠️"'),
        # return "△" → return "⚠️"
        (r'return "△"', 'return "⚠️"'),
        # △ 危険馬 → ⚠️ 危険馬
        (r'△ 危険馬', '⚠️ 危険馬'),
        # △ 危険 → ⚠️ 危険
        (r'△ 危険', '⚠️ 危険'),
        # △危険 → ⚠️危険
        (r'△危険', '⚠️危険'),
        # （△） → （⚠️）
        (r'（△）', '（⚠️）'),
        # ◎○△ → ◎○⚠️
        (r'◎○△', '◎○⚠️'),
        # 単独の △ で始まる行（危険馬表示）
        (r'>△ ', '>⚠️ '),
        (r'"△ ', '"⚠️ '),
        (r"'△ ", "'⚠️ "),
        # {isDanger && <span ...>△</span>} のパターン
        (r'>△<', '>⚠️<'),
    ]
    
    for pattern, replacement in replacements:
        content = re.sub(pattern, replacement, content)
    
    return content


def main():
    script_dir = Path(__file__).parent
    if script_dir.name == "scripts":
        project_root = script_dir.parent
    else:
        project_root = Path.cwd()
    
    print("🔧 危険馬マーク（△→⚠️）を置換します...")
    print(f"   プロジェクトルート: {project_root}")
    print("")
    
    updated_files = []
    
    for file_path_str in TARGET_FILES:
        file_path = project_root / file_path_str
        
        if not file_path.exists():
            print(f"⚠️  ファイルが見つかりません: {file_path_str}")
            continue
        
        content = file_path.read_text(encoding="utf-8")
        original_content = content
        
        new_content = replace_danger_mark(content)
        
        if new_content != original_content:
            file_path.write_text(new_content, encoding="utf-8")
            
            # 変更箇所をカウント
            old_count = original_content.count("△")
            new_count = new_content.count("△")
            replaced = old_count - new_count
            
            updated_files.append((file_path_str, replaced))
            print(f"✅ {file_path_str} ({replaced}箇所)")
        else:
            print(f"⏭️  {file_path_str} (変更なし)")
    
    print("")
    if updated_files:
        total = sum(count for _, count in updated_files)
        print(f"🎉 完了！ {len(updated_files)}ファイル、{total}箇所を置換しました")
        print("")
        print("🚀 次のステップ:")
        print("   1. npm run build")
        print("   2. git add -A && git commit -m 'fix: 危険馬マークを△から⚠️に変更' && git push")
    else:
        print("ℹ️  変更対象がありませんでした")


if __name__ == "__main__":
    main()
