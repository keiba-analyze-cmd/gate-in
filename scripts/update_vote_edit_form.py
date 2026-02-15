#!/usr/bin/env python3
"""
VoteEditForm.tsx に△（抑え）タブを追加するスクリプト

使用方法:
  mv ~/Downloads/update_vote_edit_form.py ~/gate-in/scripts/
  cd ~/gate-in && python3 scripts/update_vote_edit_form.py
"""

from pathlib import Path

def main():
    script_dir = Path(__file__).parent
    if script_dir.name == "scripts":
        project_root = script_dir.parent
    else:
        project_root = Path.cwd()
    
    file_path = project_root / "src" / "components" / "races" / "VoteEditForm.tsx"
    
    if not file_path.exists():
        print(f"❌ ファイルが見つかりません: {file_path}")
        return False
    
    content = file_path.read_text(encoding="utf-8")
    
    # 1. backPicks state追加
    old_state = '''const [winPick, setWinPick] = useState<string | null>(
    existingPicks.find((p) => p.pick_type === "win")?.race_entry_id ?? null
  );
  const [placePicks, setPlacePicks] = useState<string[]>(
    existingPicks.filter((p) => p.pick_type === "place").map((p) => p.race_entry_id)
  );
  const [dangerPick, setDangerPick] = useState<string | null>(
    existingPicks.find((p) => p.pick_type === "danger")?.race_entry_id ?? null
  );
  const [activeTab, setActiveTab] = useState<"win" | "place" | "danger">("win");'''
    
    new_state = '''const [winPick, setWinPick] = useState<string | null>(
    existingPicks.find((p) => p.pick_type === "win")?.race_entry_id ?? null
  );
  const [placePicks, setPlacePicks] = useState<string[]>(
    existingPicks.filter((p) => p.pick_type === "place").map((p) => p.race_entry_id)
  );
  const [backPicks, setBackPicks] = useState<string[]>(
    existingPicks.filter((p) => p.pick_type === "back").map((p) => p.race_entry_id)
  );
  const [dangerPick, setDangerPick] = useState<string | null>(
    existingPicks.find((p) => p.pick_type === "danger")?.race_entry_id ?? null
  );
  const [activeTab, setActiveTab] = useState<"win" | "place" | "back" | "danger">("win");'''
    
    if old_state in content:
        content = content.replace(old_state, new_state)
        print("✅ state定義を更新")
    
    # 2. isUsedInOtherTab更新
    old_check = '''const isUsedInOtherTab = (entryId: string): string | null => {
    if (activeTab !== "win" && winPick === entryId) return "◎";
    if (activeTab !== "place" && placePicks.includes(entryId)) return "○";
    if (activeTab !== "danger" && dangerPick === entryId) return "△";
    return null;
  };'''
    
    new_check = '''const isUsedInOtherTab = (entryId: string): string | null => {
    if (activeTab !== "win" && winPick === entryId) return "◎";
    if (activeTab !== "place" && placePicks.includes(entryId)) return "○";
    if (activeTab !== "back" && backPicks.includes(entryId)) return "△";
    if (activeTab !== "danger" && dangerPick === entryId) return "⚠️";
    return null;
  };'''
    
    if old_check in content:
        content = content.replace(old_check, new_check)
        print("✅ isUsedInOtherTabを更新")
    
    # 3. togglePlace の後に toggleBack 追加
    old_toggle = '''const togglePlace = (id: string) => {
    if (placePicks.includes(id)) setPlacePicks(placePicks.filter((p) => p !== id));
    else if (placePicks.length < 2) setPlacePicks([...placePicks, id]);
  };'''
    
    new_toggle = '''const togglePlace = (id: string) => {
    if (placePicks.includes(id)) setPlacePicks(placePicks.filter((p) => p !== id));
    else if (placePicks.length < 2) setPlacePicks([...placePicks, id]);
  };

  const toggleBack = (id: string) => {
    if (backPicks.includes(id)) setBackPicks(backPicks.filter((p) => p !== id));
    else if (backPicks.length < 5) setBackPicks([...backPicks, id]);
  };'''
    
    if old_toggle in content:
        content = content.replace(old_toggle, new_toggle)
        print("✅ toggleBack関数を追加")
    
    # 4. picks配列にback追加
    old_picks = '''const picks = [
      { vote_id: voteId, pick_type: "win", race_entry_id: winPick },
      ...placePicks.map((id) => ({ vote_id: voteId, pick_type: "place", race_entry_id: id })),
      ...(dangerPick ? [{ vote_id: voteId, pick_type: "danger", race_entry_id: dangerPick }] : []),
    ];'''
    
    new_picks = '''const picks = [
      { vote_id: voteId, pick_type: "win", race_entry_id: winPick },
      ...placePicks.map((id) => ({ vote_id: voteId, pick_type: "place", race_entry_id: id })),
      ...backPicks.map((id) => ({ vote_id: voteId, pick_type: "back", race_entry_id: id })),
      ...(dangerPick ? [{ vote_id: voteId, pick_type: "danger", race_entry_id: dangerPick }] : []),
    ];'''
    
    if old_picks in content:
        content = content.replace(old_picks, new_picks)
        print("✅ picks配列にback追加")
    
    # 5. tabs配列にback追加
    old_tabs = '''{ key: "danger" as const, label: "△ 危険馬", desc: "0〜1頭" },'''
    new_tabs = '''{ key: "back" as const, label: "△ 抑え", desc: "0〜5頭" },
    { key: "danger" as const, label: "⚠️ 危険馬", desc: "0〜1頭" },'''
    
    if old_tabs in content:
        content = content.replace(old_tabs, new_tabs)
        print("✅ tabs配列にback追加")
    
    # 6. isSelected判定にback追加
    old_selected = '''const isSelected = activeTab === "win" ? winPick === entry.id
            : activeTab === "place" ? placePicks.includes(entry.id)
            : dangerPick === entry.id;'''
    
    new_selected = '''const isSelected = activeTab === "win" ? winPick === entry.id
            : activeTab === "place" ? placePicks.includes(entry.id)
            : activeTab === "back" ? backPicks.includes(entry.id)
            : dangerPick === entry.id;'''
    
    if old_selected in content:
        content = content.replace(old_selected, new_selected)
        print("✅ isSelected判定にback追加")
    
    # 7. onClick処理にback追加
    old_onclick = '''if (activeTab === "win") setWinPick(isSelected ? null : entry.id);
                else if (activeTab === "place") togglePlace(entry.id);
                else setDangerPick(isSelected ? null : entry.id);'''
    
    new_onclick = '''if (activeTab === "win") setWinPick(isSelected ? null : entry.id);
                else if (activeTab === "place") togglePlace(entry.id);
                else if (activeTab === "back") toggleBack(entry.id);
                else setDangerPick(isSelected ? null : entry.id);'''
    
    if old_onclick in content:
        content = content.replace(old_onclick, new_onclick)
        print("✅ onClick処理にback追加")
    
    # 8. isMaxPlace の後に isMaxBack 追加
    old_max = '''const isMaxPlace = activeTab === "place" && placePicks.length >= 2 && !isSelected;
          const isDisabled = !!usedIn || isMaxPlace;'''
    
    new_max = '''const isMaxPlace = activeTab === "place" && placePicks.length >= 2 && !isSelected;
          const isMaxBack = activeTab === "back" && backPicks.length >= 5 && !isSelected;
          const isDisabled = !!usedIn || isMaxPlace || isMaxBack;'''
    
    if old_max in content:
        content = content.replace(old_max, new_max)
        print("✅ isMaxBack追加")
    
    # 9. スタイルにback追加
    old_style = ''': activeTab === "place" ? "bg-blue-50 border-2 border-blue-300"
                    : "bg-gray-100 border-2 border-gray-400"'''
    
    new_style = ''': activeTab === "place" ? "bg-blue-50 border-2 border-blue-300"
                    : activeTab === "back" ? "bg-yellow-50 border-2 border-yellow-300"
                    : "bg-gray-100 border-2 border-gray-400"'''
    
    if old_style in content:
        content = content.replace(old_style, new_style)
        print("✅ スタイルにback追加")
    
    # 10. マーク表示更新
    old_mark = '''{activeTab === "win" ? "◎" : activeTab === "place" ? "○" : "△"}'''
    new_mark = '''{activeTab === "win" ? "◎" : activeTab === "place" ? "○" : activeTab === "back" ? "△" : "⚠️"}'''
    
    content = content.replace(old_mark, new_mark)
    print("✅ マーク表示を更新")
    
    # 11. 色クラス更新
    old_color = '''activeTab === "win" ? "text-red-500" : activeTab === "place" ? "text-blue-500" : "text-gray-500"'''
    new_color = '''activeTab === "win" ? "text-red-500" : activeTab === "place" ? "text-blue-500" : activeTab === "back" ? "text-yellow-600" : "text-gray-500"'''
    
    content = content.replace(old_color, new_color)
    print("✅ 色クラスを更新")
    
    # 12. サマリー表示にback追加（dangerPickの前に追加）
    old_summary = '''{dangerPick && <span className="bg-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded-full font-medium">△ {entries.find((e) => e.id === dangerPick)?.horses?.name}</span>}'''
    
    new_summary = '''{backPicks.map((id) => <span key={id} className="bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full font-medium">△ {entries.find((e) => e.id === id)?.horses?.name}</span>)}
          {dangerPick && <span className="bg-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded-full font-medium">⚠️ {entries.find((e) => e.id === dangerPick)?.horses?.name}</span>}'''
    
    if old_summary in content:
        content = content.replace(old_summary, new_summary)
        print("✅ サマリー表示にback追加")
    
    # 13. opacity更新
    old_opacity = '${isMaxPlace ? "opacity-40" : ""}'
    new_opacity = '${(isMaxPlace || isMaxBack) ? "opacity-40" : ""}'
    
    content = content.replace(old_opacity, new_opacity)
    print("✅ opacity条件を更新")
    
    file_path.write_text(content, encoding="utf-8")
    print("")
    print("🎉 VoteEditForm.tsx を更新しました")
    return True


if __name__ == "__main__":
    main()
