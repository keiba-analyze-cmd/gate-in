#!/usr/bin/env python3
"""
△抑えの表示を馬番のみに統一するスクリプト

対象:
1. TimelineItem.tsx - タイムライン
2. mypage/votes/page.tsx - 投票履歴
3. UserActivityFeed.tsx - 公開プロフィール

変更内容:
- △の馬を「△ 1,2,3,12」のように馬番だけを1つの枠にまとめる

使用方法:
  mv ~/Downloads/fix_back_display.py ~/gate-in/scripts/
  cd ~/gate-in && python3 scripts/fix_back_display.py
"""

from pathlib import Path

def update_timeline_item(project_root: Path) -> bool:
    file_path = project_root / "src" / "components" / "social" / "TimelineItem.tsx"
    
    if not file_path.exists():
        print(f"⚠️  TimelineItem.tsx が見つかりません")
        return False
    
    content = file_path.read_text(encoding="utf-8")
    
    # picksの表示部分を修正（vote_submitted内）
    old_picks_display = '''{item.picks && item.picks.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {item.picks.map((pick, i) => {
                const style = PICK_STYLE[pick.pick_type] ?? PICK_STYLE.win;
                return (
                  <span key={i} className={`${style.bg} ${style.text} text-xs px-2 py-1 rounded-full font-medium`}>
                    {style.mark} {pick.post_number} {pick.horse_name}
                  </span>
                );
              })}
            </div>
          )}'''
    
    new_picks_display = '''{item.picks && item.picks.length > 0 && (() => {
            const nonBackPicks = item.picks.filter(p => p.pick_type !== "back");
            const backPicks = item.picks.filter(p => p.pick_type === "back");
            return (
              <div className="flex flex-wrap gap-1.5">
                {nonBackPicks.map((pick, i) => {
                  const style = PICK_STYLE[pick.pick_type] ?? PICK_STYLE.win;
                  return (
                    <span key={i} className={`${style.bg} ${style.text} text-xs px-2 py-1 rounded-full font-medium`}>
                      {style.mark} {pick.post_number} {pick.horse_name}
                    </span>
                  );
                })}
                {backPicks.length > 0 && (
                  <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-1 rounded-full font-medium">
                    △ {backPicks.map(p => p.post_number).join(",")}
                  </span>
                )}
              </div>
            );
          })()}'''
    
    if old_picks_display in content:
        content = content.replace(old_picks_display, new_picks_display)
        print("✅ TimelineItem.tsx: vote_submitted内のpicks表示を修正")
    
    # vote_result内のpicks表示も同様に修正（2箇所目）
    # 同じパターンが使われているので、すでに1回置換されているはず
    # 残りの同じパターンがあれば置換
    count = content.count(old_picks_display)
    while old_picks_display in content:
        content = content.replace(old_picks_display, new_picks_display, 1)
        print("✅ TimelineItem.tsx: 追加のpicks表示を修正")
    
    file_path.write_text(content, encoding="utf-8")
    return True


def update_user_activity_feed(project_root: Path) -> bool:
    file_path = project_root / "src" / "components" / "social" / "UserActivityFeed.tsx"
    
    if not file_path.exists():
        print(f"⚠️  UserActivityFeed.tsx が見つかりません")
        return False
    
    content = file_path.read_text(encoding="utf-8")
    
    # picksの表示部分を修正
    old_picks = '''{(item.type === "vote_submitted" || item.type === "vote_result") && item.picks && item.picks.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-1">
          {item.picks.map((pick, i) => {
            const style = PICK_STYLE[pick.pick_type] ?? PICK_STYLE.win;
            return (
              <span key={i} className={`${style.bg} ${style.text} text-[11px] px-2 py-0.5 rounded-full font-medium`}>
                {style.mark} {pick.post_number} {pick.horse_name}
              </span>
            );
          })}
        </div>
      )}'''
    
    new_picks = '''{(item.type === "vote_submitted" || item.type === "vote_result") && item.picks && item.picks.length > 0 && (() => {
        const nonBackPicks = item.picks.filter(p => p.pick_type !== "back");
        const backPicks = item.picks.filter(p => p.pick_type === "back");
        return (
          <div className="flex flex-wrap gap-1.5 mb-1">
            {nonBackPicks.map((pick, i) => {
              const style = PICK_STYLE[pick.pick_type] ?? PICK_STYLE.win;
              return (
                <span key={i} className={`${style.bg} ${style.text} text-[11px] px-2 py-0.5 rounded-full font-medium`}>
                  {style.mark} {pick.post_number} {pick.horse_name}
                </span>
              );
            })}
            {backPicks.length > 0 && (
              <span className="bg-yellow-100 text-yellow-700 text-[11px] px-2 py-0.5 rounded-full font-medium">
                △ {backPicks.map(p => p.post_number).join(",")}
              </span>
            )}
          </div>
        );
      })()}'''
    
    if old_picks in content:
        content = content.replace(old_picks, new_picks)
        print("✅ UserActivityFeed.tsx: picks表示を修正")
    else:
        print("⚠️  UserActivityFeed.tsx: 修正パターンが見つかりません")
    
    file_path.write_text(content, encoding="utf-8")
    return True


def update_votes_page(project_root: Path) -> bool:
    file_path = project_root / "src" / "app" / "(main)" / "mypage" / "votes" / "page.tsx"
    
    if not file_path.exists():
        print(f"⚠️  votes/page.tsx が見つかりません")
        return False
    
    content = file_path.read_text(encoding="utf-8")
    
    # 1. backPicksの取得を追加
    old_picks_extract = '''const winPick = picks.find((p: any) => p.pick_type === "win");
            const placePicks = picks.filter((p: any) => p.pick_type === "place");
            const dangerPick = picks.find((p: any) => p.pick_type === "danger");'''
    
    new_picks_extract = '''const winPick = picks.find((p: any) => p.pick_type === "win");
            const placePicks = picks.filter((p: any) => p.pick_type === "place");
            const backPicks = picks.filter((p: any) => p.pick_type === "back");
            const dangerPick = picks.find((p: any) => p.pick_type === "danger");'''
    
    if old_picks_extract in content:
        content = content.replace(old_picks_extract, new_picks_extract)
        print("✅ votes/page.tsx: backPicks取得を追加")
    
    # 2. dangerPickの表示を修正（△→⚠️、backPicks追加）
    old_danger_display = '''{dangerPick && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${dangerPick.is_hit ? "bg-gray-200 text-gray-700 font-bold" : "bg-gray-100 text-gray-400"}`}>
                      △ {dangerPick.race_entries?.post_number}.{(dangerPick.race_entries?.horses as any)?.name}
                      {dangerPick.is_hit ? " ✓" : ""}
                    </span>
                  )}'''
    
    new_back_and_danger = '''{backPicks.length > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
                      △ {backPicks.map((p: any) => p.race_entries?.post_number).join(",")}
                    </span>
                  )}
                  {dangerPick && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${dangerPick.is_hit ? "bg-gray-200 text-gray-700 font-bold" : "bg-gray-100 text-gray-400"}`}>
                      ⚠️ {dangerPick.race_entries?.post_number}.{(dangerPick.race_entries?.horses as any)?.name}
                      {dangerPick.is_hit ? " ✓" : ""}
                    </span>
                  )}'''
    
    if old_danger_display in content:
        content = content.replace(old_danger_display, new_back_and_danger)
        print("✅ votes/page.tsx: △抑え表示追加、危険馬を⚠️に変更")
    else:
        print("⚠️  votes/page.tsx: dangerPick表示パターンが見つかりません")
    
    file_path.write_text(content, encoding="utf-8")
    return True


def main():
    script_dir = Path(__file__).parent
    if script_dir.name == "scripts":
        project_root = script_dir.parent
    else:
        project_root = Path.cwd()
    
    print("=== △抑え表示の統一修正 ===\n")
    
    update_timeline_item(project_root)
    print("")
    update_user_activity_feed(project_root)
    print("")
    update_votes_page(project_root)
    
    print("")
    print("🎉 3ファイルの修正が完了しました")
    print("")
    print("変更内容:")
    print("  - △の馬を「△ 1,2,3,12」のように馬番のみ1枠にまとめ")
    print("  - 危険馬マークを△→⚠️に統一")


if __name__ == "__main__":
    main()
