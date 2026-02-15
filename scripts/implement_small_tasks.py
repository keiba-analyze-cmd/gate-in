#!/usr/bin/env python3
"""
3つの小工数タスクをまとめて実装

1. プロフィールにお気に入りバッジ表示
2. タイムラインにいいねボタン追加
3. いいねした予想一覧

使用方法:
  mv ~/Downloads/implement_small_tasks.py ~/gate-in/scripts/
  cd ~/gate-in && python3 scripts/implement_small_tasks.py
"""

from pathlib import Path

def update_mypage(project_root: Path) -> bool:
    """マイページにお気に入りバッジ表示を追加"""
    file_path = project_root / "src" / "app" / "(main)" / "mypage" / "page.tsx"
    
    if not file_path.exists():
        print(f"⚠️  mypage/page.tsx が見つかりません")
        return False
    
    content = file_path.read_text(encoding="utf-8")
    
    # 1. featured_badge_idの取得を追加（プロフィール取得部分）
    old_select = '''.select("*")
    .eq("id", user.id)
    .single();'''
    
    new_select = '''.select("*, featured_badge:badges!profiles_featured_badge_id_fkey(id, name, icon)")
    .eq("id", user.id)
    .single();'''
    
    if old_select in content:
        content = content.replace(old_select, new_select)
        print("✅ マイページ: featured_badge取得を追加")
    
    # 2. プロフィールカード内にお気に入りバッジ表示を追加
    old_display_name = '''<div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">{profile.display_name}</h1>'''
    
    new_display_name = '''<div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">{profile.display_name}</h1>
            {(profile as any).featured_badge && (
              <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                {(profile as any).featured_badge.icon} {(profile as any).featured_badge.name}
              </span>
            )}'''
    
    if old_display_name in content:
        content = content.replace(old_display_name, new_display_name)
        print("✅ マイページ: お気に入りバッジ表示を追加")
    
    file_path.write_text(content, encoding="utf-8")
    return True


def update_user_profile(project_root: Path) -> bool:
    """他人のプロフィールにお気に入りバッジ表示を追加"""
    file_path = project_root / "src" / "app" / "(main)" / "users" / "[userId]" / "page.tsx"
    
    if not file_path.exists():
        print(f"⚠️  users/[userId]/page.tsx が見つかりません")
        return False
    
    content = file_path.read_text(encoding="utf-8")
    
    # 1. featured_badge_idの取得を追加
    old_select = '''.select("*")
    .eq("id", userId)
    .single();'''
    
    new_select = '''.select("*, featured_badge:badges!profiles_featured_badge_id_fkey(id, name, icon)")
    .eq("id", userId)
    .single();'''
    
    if old_select in content:
        content = content.replace(old_select, new_select)
        print("✅ ユーザープロフィール: featured_badge取得を追加")
    
    # 2. ユーザー名の横にバッジ表示を追加
    # まずファイル内容を確認して適切な場所を見つける
    old_name_display = '''<h1 className="text-xl font-bold text-white">{profile.display_name}</h1>'''
    
    new_name_display = '''<div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white">{profile.display_name}</h1>
              {(profile as any).featured_badge && (
                <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                  {(profile as any).featured_badge.icon} {(profile as any).featured_badge.name}
                </span>
              )}
            </div>'''
    
    if old_name_display in content:
        content = content.replace(old_name_display, new_name_display)
        print("✅ ユーザープロフィール: お気に入りバッジ表示を追加")
    else:
        print("⚠️  ユーザープロフィール: 名前表示パターンが見つかりません（手動確認が必要）")
    
    file_path.write_text(content, encoding="utf-8")
    return True


def update_timeline_item(project_root: Path) -> bool:
    """TimelineItemにいいねボタンを追加"""
    file_path = project_root / "src" / "components" / "social" / "TimelineItem.tsx"
    
    if not file_path.exists():
        print(f"⚠️  TimelineItem.tsx が見つかりません")
        return False
    
    content = file_path.read_text(encoding="utf-8")
    
    # 1. LikeButtonのimportを追加
    old_import = '''import { getRank } from "@/lib/constants/ranks";'''
    new_import = '''import { getRank } from "@/lib/constants/ranks";
import LikeButton from "./LikeButton";'''
    
    if old_import in content and "LikeButton" not in content:
        content = content.replace(old_import, new_import)
        print("✅ TimelineItem: LikeButton importを追加")
    
    # 2. Propsにvote_idとlike_countを追加
    old_props = '''type Props = {
  item: {
    type: string;
    id: string;
    user: { display_name: string; avatar_url: string | null; rank_id: string } | null;
    user_id: string;
    race: { name: string; grade: string | null; course_name: string; race_number?: number | null; race_date?: string } | null;
    race_id: string;
    earned_points?: number;
    is_perfect?: boolean;
    status?: string;
    body?: string;
    sentiment?: string;
    picks?: Pick[];
    timestamp: string;
    comment_id?: string;
  };
};'''
    
    new_props = '''type Props = {
  item: {
    type: string;
    id: string;
    vote_id?: string;
    like_count?: number;
    user: { display_name: string; avatar_url: string | null; rank_id: string } | null;
    user_id: string;
    race: { name: string; grade: string | null; course_name: string; race_number?: number | null; race_date?: string } | null;
    race_id: string;
    earned_points?: number;
    is_perfect?: boolean;
    status?: string;
    body?: string;
    sentiment?: string;
    picks?: Pick[];
    timestamp: string;
    comment_id?: string;
  };
};'''
    
    if old_props in content:
        content = content.replace(old_props, new_props)
        print("✅ TimelineItem: Props型にvote_id, like_countを追加")
    
    # 3. vote_submitted の最後にいいねボタンを追加
    # レースを見るリンクの後に追加
    old_vote_submitted_end = '''<Link href={`/races/${item.race_id}`} className="text-[11px] text-green-600 font-bold mt-2 inline-block hover:underline">
            📋 レースを見る
          </Link>
        </div>
      )}

      {/* 結果確定（vote_result） */}'''
    
    new_vote_submitted_end = '''<div className="flex items-center justify-between mt-2">
            <Link href={`/races/${item.race_id}`} className="text-[11px] text-green-600 font-bold hover:underline">
              📋 レースを見る
            </Link>
            {item.vote_id && (
              <LikeButton voteId={item.vote_id} initialCount={item.like_count ?? 0} />
            )}
          </div>
        </div>
      )}

      {/* 結果確定（vote_result） */}'''
    
    if old_vote_submitted_end in content:
        content = content.replace(old_vote_submitted_end, new_vote_submitted_end)
        print("✅ TimelineItem: vote_submittedにいいねボタン追加")
    
    # 4. vote_result の最後にもいいねボタンを追加
    old_vote_result_end = '''<Link href={`/races/${item.race_id}`} className="text-[11px] text-green-600 font-bold mt-2 inline-block hover:underline">
            📋 レースを見る
          </Link>
        </div>
      )}

      {/* コメント */}'''
    
    new_vote_result_end = '''<div className="flex items-center justify-between mt-2">
            <Link href={`/races/${item.race_id}`} className="text-[11px] text-green-600 font-bold hover:underline">
              📋 レースを見る
            </Link>
            {item.vote_id && (
              <LikeButton voteId={item.vote_id} initialCount={item.like_count ?? 0} />
            )}
          </div>
        </div>
      )}

      {/* コメント */}'''
    
    if old_vote_result_end in content:
        content = content.replace(old_vote_result_end, new_vote_result_end)
        print("✅ TimelineItem: vote_resultにいいねボタン追加")
    
    file_path.write_text(content, encoding="utf-8")
    return True


def update_timeline_api(project_root: Path) -> bool:
    """Timeline APIにvote_idとlike_countを追加"""
    file_path = project_root / "src" / "app" / "api" / "timeline" / "route.ts"
    
    if not file_path.exists():
        print(f"⚠️  timeline/route.ts が見つかりません")
        return False
    
    content = file_path.read_text(encoding="utf-8")
    
    # 1. hitItemsにvote_idとlike_countを追加
    old_hit_map = '''const hitItems = (hits ?? []).map((v: any) => ({
      type: "vote_result", id: `vote-${v.id}`, user: v.profiles, user_id: v.user_id,
      race: v.races, race_id: v.race_id, earned_points: v.earned_points,
      is_perfect: v.is_perfect, status: v.status,
      picks: formatPicks(v.vote_picks),
      timestamp: v.settled_at ?? v.created_at,
    }));'''
    
    new_hit_map = '''const hitItems = (hits ?? []).map((v: any) => ({
      type: "vote_result", id: `vote-${v.id}`, vote_id: v.id, like_count: v.like_count ?? 0,
      user: v.profiles, user_id: v.user_id,
      race: v.races, race_id: v.race_id, earned_points: v.earned_points,
      is_perfect: v.is_perfect, status: v.status,
      picks: formatPicks(v.vote_picks),
      timestamp: v.settled_at ?? v.created_at,
    }));'''
    
    if old_hit_map in content:
        content = content.replace(old_hit_map, new_hit_map)
        print("✅ Timeline API: hitItemsにvote_id, like_count追加")
    
    # 2. pendingItemsにvote_idとlike_countを追加
    old_pending_map = '''const pendingItems = (pending ?? []).map((v: any) => ({
      type: "vote_submitted", id: `voted-${v.id}`, user: v.profiles, user_id: v.user_id,
      race: v.races, race_id: v.race_id,
      picks: formatPicks(v.vote_picks),
      timestamp: v.created_at,
    }));'''
    
    new_pending_map = '''const pendingItems = (pending ?? []).map((v: any) => ({
      type: "vote_submitted", id: `voted-${v.id}`, vote_id: v.id, like_count: v.like_count ?? 0,
      user: v.profiles, user_id: v.user_id,
      race: v.races, race_id: v.race_id,
      picks: formatPicks(v.vote_picks),
      timestamp: v.created_at,
    }));'''
    
    if old_pending_map in content:
        content = content.replace(old_pending_map, new_pending_map)
        print("✅ Timeline API: pendingItemsにvote_id, like_count追加")
    
    # 3. selectにlike_countを追加（hitQ）
    old_hit_select = '''.select("id, user_id, race_id, status, earned_points, is_perfect, settled_at, created_at, profiles(display_name, avatar_url, rank_id), races(name, grade, course_name, race_number, race_date), vote_picks(pick_type, race_entries(post_number, horses(name)))")'''
    
    new_hit_select = '''.select("id, user_id, race_id, status, earned_points, is_perfect, like_count, settled_at, created_at, profiles(display_name, avatar_url, rank_id), races(name, grade, course_name, race_number, race_date), vote_picks(pick_type, race_entries(post_number, horses(name)))")'''
    
    content = content.replace(old_hit_select, new_hit_select)
    
    # 4. selectにlike_countを追加（pendingQ）
    old_pending_select = '''.select("id, user_id, race_id, status, created_at, profiles(display_name, avatar_url, rank_id), races(name, grade, course_name, race_number, race_date), vote_picks(pick_type, race_entries(post_number, horses(name)))")'''
    
    new_pending_select = '''.select("id, user_id, race_id, status, like_count, created_at, profiles(display_name, avatar_url, rank_id), races(name, grade, course_name, race_number, race_date), vote_picks(pick_type, race_entries(post_number, horses(name)))")'''
    
    content = content.replace(old_pending_select, new_pending_select)
    print("✅ Timeline API: selectにlike_count追加")
    
    file_path.write_text(content, encoding="utf-8")
    return True


def main():
    script_dir = Path(__file__).parent
    if script_dir.name == "scripts":
        project_root = script_dir.parent
    else:
        project_root = Path.cwd()
    
    print("=== 小工数タスク一括実装 ===\n")
    
    print("【タスク1: お気に入りバッジ表示】")
    update_mypage(project_root)
    update_user_profile(project_root)
    print("")
    
    print("【タスク2: タイムラインいいねボタン】")
    update_timeline_item(project_root)
    update_timeline_api(project_root)
    print("")
    
    print("🎉 スクリプト実行完了！")
    print("")
    print("残りの手動作業:")
    print("  - いいねした予想一覧API・ページは別ファイルで作成")


if __name__ == "__main__":
    main()
