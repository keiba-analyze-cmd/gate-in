#!/usr/bin/env python3
"""
表示系コンポーネントに△抑え対応を追加するスクリプト

対象:
- VoteSummary.tsx
- TimelineItem.tsx
- VoteDistribution.tsx

使用方法:
  mv ~/Downloads/update_display_components.py ~/gate-in/scripts/
  cd ~/gate-in && python3 scripts/update_display_components.py
"""

from pathlib import Path

def update_vote_summary(project_root: Path) -> bool:
    file_path = project_root / "src" / "components" / "races" / "VoteSummary.tsx"
    
    if not file_path.exists():
        print(f"⚠️  VoteSummary.tsx が見つかりません")
        return False
    
    content = file_path.read_text(encoding="utf-8")
    
    # 1. backPicksの取得を追加
    old_picks = '''const winPick = (vote.vote_picks ?? []).find((p) => p.pick_type === "win");
  const placePicks = (vote.vote_picks ?? []).filter((p) => p.pick_type === "place");
  const dangerPick = (vote.vote_picks ?? []).find((p) => p.pick_type === "danger");'''
    
    new_picks = '''const winPick = (vote.vote_picks ?? []).find((p) => p.pick_type === "win");
  const placePicks = (vote.vote_picks ?? []).filter((p) => p.pick_type === "place");
  const backPicks = (vote.vote_picks ?? []).filter((p) => p.pick_type === "back");
  const dangerPick = (vote.vote_picks ?? []).find((p) => p.pick_type === "danger");'''
    
    if old_picks in content:
        content = content.replace(old_picks, new_picks)
        print("✅ VoteSummary: backPicks取得を追加")
    
    # 2. 危険馬の前に抑え馬の表示を追加
    old_danger_section = '''        {/* 危険馬 */}
        {dangerPick && (
          <PickRow
            label="△ 危険"
            labelColor="text-gray-500"'''
    
    new_back_and_danger = '''        {/* 抑え馬 */}
        {backPicks.map((pick, i) => (
          <PickRow
            key={`back-${i}`}
            label="△ 抑え"
            labelColor="text-yellow-600"
            name={pick.race_entries?.horses?.name ?? ""}
            number={pick.race_entries?.post_number}
            isHit={pick.is_hit}
            points={pick.points_earned}
            isFinished={isFinished}
          />
        ))}

        {/* 危険馬 */}
        {dangerPick && (
          <PickRow
            label="⚠️ 危険"
            labelColor="text-gray-500"'''
    
    if old_danger_section in content:
        content = content.replace(old_danger_section, new_back_and_danger)
        print("✅ VoteSummary: 抑え馬表示を追加、危険馬マークを⚠️に変更")
    
    file_path.write_text(content, encoding="utf-8")
    return True


def update_timeline_item(project_root: Path) -> bool:
    file_path = project_root / "src" / "components" / "social" / "TimelineItem.tsx"
    
    if not file_path.exists():
        print(f"⚠️  TimelineItem.tsx が見つかりません")
        return False
    
    content = file_path.read_text(encoding="utf-8")
    
    # PICK_STYLEにback追加、danger更新
    old_style = '''const PICK_STYLE: Record<string, { mark: string; bg: string; text: string }> = {
  win: { mark: "◎", bg: "bg-red-100", text: "text-red-700" },
  place: { mark: "○", bg: "bg-blue-100", text: "text-blue-700" },
  danger: { mark: "△", bg: "bg-gray-200", text: "text-gray-700" },
};'''
    
    new_style = '''const PICK_STYLE: Record<string, { mark: string; bg: string; text: string }> = {
  win: { mark: "◎", bg: "bg-red-100", text: "text-red-700" },
  place: { mark: "○", bg: "bg-blue-100", text: "text-blue-700" },
  back: { mark: "△", bg: "bg-yellow-100", text: "text-yellow-700" },
  danger: { mark: "⚠️", bg: "bg-gray-200", text: "text-gray-700" },
};'''
    
    if old_style in content:
        content = content.replace(old_style, new_style)
        print("✅ TimelineItem: PICK_STYLEにback追加、danger更新")
    
    file_path.write_text(content, encoding="utf-8")
    return True


def update_vote_distribution(project_root: Path) -> bool:
    file_path = project_root / "src" / "components" / "races" / "VoteDistribution.tsx"
    
    if not file_path.exists():
        print(f"⚠️  VoteDistribution.tsx が見つかりません")
        return False
    
    content = file_path.read_text(encoding="utf-8")
    
    # 1. VoteData型にback追加
    old_type = '''type VoteData = { [key: string]: any;
  total_votes: number;
  win_distribution: DistributionItem[];
  place_distribution: DistributionItem[];
  danger_distribution: DistributionItem[];
};'''
    
    new_type = '''type VoteData = { [key: string]: any;
  total_votes: number;
  win_distribution: DistributionItem[];
  place_distribution: DistributionItem[];
  back_distribution: DistributionItem[];
  danger_distribution: DistributionItem[];
};'''
    
    if old_type in content:
        content = content.replace(old_type, new_type)
        print("✅ VoteDistribution: VoteData型を更新")
    
    # 2. activeTab型にback追加
    old_state = 'const [activeTab, setActiveTab] = useState<"win" | "place" | "danger">("win");'
    new_state = 'const [activeTab, setActiveTab] = useState<"win" | "place" | "back" | "danger">("win");'
    
    if old_state in content:
        content = content.replace(old_state, new_state)
        print("✅ VoteDistribution: activeTab型を更新")
    
    # 3. tabs配列にback追加
    old_tabs = '''const tabs = [
    { key: "win" as const, label: "◎ 1着予想", data: data.win_distribution ?? data.win ?? [], color: "red" },
    { key: "place" as const, label: "○ 複勝予想", data: data.place_distribution ?? data.place ?? [], color: "blue" },
    { key: "danger" as const, label: "△ 危険馬", data: data.danger_distribution ?? data.danger ?? [], color: "gray" },
  ];'''
    
    new_tabs = '''const tabs = [
    { key: "win" as const, label: "◎ 1着予想", data: data.win_distribution ?? data.win ?? [], color: "red" },
    { key: "place" as const, label: "○ 複勝予想", data: data.place_distribution ?? data.place ?? [], color: "blue" },
    { key: "back" as const, label: "△ 抑え", data: data.back_distribution ?? data.back ?? [], color: "yellow" },
    { key: "danger" as const, label: "⚠️ 危険馬", data: data.danger_distribution ?? data.danger ?? [], color: "gray" },
  ];'''
    
    if old_tabs in content:
        content = content.replace(old_tabs, new_tabs)
        print("✅ VoteDistribution: tabs配列を更新")
    
    # 4. barColorsにyellow追加
    old_colors = '''const barColors: Record<string, { bg: string; fill: string; text: string }> = {
    red: { bg: "bg-red-50", fill: "bg-red-400", text: "text-red-700" },
    blue: { bg: "bg-blue-50", fill: "bg-blue-400", text: "text-blue-700" },
    gray: { bg: "bg-gray-100", fill: "bg-gray-400", text: "text-gray-700" },
  };'''
    
    new_colors = '''const barColors: Record<string, { bg: string; fill: string; text: string }> = {
    red: { bg: "bg-red-50", fill: "bg-red-400", text: "text-red-700" },
    blue: { bg: "bg-blue-50", fill: "bg-blue-400", text: "text-blue-700" },
    yellow: { bg: "bg-yellow-50", fill: "bg-yellow-400", text: "text-yellow-700" },
    gray: { bg: "bg-gray-100", fill: "bg-gray-400", text: "text-gray-700" },
  };'''
    
    if old_colors in content:
        content = content.replace(old_colors, new_colors)
        print("✅ VoteDistribution: barColorsにyellow追加")
    
    file_path.write_text(content, encoding="utf-8")
    return True


def main():
    script_dir = Path(__file__).parent
    if script_dir.name == "scripts":
        project_root = script_dir.parent
    else:
        project_root = Path.cwd()
    
    print("=== 表示系コンポーネントの更新 ===\n")
    
    update_vote_summary(project_root)
    print("")
    update_timeline_item(project_root)
    print("")
    update_vote_distribution(project_root)
    
    print("")
    print("🎉 表示系コンポーネントの更新が完了しました")


if __name__ == "__main__":
    main()
