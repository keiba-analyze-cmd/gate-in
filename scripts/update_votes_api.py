#!/usr/bin/env python3
"""
投票変更APIにbackPicksを追加するスクリプト

使用方法:
  mv ~/Downloads/update_votes_api.py ~/gate-in/scripts/
  cd ~/gate-in && python3 scripts/update_votes_api.py
"""

from pathlib import Path

def main():
    script_dir = Path(__file__).parent
    if script_dir.name == "scripts":
        project_root = script_dir.parent
    else:
        project_root = Path.cwd()
    
    file_path = project_root / "src" / "app" / "api" / "races" / "[raceId]" / "votes" / "route.ts"
    
    if not file_path.exists():
        print(f"❌ ファイルが見つかりません: {file_path}")
        return False
    
    content = file_path.read_text(encoding="utf-8")
    
    # 1. bodyの受け取り部分を更新
    old_body = '''const body = await request.json();
  const { winPick, placePicks, dangerPick } = body as {
    winPick: string;
    placePicks: string[];
    dangerPick: string | null;
  };'''
    
    new_body = '''const body = await request.json();
  const { winPick, placePicks, backPicks, dangerPick } = body as {
    winPick: string;
    placePicks: string[];
    backPicks?: string[];
    dangerPick: string | null;
  };'''
    
    if old_body in content:
        content = content.replace(old_body, new_body)
        print("✅ body受け取り部分を更新")
    else:
        print("⚠️  body受け取り部分が見つかりません")
    
    # 2. picksの作成部分を更新
    old_picks = '''const picks = [
    { vote_id: vote.id, pick_type: "win", race_entry_id: winPick },
    ...placePicks.map((id: string) => ({
      vote_id: vote.id,
      pick_type: "place",
      race_entry_id: id,
    })),
    ...(dangerPick
      ? [{ vote_id: vote.id, pick_type: "danger", race_entry_id: dangerPick }]
      : []),
  ];'''
    
    new_picks = '''const picks = [
    { vote_id: vote.id, pick_type: "win", race_entry_id: winPick },
    ...placePicks.map((id: string) => ({
      vote_id: vote.id,
      pick_type: "place",
      race_entry_id: id,
    })),
    ...(backPicks ?? []).map((id: string) => ({
      vote_id: vote.id,
      pick_type: "back",
      race_entry_id: id,
    })),
    ...(dangerPick
      ? [{ vote_id: vote.id, pick_type: "danger", race_entry_id: dangerPick }]
      : []),
  ];'''
    
    if old_picks in content:
        content = content.replace(old_picks, new_picks)
        print("✅ picks作成部分を更新")
    else:
        print("⚠️  picks作成部分が見つかりません")
    
    # 3. GET関数のaggregateにbackを追加
    old_return = '''return NextResponse.json({
    total_votes: totalVotes,
    win: aggregate("win"),
    place: aggregate("place"),
    danger: aggregate("danger"),
    rank_distribution: rankCounts,
  });'''
    
    new_return = '''return NextResponse.json({
    total_votes: totalVotes,
    win: aggregate("win"),
    place: aggregate("place"),
    back: aggregate("back"),
    danger: aggregate("danger"),
    rank_distribution: rankCounts,
  });'''
    
    if old_return in content:
        content = content.replace(old_return, new_return)
        print("✅ GET関数のレスポンスにback追加")
    else:
        print("⚠️  GET関数のレスポンスが見つかりません")
    
    file_path.write_text(content, encoding="utf-8")
    print("")
    print("🎉 votes/route.ts を更新しました")
    return True


if __name__ == "__main__":
    main()
