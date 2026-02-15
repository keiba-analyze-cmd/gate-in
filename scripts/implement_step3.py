#!/usr/bin/env python3
"""
Step 3: My競馬新聞 + スタイル診断の実装スクリプト

使用方法:
  mv ~/Downloads/implement_step3.py ~/gate-in/scripts/
  cd ~/gate-in && python3 scripts/implement_step3.py
"""

from pathlib import Path
import re

def update_mypage_menu(project_root: Path) -> bool:
    """マイページにメニュー項目を追加"""
    file_path = project_root / "src" / "app" / "(main)" / "mypage" / "page.tsx"
    
    if not file_path.exists():
        print(f"⚠️  mypage/page.tsx が見つかりません")
        return False
    
    content = file_path.read_text(encoding="utf-8")
    
    # 「タイムライン」の前にMy競馬新聞設定とスタイル診断を追加
    old_menu = '<MenuItem href="/timeline" icon="📰" label="タイムライン"'
    new_menu = '''<MenuItem href="/mypage/newspaper" icon="📰" label="My競馬新聞設定" desc="表示する予想家を選ぶ" />
        <MenuItem href="/mypage/diagnosis" icon="🎯" label="予想スタイル診断" desc="あなたの予想傾向を分析" />
        <MenuItem href="/timeline" icon="📱" label="タイムライン"'''
    
    if old_menu in content and "My競馬新聞設定" not in content:
        content = content.replace(old_menu, new_menu)
        file_path.write_text(content, encoding="utf-8")
        print("✅ マイページ: メニュー項目を追加")
        return True
    elif "My競馬新聞設定" in content:
        print("⚪ マイページ: 既に追加済み")
        return True
    else:
        print("⚠️  マイページ: メニュー挿入位置が見つかりません")
        return False


def check_race_detail_page(project_root: Path) -> bool:
    """レース詳細ページの構造を確認"""
    file_path = project_root / "src" / "app" / "(main)" / "races" / "[raceId]" / "page.tsx"
    
    if not file_path.exists():
        print(f"⚠️  races/[raceId]/page.tsx が見つかりません")
        return False
    
    content = file_path.read_text(encoding="utf-8")
    
    # タブの有無を確認
    if "RaceDetailTabs" in content or "activeTab" in content:
        print("✅ レース詳細: 既にタブ構造あり")
        return True
    else:
        print("⚠️  レース詳細: タブ構造を追加する必要があります")
        print("   手動でMyNewspaperTabを統合してください")
        return False


def main():
    script_dir = Path(__file__).parent
    if script_dir.name == "scripts":
        project_root = script_dir.parent
    else:
        project_root = Path.cwd()
    
    print("=== Step 3: My競馬新聞 + スタイル診断の実装 ===\n")
    
    print("【1. マイページメニューの更新】")
    update_mypage_menu(project_root)
    print("")
    
    print("【2. レース詳細ページの確認】")
    check_race_detail_page(project_root)
    print("")
    
    print("🎉 スクリプト実行完了！")
    print("")
    print("⚠️  以下を忘れずに実行してください:")
    print("   1. my_newspaper_db.sql をSupabase SQL Editorで実行")
    print("   2. ダウンロードしたファイルを配置")
    print("   3. レース詳細ページにMy新聞タブを統合（手動）")


if __name__ == "__main__":
    main()
