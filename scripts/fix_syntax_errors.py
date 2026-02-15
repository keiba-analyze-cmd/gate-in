#!/usr/bin/env python3
"""
複数ファイルの構文エラーを一括修正するスクリプト

問題: 
  - href=`...`} → href={`...`}
  - className=`...`} → className={`...`}
  - fetch`...`, → fetch(`...`,

使用方法:
  mv ~/Downloads/fix_syntax_errors.py ~/gate-in/scripts/
  cd ~/gate-in && python3 scripts/fix_syntax_errors.py
"""

from pathlib import Path
import re

def fix_file(file_path: Path) -> tuple[int, list[str]]:
    """ファイルの構文エラーを修正。修正数と修正内容を返す"""
    if not file_path.exists():
        return 0, [f"ファイルなし: {file_path}"]
    
    content = file_path.read_text(encoding="utf-8")
    original = content
    fixes = []
    
    # パターン1: href=`...`} → href={`...`}
    pattern1 = re.compile(r'href=`([^`]+)`\}')
    matches1 = pattern1.findall(content)
    if matches1:
        content = pattern1.sub(r'href={`\1`}', content)
        fixes.append(f"href: {len(matches1)}箇所")
    
    # パターン2: className=`...`} → className={`...`}
    pattern2 = re.compile(r'className=`([^`]+)`\}')
    matches2 = pattern2.findall(content)
    if matches2:
        content = pattern2.sub(r'className={`\1`}', content)
        fixes.append(f"className: {len(matches2)}箇所")
    
    # パターン3: fetch`...`, → fetch(`...`,
    pattern3 = re.compile(r'fetch`([^`]+)`,')
    matches3 = pattern3.findall(content)
    if matches3:
        content = pattern3.sub(r'fetch(`\1`,', content)
        fixes.append(f"fetch: {len(matches3)}箇所")
    
    # パターン4: fetch`...`) → fetch(`...`)
    pattern4 = re.compile(r'fetch`([^`]+)`\)')
    matches4 = pattern4.findall(content)
    if matches4:
        content = pattern4.sub(r'fetch(`\1`)', content)
        fixes.append(f"fetch(終端): {len(matches4)}箇所")
    
    if content != original:
        file_path.write_text(content, encoding="utf-8")
        return len(matches1) + len(matches2) + len(matches3) + len(matches4), fixes
    
    return 0, []


def main():
    script_dir = Path(__file__).parent
    if script_dir.name == "scripts":
        project_root = script_dir.parent
    else:
        project_root = Path.cwd()
    
    # 修正対象ファイル
    target_files = [
        "src/components/layout/BottomNav.tsx",
        "src/components/social/TimelineItem.tsx",
        "src/components/social/FollowingVotes.tsx",
        "src/components/social/LikeButton.tsx",
        "src/components/admin/AdminScrapeForm.tsx",
    ]
    
    print("=== 構文エラー一括修正 ===\n")
    
    total_fixes = 0
    for rel_path in target_files:
        file_path = project_root / rel_path
        count, fixes = fix_file(file_path)
        
        if count > 0:
            print(f"✅ {rel_path}")
            for fix in fixes:
                print(f"   - {fix}")
            total_fixes += count
        elif file_path.exists():
            print(f"⚪ {rel_path} (変更なし)")
        else:
            print(f"⚠️  {rel_path} (ファイルなし)")
    
    print("")
    if total_fixes > 0:
        print(f"🎉 合計 {total_fixes} 箇所を修正しました")
    else:
        print("⚠️  修正対象が見つかりませんでした")
    
    # 追加: srcディレクトリ内の全tsx/tsファイルをスキャン
    print("\n--- 追加スキャン（src内の全ファイル）---")
    src_dir = project_root / "src"
    additional_fixes = 0
    
    for file_path in src_dir.rglob("*.tsx"):
        if any(t in str(file_path) for t in target_files):
            continue  # 既に処理済み
        count, fixes = fix_file(file_path)
        if count > 0:
            print(f"✅ {file_path.relative_to(project_root)}")
            for fix in fixes:
                print(f"   - {fix}")
            additional_fixes += count
    
    for file_path in src_dir.rglob("*.ts"):
        if any(t in str(file_path) for t in target_files):
            continue
        count, fixes = fix_file(file_path)
        if count > 0:
            print(f"✅ {file_path.relative_to(project_root)}")
            for fix in fixes:
                print(f"   - {fix}")
            additional_fixes += count
    
    if additional_fixes > 0:
        print(f"\n🎉 追加で {additional_fixes} 箇所を修正しました")
    else:
        print("追加の修正対象なし")


if __name__ == "__main__":
    main()
