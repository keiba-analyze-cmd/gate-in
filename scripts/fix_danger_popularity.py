#!/usr/bin/env python3
"""
危険馬人気99番問題を修正するスクリプト

問題: popularityがnullの場合、デフォルトで99番人気と表示される
修正: nullの場合は「不明」と表示し、ポイントは最低値を適用

使用方法:
  mv ~/Downloads/fix_danger_popularity.py ~/gate-in/scripts/
  cd ~/gate-in && python scripts/fix_danger_popularity.py
  npm run build
  git add -A && git commit -m "fix: 危険馬人気が不明の場合の表示を修正" && git push
"""

from pathlib import Path

def main():
    script_dir = Path(__file__).parent
    if script_dir.name == "scripts":
        project_root = script_dir.parent
    else:
        project_root = Path.cwd()
    
    file_path = project_root / "src" / "lib" / "services" / "settle-race.ts"
    
    if not file_path.exists():
        print(f"❌ ファイルが見つかりません: {file_path}")
        return False
    
    content = file_path.read_text(encoding="utf-8")
    
    # 修正1: entryPopularityMapの作成ロジック
    # 元: if (r.race_entries?.popularity) { ... }
    # → popularityが0やnullでも登録する（nullは-1として）
    old_map_logic = '''  // 危険馬の人気をマップ化
  const entryPopularityMap = new Map<string, number>();
  for (const r of results) {
    if (r.race_entries?.popularity) {
      entryPopularityMap.set(r.race_entry_id, r.race_entries.popularity);
    }
  }'''
    
    new_map_logic = '''  // 危険馬の人気をマップ化（nullは-1として記録）
  const entryPopularityMap = new Map<string, number | null>();
  for (const r of results) {
    const pop = r.race_entries?.popularity;
    entryPopularityMap.set(r.race_entry_id, pop ?? null);
  }'''
    
    if old_map_logic in content:
        content = content.replace(old_map_logic, new_map_logic)
        print("✅ entryPopularityMap作成ロジックを修正")
    else:
        print("⚠️  entryPopularityMap作成ロジックが見つかりません（既に修正済み？）")
    
    # 修正2: dangerPopの取得と表示ロジック
    old_danger_logic = '''          const dangerPop = entryPopularityMap.get(dangerPickItem.race_entry_id) ?? 99;
          const basePts = getDangerPoints(dangerPop);
          const pts = basePts + gradeBonus;
          votePoints += pts;
          dangerHit = true;
          anyHit = true;

          const gradeLabel = gradeBonus > 0 ? `（${race.grade}+${gradeBonus}）` : "";
          transactions.push({
            reason: "danger_hit",
            amount: pts,
            description: `危険馬的中（${dangerPop}番人気）+${basePts}P${gradeLabel}`,
          });'''
    
    new_danger_logic = '''          const dangerPop = entryPopularityMap.get(dangerPickItem.race_entry_id);
          const basePts = getDangerPoints(dangerPop ?? 1); // nullの場合は最低ポイント
          const pts = basePts + gradeBonus;
          votePoints += pts;
          dangerHit = true;
          anyHit = true;

          const gradeLabel = gradeBonus > 0 ? `（${race.grade}+${gradeBonus}）` : "";
          const popLabel = dangerPop != null ? `${dangerPop}番人気` : "人気不明";
          transactions.push({
            reason: "danger_hit",
            amount: pts,
            description: `危険馬的中（${popLabel}）+${basePts}P${gradeLabel}`,
          });'''
    
    if old_danger_logic in content:
        content = content.replace(old_danger_logic, new_danger_logic)
        print("✅ 危険馬ポイント計算・表示ロジックを修正")
    else:
        print("⚠️  危険馬ポイント計算ロジックが見つかりません（既に修正済み？）")
    
    # ファイル書き込み
    file_path.write_text(content, encoding="utf-8")
    
    print("")
    print("📁 対象ファイル:")
    print(f"   {file_path}")
    print("")
    print("📝 変更内容:")
    print("   - popularityがnullの馬もマップに登録")
    print("   - 人気不明の場合「人気不明」と表示")
    print("   - 人気不明の場合は最低ポイント（1番人気相当）を適用")
    print("")
    print("🚀 次のステップ:")
    print("   1. npm run build")
    print("   2. git add -A && git commit -m 'fix: 危険馬人気が不明の場合の表示を修正' && git push")
    
    return True


if __name__ == "__main__":
    main()
