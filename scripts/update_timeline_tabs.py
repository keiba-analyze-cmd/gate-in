#!/usr/bin/env python3
"""
タイムラインのタブを分けるスクリプト
- 的中報告と投票を別タブに分離

使用方法:
  mv ~/Downloads/update_timeline_tabs.py ~/gate-in/scripts/
  cd ~/gate-in && python3 scripts/update_timeline_tabs.py
"""

from pathlib import Path

def update_timeline_feed(project_root: Path) -> bool:
    file_path = project_root / "src" / "components" / "social" / "TimelineFeed.tsx"
    
    if not file_path.exists():
        print(f"⚠️  TimelineFeed.tsx が見つかりません")
        return False
    
    content = file_path.read_text(encoding="utf-8")
    
    # フィルターを更新
    old_filters = '''const filters = [
    { key: "all", label: "すべて" },
    { key: "vote", label: "🗳 投票結果" },
    { key: "comment", label: "💬 コメント" },
  ];'''
    
    new_filters = '''const filters = [
    { key: "all", label: "すべて" },
    { key: "hit", label: "🎯 的中報告" },
    { key: "vote", label: "🗳 みんなの予想" },
    { key: "comment", label: "💬 コメント" },
  ];'''
    
    if old_filters in content:
        content = content.replace(old_filters, new_filters)
        print("✅ TimelineFeed.tsx: フィルターを更新")
    else:
        print("⚠️  TimelineFeed.tsx: フィルターパターンが見つかりません")
    
    file_path.write_text(content, encoding="utf-8")
    return True


def update_timeline_api(project_root: Path) -> bool:
    file_path = project_root / "src" / "app" / "api" / "timeline" / "route.ts"
    
    if not file_path.exists():
        print(f"⚠️  timeline/route.ts が見つかりません")
        return False
    
    content = file_path.read_text(encoding="utf-8")
    
    # vote取得部分を更新（hit と vote で分ける）
    old_vote_section = '''let voteItems: any[] = [];
  if (filter === "all" || filter === "vote") {
    // settled votes（結果確定済み）
    let settledQ = admin.from("votes")
      .select("id, user_id, race_id, status, earned_points, is_perfect, settled_at, created_at, profiles(display_name, avatar_url, rank_id), races(name, grade, course_name, race_number, race_date), vote_picks(pick_type, race_entries(post_number, horses(name)))")
      .in("user_id", targetIds).neq("status", "pending")
      .order("settled_at", { ascending: false }).limit(limit);
    if (cursor) settledQ = settledQ.lt("settled_at", cursor);
    const { data: settled } = await settledQ;

    const settledItems = (settled ?? []).map((v: any) => ({
      type: "vote_result", id: `vote-${v.id}`, user: v.profiles, user_id: v.user_id,
      race: v.races, race_id: v.race_id, earned_points: v.earned_points,
      is_perfect: v.is_perfect, status: v.status,
      picks: formatPicks(v.vote_picks),
      timestamp: v.settled_at ?? v.created_at,
    }));

    // pending votes（投票直後）
    let pendingQ = admin.from("votes")
      .select("id, user_id, race_id, status, created_at, profiles(display_name, avatar_url, rank_id), races(name, grade, course_name, race_number, race_date), vote_picks(pick_type, race_entries(post_number, horses(name)))")
      .in("user_id", targetIds).eq("status", "pending")
      .order("created_at", { ascending: false }).limit(limit);
    if (cursor) pendingQ = pendingQ.lt("created_at", cursor);
    const { data: pending } = await pendingQ;

    const pendingItems = (pending ?? []).map((v: any) => ({
      type: "vote_submitted", id: `voted-${v.id}`, user: v.profiles, user_id: v.user_id,
      race: v.races, race_id: v.race_id,
      picks: formatPicks(v.vote_picks),
      timestamp: v.created_at,
    }));

    voteItems = [...settledItems, ...pendingItems];
  }'''
    
    new_vote_section = '''let voteItems: any[] = [];

  // 的中報告（settled_hit のみ）
  if (filter === "all" || filter === "hit") {
    let hitQ = admin.from("votes")
      .select("id, user_id, race_id, status, earned_points, is_perfect, settled_at, created_at, profiles(display_name, avatar_url, rank_id), races(name, grade, course_name, race_number, race_date), vote_picks(pick_type, race_entries(post_number, horses(name)))")
      .in("user_id", targetIds).eq("status", "settled_hit")
      .order("settled_at", { ascending: false }).limit(limit);
    if (cursor) hitQ = hitQ.lt("settled_at", cursor);
    const { data: hits } = await hitQ;

    const hitItems = (hits ?? []).map((v: any) => ({
      type: "vote_result", id: `vote-${v.id}`, user: v.profiles, user_id: v.user_id,
      race: v.races, race_id: v.race_id, earned_points: v.earned_points,
      is_perfect: v.is_perfect, status: v.status,
      picks: formatPicks(v.vote_picks),
      timestamp: v.settled_at ?? v.created_at,
    }));

    voteItems = [...voteItems, ...hitItems];
  }

  // みんなの予想（pending のみ）
  if (filter === "all" || filter === "vote") {
    let pendingQ = admin.from("votes")
      .select("id, user_id, race_id, status, created_at, profiles(display_name, avatar_url, rank_id), races(name, grade, course_name, race_number, race_date), vote_picks(pick_type, race_entries(post_number, horses(name)))")
      .in("user_id", targetIds).eq("status", "pending")
      .order("created_at", { ascending: false }).limit(limit);
    if (cursor) pendingQ = pendingQ.lt("created_at", cursor);
    const { data: pending } = await pendingQ;

    const pendingItems = (pending ?? []).map((v: any) => ({
      type: "vote_submitted", id: `voted-${v.id}`, user: v.profiles, user_id: v.user_id,
      race: v.races, race_id: v.race_id,
      picks: formatPicks(v.vote_picks),
      timestamp: v.created_at,
    }));

    voteItems = [...voteItems, ...pendingItems];
  }'''
    
    if old_vote_section in content:
        content = content.replace(old_vote_section, new_vote_section)
        print("✅ timeline/route.ts: 投票フィルターを hit/vote に分離")
    else:
        print("⚠️  timeline/route.ts: 投票セクションパターンが見つかりません")
    
    file_path.write_text(content, encoding="utf-8")
    return True


def main():
    script_dir = Path(__file__).parent
    if script_dir.name == "scripts":
        project_root = script_dir.parent
    else:
        project_root = Path.cwd()
    
    print("=== タイムラインタブ分離 ===\n")
    
    update_timeline_feed(project_root)
    print("")
    update_timeline_api(project_root)
    
    print("")
    print("🎉 タイムラインの更新が完了しました")
    print("")
    print("タブ構成:")
    print("  - すべて")
    print("  - 🎯 的中報告（settled_hit のみ）")
    print("  - 🗳 みんなの予想（pending のみ）")
    print("  - 💬 コメント")


if __name__ == "__main__":
    main()
