#!/usr/bin/env python3
"""
マイページに「いいねした予想」リンクを追加するスクリプト

使用方法:
  mv ~/Downloads/add_likes_link.py ~/gate-in/scripts/
  cd ~/gate-in && python3 scripts/add_likes_link.py
"""

from pathlib import Path

def main():
    script_dir = Path(__file__).parent
    if script_dir.name == "scripts":
        project_root = script_dir.parent
    else:
        project_root = Path.cwd()
    
    file_path = project_root / "src" / "app" / "(main)" / "mypage" / "page.tsx"
    
    if not file_path.exists():
        print(f"❌ mypage/page.tsx が見つかりません")
        return False
    
    content = file_path.read_text(encoding="utf-8")
    
    # メニューリンクの「バッジコレクション」の後に「いいねした予想」を追加
    old_badges_link = '''<Link
          href="/mypage/badges"
          className="flex items-center justify-between bg-white rounded-xl border border-gray-100 p-4 hover:border-green-200 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">🏅</span>
            <div>
              <div className="font-bold text-sm text-gray-800">バッジコレクション</div>
              <div className="text-xs text-gray-400">{badgeCount ?? 0}個獲得</div>
            </div>
          </div>
          <span className="text-gray-300">→</span>
        </Link>'''
    
    new_badges_and_likes_link = '''<Link
          href="/mypage/badges"
          className="flex items-center justify-between bg-white rounded-xl border border-gray-100 p-4 hover:border-green-200 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">🏅</span>
            <div>
              <div className="font-bold text-sm text-gray-800">バッジコレクション</div>
              <div className="text-xs text-gray-400">{badgeCount ?? 0}個獲得</div>
            </div>
          </div>
          <span className="text-gray-300">→</span>
        </Link>

        <Link
          href="/mypage/likes"
          className="flex items-center justify-between bg-white rounded-xl border border-gray-100 p-4 hover:border-green-200 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">❤️</span>
            <div>
              <div className="font-bold text-sm text-gray-800">いいねした予想</div>
              <div className="text-xs text-gray-400">お気に入りの予想を見る</div>
            </div>
          </div>
          <span className="text-gray-300">→</span>
        </Link>'''
    
    if old_badges_link in content:
        content = content.replace(old_badges_link, new_badges_and_likes_link)
        print("✅ マイページ: 「いいねした予想」リンクを追加")
    else:
        print("⚠️  マイページ: バッジリンクパターンが見つかりません")
        # 別のパターンを試す
        if "バッジコレクション" in content:
            print("   「バッジコレクション」は存在しますが、パターンが異なります")
    
    file_path.write_text(content, encoding="utf-8")
    return True


if __name__ == "__main__":
    main()
