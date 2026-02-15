#!/usr/bin/env python3
"""
Step 1: ランキング系機能の実装スクリプト
- いいねランキング
- 週間MVP表彰
- TOPページへのセクション追加

使用方法:
  mv ~/Downloads/implement_ranking_features.py ~/gate-in/scripts/
  cd ~/gate-in && python3 scripts/implement_ranking_features.py
"""

from pathlib import Path
import re

def fix_ranking_tabs_fetch(project_root: Path) -> bool:
    """RankingTabsのfetch構文エラーを修正"""
    file_path = project_root / "src" / "components" / "rankings" / "RankingTabs.tsx"
    
    if not file_path.exists():
        print(f"⚠️  RankingTabs.tsx が見つかりません")
        return False
    
    content = file_path.read_text(encoding="utf-8")
    
    # fetch`...`) を fetch(`...`) に修正
    if "fetch`" in content:
        content = re.sub(r'fetch`([^`]+)`\)', r'fetch(`\1`)', content)
        file_path.write_text(content, encoding="utf-8")
        print("✅ RankingTabs.tsx: fetch構文を修正")
        return True
    else:
        print("⚪ RankingTabs.tsx: 修正不要")
        return True


def update_top_page(project_root: Path) -> bool:
    """TOPページにセクションを追加"""
    file_path = project_root / "src" / "app" / "(main)" / "page.tsx"
    
    if not file_path.exists():
        print(f"⚠️  page.tsx が見つかりません")
        return False
    
    content = file_path.read_text(encoding="utf-8")
    
    # 1. インポートを追加
    old_import = 'import FollowingVotes from "@/components/social/FollowingVotes";'
    new_import = '''import FollowingVotes from "@/components/social/FollowingVotes";
import PopularVotesSection from "@/components/social/PopularVotesSection";
import WeeklyMVPBanner from "@/components/social/WeeklyMVPBanner";'''
    
    if old_import in content and "PopularVotesSection" not in content:
        content = content.replace(old_import, new_import)
        print("✅ TOPページ: インポートを追加")
    
    # 2. MVPバナーを追加（FollowingVotesの前に）
    old_following = '{user && <FollowingVotes />'
    new_following = '''{user && (
          <>
            <WeeklyMVPBanner />
            <PopularVotesSection />
            <FollowingVotes />
          </>
        )'''
    
    # 別パターンも試す
    if old_following in content:
        content = content.replace(old_following, new_following)
        # 対応する閉じ括弧も調整
        content = content.replace('<FollowingVotes />}', '')
        print("✅ TOPページ: MVP・人気セクションを追加")
    elif "<FollowingVotes />" in content and "WeeklyMVPBanner" not in content:
        # 単純な置換
        content = content.replace(
            "<FollowingVotes />",
            "<WeeklyMVPBanner />\n          <PopularVotesSection />\n          <FollowingVotes />"
        )
        print("✅ TOPページ: MVP・人気セクションを追加（パターン2）")
    
    file_path.write_text(content, encoding="utf-8")
    return True


def main():
    script_dir = Path(__file__).parent
    if script_dir.name == "scripts":
        project_root = script_dir.parent
    else:
        project_root = Path.cwd()
    
    print("=== Step 1: ランキング系機能の実装 ===\n")
    
    print("【1. 既存ファイルの修正】")
    fix_ranking_tabs_fetch(project_root)
    print("")
    
    print("【2. TOPページの更新】")
    update_top_page(project_root)
    print("")
    
    print("🎉 スクリプト実行完了！")
    print("")
    print("次のステップ:")
    print("  1. ダウンロードした新規ファイルを配置")
    print("  2. npm run build でビルド確認")
    print("  3. git push でデプロイ")


if __name__ == "__main__":
    main()
