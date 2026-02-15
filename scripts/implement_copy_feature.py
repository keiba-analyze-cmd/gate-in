#!/usr/bin/env python3
"""
Step 2: 乗っかり機能の実装スクリプト

使用方法:
  mv ~/Downloads/implement_copy_feature.py ~/gate-in/scripts/
  cd ~/gate-in && python3 scripts/implement_copy_feature.py
"""

from pathlib import Path
import re

def update_timeline_item(project_root: Path) -> bool:
    """TimelineItemに乗っかりボタンを追加"""
    file_path = project_root / "src" / "components" / "social" / "TimelineItem.tsx"
    
    if not file_path.exists():
        print(f"⚠️  TimelineItem.tsx が見つかりません")
        return False
    
    content = file_path.read_text(encoding="utf-8")
    
    # 1. CopyVoteButtonのインポートを追加
    old_import = 'import LikeButton from "./LikeButton";'
    new_import = '''import LikeButton from "./LikeButton";
import CopyVoteButton from "./CopyVoteButton";'''
    
    if old_import in content and "CopyVoteButton" not in content:
        content = content.replace(old_import, new_import)
        print("✅ TimelineItem: CopyVoteButton importを追加")
    
    # 2. vote_submittedのアクションバーに乗っかりボタンを追加
    # レースを見るリンクの後にボタンを追加
    old_action = '''<Link href={`/races/${item.race_id}`}
            className="text-xs text-gray-400 hover:text-green-600 transition-colors flex items-center gap-1">📄 レースを見る</Link>'''
    
    new_action = '''<Link href={`/races/${item.race_id}`}
            className="text-xs text-gray-400 hover:text-green-600 transition-colors flex items-center gap-1">📄 レースを見る</Link>
          {item.vote_id && item.type === "vote_submitted" && (
            <CopyVoteButton voteId={item.vote_id} raceId={item.race_id} />
          )}'''
    
    if old_action in content and "CopyVoteButton" not in content:
        content = content.replace(old_action, new_action)
        print("✅ TimelineItem: 乗っかりボタンを追加")
    elif "CopyVoteButton" in content:
        print("⚪ TimelineItem: 乗っかりボタン既に追加済み")
    
    file_path.write_text(content, encoding="utf-8")
    return True


def update_timeline_api(project_root: Path) -> bool:
    """Timeline APIにcopy_countを追加"""
    file_path = project_root / "src" / "app" / "api" / "timeline" / "route.ts"
    
    if not file_path.exists():
        print(f"⚠️  timeline/route.ts が見つかりません")
        return False
    
    content = file_path.read_text(encoding="utf-8")
    
    # copy_countをselectに追加（like_countの後に）
    old_select = 'like_count, settled_at'
    new_select = 'like_count, copy_count, settled_at'
    
    if old_select in content and "copy_count" not in content:
        content = content.replace(old_select, new_select)
        print("✅ Timeline API: copy_countをselectに追加")
    
    old_select2 = 'like_count, created_at'
    new_select2 = 'like_count, copy_count, created_at'
    
    if old_select2 in content:
        content = content.replace(old_select2, new_select2)
    
    # copy_countをレスポンスに追加
    old_map1 = 'like_count: v.like_count ?? 0,'
    new_map1 = 'like_count: v.like_count ?? 0, copy_count: v.copy_count ?? 0,'
    
    if old_map1 in content and "copy_count:" not in content:
        content = content.replace(old_map1, new_map1)
        print("✅ Timeline API: copy_countをレスポンスに追加")
    
    file_path.write_text(content, encoding="utf-8")
    return True


def main():
    script_dir = Path(__file__).parent
    if script_dir.name == "scripts":
        project_root = script_dir.parent
    else:
        project_root = Path.cwd()
    
    print("=== Step 2: 乗っかり機能の実装 ===\n")
    
    print("【1. TimelineItemの更新】")
    update_timeline_item(project_root)
    print("")
    
    print("【2. Timeline APIの更新】")
    update_timeline_api(project_root)
    print("")
    
    print("🎉 スクリプト実行完了！")
    print("")
    print("⚠️  DBマイグレーションを忘れずに実行してください:")
    print("   copy_feature_migration.sql の内容をSupabase SQL Editorで実行")


if __name__ == "__main__":
    main()
