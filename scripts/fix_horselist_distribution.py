#!/usr/bin/env python3
"""
出馬表に△反映、複勝予想→相手に変更するスクリプト

使用方法:
  mv ~/Downloads/fix_horselist_distribution.py ~/gate-in/scripts/
  cd ~/gate-in && python3 scripts/fix_horselist_distribution.py
"""

from pathlib import Path

def update_horse_list(project_root: Path) -> bool:
    file_path = project_root / "src" / "components" / "races" / "HorseList.tsx"
    
    if not file_path.exists():
        print(f"⚠️  HorseList.tsx が見つかりません")
        return False
    
    content = file_path.read_text(encoding="utf-8")
    
    # 1. backPickIdsを追加
    old_picks = '''const winPickId = myVote?.vote_picks?.find((p: any) => p.pick_type === "win")?.race_entry_id;
  const placePickIds = myVote?.vote_picks?.filter((p: any) => p.pick_type === "place").map((p: any) => p.race_entry_id) ?? [];
  const dangerPickId = myVote?.vote_picks?.find((p: any) => p.pick_type === "danger")?.race_entry_id;'''
    
    new_picks = '''const winPickId = myVote?.vote_picks?.find((p: any) => p.pick_type === "win")?.race_entry_id;
  const placePickIds = myVote?.vote_picks?.filter((p: any) => p.pick_type === "place").map((p: any) => p.race_entry_id) ?? [];
  const backPickIds = myVote?.vote_picks?.filter((p: any) => p.pick_type === "back").map((p: any) => p.race_entry_id) ?? [];
  const dangerPickId = myVote?.vote_picks?.find((p: any) => p.pick_type === "danger")?.race_entry_id;'''
    
    if old_picks in content:
        content = content.replace(old_picks, new_picks)
        print("✅ HorseList: backPickIds追加")
    
    # 2. isBackの判定を追加
    old_is_vars = '''const isWin = entry.id === winPickId;
        const isPlace = placePickIds.includes(entry.id);
        const isDanger = entry.id === dangerPickId;'''
    
    new_is_vars = '''const isWin = entry.id === winPickId;
        const isPlace = placePickIds.includes(entry.id);
        const isBack = backPickIds.includes(entry.id);
        const isDanger = entry.id === dangerPickId;'''
    
    if old_is_vars in content:
        content = content.replace(old_is_vars, new_is_vars)
        print("✅ HorseList: isBack判定追加")
    
    # 3. 背景色にisBackを追加
    old_bg = ''': isDanger
                ? "bg-gray-100 border border-gray-200"
                : "bg-gray-50"'''
    
    new_bg = ''': isBack
                ? "bg-yellow-50 border border-yellow-100"
                : isDanger
                ? "bg-gray-100 border border-gray-200"
                : "bg-gray-50"'''
    
    if old_bg in content:
        content = content.replace(old_bg, new_bg)
        print("✅ HorseList: 背景色にisBack追加")
    
    # 4. 予想マーク表示にisBackを追加、危険馬を⚠️に変更
    old_marks = '''{isWin && <span className="text-xs font-bold text-red-600 ml-1">◎</span>}
              {isPlace && <span className="text-xs font-bold text-blue-600 ml-1">○</span>}
              {isDanger && <span className="text-xs font-bold text-gray-500 ml-1">△</span>}'''
    
    new_marks = '''{isWin && <span className="text-xs font-bold text-red-600 ml-1">◎</span>}
              {isPlace && <span className="text-xs font-bold text-blue-600 ml-1">○</span>}
              {isBack && <span className="text-xs font-bold text-yellow-600 ml-1">△</span>}
              {isDanger && <span className="text-xs font-bold text-gray-500 ml-1">⚠️</span>}'''
    
    if old_marks in content:
        content = content.replace(old_marks, new_marks)
        print("✅ HorseList: △マーク追加、危険馬を⚠️に変更")
    
    file_path.write_text(content, encoding="utf-8")
    return True


def update_vote_distribution(project_root: Path) -> bool:
    file_path = project_root / "src" / "components" / "races" / "VoteDistribution.tsx"
    
    if not file_path.exists():
        print(f"⚠️  VoteDistribution.tsx が見つかりません")
        return False
    
    content = file_path.read_text(encoding="utf-8")
    
    # 「複勝予想」を「相手」に変更
    old_label = '{ key: "place" as const, label: "○ 複勝予想", data: data.place_distribution ?? data.place ?? [], color: "blue" },'
    new_label = '{ key: "place" as const, label: "○ 相手", data: data.place_distribution ?? data.place ?? [], color: "blue" },'
    
    if old_label in content:
        content = content.replace(old_label, new_label)
        print("✅ VoteDistribution: 複勝予想→相手に変更")
    else:
        print("⚠️  VoteDistribution: ラベルパターンが見つかりません")
    
    file_path.write_text(content, encoding="utf-8")
    return True


def main():
    script_dir = Path(__file__).parent
    if script_dir.name == "scripts":
        project_root = script_dir.parent
    else:
        project_root = Path.cwd()
    
    print("=== 出馬表・投票分布の修正 ===\n")
    
    update_horse_list(project_root)
    print("")
    update_vote_distribution(project_root)
    
    print("")
    print("🎉 修正が完了しました")
    print("")
    print("変更内容:")
    print("  - 出馬表に△（抑え）表示を追加")
    print("  - 危険馬マークを△→⚠️に変更")
    print("  - 「複勝予想」→「相手」にラベル変更")


if __name__ == "__main__":
    main()
