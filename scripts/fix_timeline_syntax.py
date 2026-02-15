#!/usr/bin/env python3
"""
TimelineItem.tsxの構文エラーを修正するスクリプト

問題: href=`...` と fetch`...` の構文が壊れている
修正: href={`...`} と fetch(`...`) に修正

使用方法:
  mv ~/Downloads/fix_timeline_syntax.py ~/gate-in/scripts/
  cd ~/gate-in && python3 scripts/fix_timeline_syntax.py
"""

from pathlib import Path
import re

def main():
    script_dir = Path(__file__).parent
    if script_dir.name == "scripts":
        project_root = script_dir.parent
    else:
        project_root = Path.cwd()
    
    file_path = project_root / "src" / "components" / "social" / "TimelineItem.tsx"
    
    if not file_path.exists():
        print(f"❌ TimelineItem.tsx が見つかりません: {file_path}")
        return False
    
    content = file_path.read_text(encoding="utf-8")
    original = content
    
    # 1. href=`...`} を href={`...`} に修正
    # パターン: href=`/path/${var}`}
    content = re.sub(
        r'href=`([^`]+)`\}',
        r'href={`\1`}',
        content
    )
    
    # 2. fetch`...`, を fetch(`...`), に修正
    # パターン: fetch`/path/${var}`,
    content = re.sub(
        r'fetch`([^`]+)`,',
        r'fetch(`\1`,',
        content
    )
    
    # 3. await fetch(`...)` の後に続くものも確認
    # 念のため fetch`...`) も修正
    content = re.sub(
        r'fetch`([^`]+)`\)',
        r'fetch(`\1`)',
        content
    )
    
    if content == original:
        print("⚠️  変更なし（既に修正済みか、パターンが異なる）")
    else:
        file_path.write_text(content, encoding="utf-8")
        print("✅ TimelineItem.tsx を修正しました")
        
        # 修正された箇所をカウント
        href_fixed = original.count("href=`") - content.count("href=`")
        fetch_fixed = original.count("fetch`") - content.count("fetch`")
        print(f"   - href: {href_fixed}箇所修正")
        print(f"   - fetch: {fetch_fixed}箇所修正")
    
    return True


if __name__ == "__main__":
    main()
