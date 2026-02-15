#!/usr/bin/env python3
"""
レース詳細ページのポイント目安を新システムに更新するスクリプト

使用方法:
  mv ~/Downloads/update_points_display.py ~/gate-in/scripts/
  cd ~/gate-in && python3 scripts/update_points_display.py
"""

from pathlib import Path

def main():
    script_dir = Path(__file__).parent
    if script_dir.name == "scripts":
        project_root = script_dir.parent
    else:
        project_root = Path.cwd()
    
    file_path = project_root / "src" / "app" / "(main)" / "races" / "[raceId]" / "page.tsx"
    
    if not file_path.exists():
        print(f"❌ ファイルが見つかりません: {file_path}")
        return False
    
    content = file_path.read_text(encoding="utf-8")
    
    # 古いポイント目安セクション
    old_section = '''<div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-bold text-gray-800 mb-3">🎯 獲得ポイント目安</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-1.5 border-b border-gray-50">
                <span className="text-gray-600">1着的中（1番人気）</span>
                <span className="font-bold text-green-600">+30P</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-50">
                <span className="text-gray-600">1着的中（4〜5番人気）</span>
                <span className="font-bold text-green-600">+80P</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-50">
                <span className="text-gray-600">1着的中（10番人気〜）</span>
                <span className="font-bold text-green-600">+300P</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-50">
                <span className="text-gray-600">複勝的中（1頭あたり）</span>
                <span className="font-bold text-blue-600">+20P</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-50">
                <span className="text-gray-600">危険馬的中（1番人気）</span>
                <span className="font-bold text-orange-600">+50P</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-50">
                <span className="text-gray-600">G1ボーナス（各的中）</span>
                <span className="font-bold text-purple-600">+30P</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-gray-600">完全的中ボーナス</span>
                <span className="font-bold text-yellow-600">+200P</span>
              </div>
            </div>
            <Link href="/guide/points" className="block text-center text-xs text-green-600 font-bold mt-3 hover:underline">
              📖 ポイントルール詳細 →
            </Link>
          </div>'''
    
    # 新しいポイント目安セクション（オッズ連動・簡潔版）
    new_section = '''<div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-bold text-gray-800 mb-3">🎯 獲得ポイント目安</h3>
            <p className="text-xs text-gray-400 mb-2">※オッズ連動（高配当ほど高ポイント）</p>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-gray-600">◎ 単勝的中</span>
                <span className="font-bold text-red-500">20〜250P</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-gray-600">○ 複勝的中</span>
                <span className="font-bold text-blue-500">10〜60P</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-gray-600">🎫 馬連的中</span>
                <span className="font-bold text-green-600">30〜280P</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-gray-600">🎟️ ワイド的中</span>
                <span className="font-bold text-green-600">15〜90P</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-gray-600">🎰 三連複的中</span>
                <span className="font-bold text-purple-600">20〜300P</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-gray-600">⚠️ 危険馬的中</span>
                <span className="font-bold text-orange-500">10〜50P</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-600">💎 完全的中ボーナス</span>
                <span className="font-bold text-yellow-600">+200P</span>
              </div>
            </div>
            <Link href="/guide/points" className="block text-center text-xs text-green-600 font-bold mt-3 hover:underline">
              📖 ポイントルール詳細 →
            </Link>
          </div>'''
    
    if old_section in content:
        content = content.replace(old_section, new_section)
        print("✅ ポイント目安セクションを更新しました")
    else:
        print("⚠️  ポイント目安セクションが見つかりません")
        return False
    
    file_path.write_text(content, encoding="utf-8")
    print("")
    print("🎉 レース詳細ページを更新しました")
    return True


if __name__ == "__main__":
    main()
