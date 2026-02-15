#!/usr/bin/env python3
"""
TOPページの「盛り上がりコメント」を「フォロー中の予想」に変更するスクリプト

使用方法:
  mv ~/Downloads/update_top_following.py ~/gate-in/scripts/
  cd ~/gate-in && python3 scripts/update_top_following.py
"""

from pathlib import Path

def main():
    script_dir = Path(__file__).parent
    if script_dir.name == "scripts":
        project_root = script_dir.parent
    else:
        project_root = Path.cwd()
    
    file_path = project_root / "src" / "app" / "(main)" / "page.tsx"
    
    if not file_path.exists():
        print(f"❌ ファイルが見つかりません: {file_path}")
        return False
    
    content = file_path.read_text(encoding="utf-8")
    
    # 1. importにFollowingVotesを追加
    old_import = '''import NextRaceByVenue from "@/components/races/NextRaceByVenue";'''
    new_import = '''import NextRaceByVenue from "@/components/races/NextRaceByVenue";
import FollowingVotes from "@/components/social/FollowingVotes";'''
    
    if old_import in content and "FollowingVotes" not in content:
        content = content.replace(old_import, new_import)
        print("✅ FollowingVotes importを追加")
    
    # 2. 盛り上がりコメントの取得を削除
    old_hot_comments = '''// 盛り上がりコメント
  const { data: hotComments } = await supabase
    .from("comments")
    .select("id, user_id, body, sentiment, profiles(display_name, rank_id)")
    .is("parent_id", null)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .limit(3);'''
    
    if old_hot_comments in content:
        content = content.replace(old_hot_comments, "")
        print("✅ hotCommentsクエリを削除")
    
    # 3. 盛り上がりコメントセクションをフォロー中の予想に置き換え
    # まずセクション全体を探す
    old_section_start = '''      {/* ====== 💬 盛り上がりコメント ====== */}
      {hotComments && hotComments.length > 0 && (
        <section>
          <h2 className="text-sm font-black text-gray-900 mb-3">💬 盛り上がりコメント</h2>
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden divide-y divide-gray-100">
            {hotComments.map((comment) => {
              const rank = comment.profiles ? getRank((comment.profiles as any).rank_id) : null;
              const sentimentIcon: Record<string, string> = {
                very_positive: "🔥", positive: "👍", negative: "🤔", very_negative: "⚠️",
              };
              return (
                <div key={comment.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                  <Link href={`/users/${comment.user_id}`} className="flex items-center gap-2 mb-1.5 group">
                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-[10px]">👤</div>
                    <span className="text-xs font-bold text-gray-900 group-hover:text-green-600">
                      {(comment.profiles as any)?.display_name ?? "匿名"}
                    </span>
                    {rank && (
                      <span className="text-[10px] text-yellow-700 bg-yellow-50 px-1.5 py-0.5 rounded-full font-bold">
                        {rank.icon} {rank.name}
                      </span>
                    )}
                    {comment.sentiment && (
                      <span className="text-[10px]">{sentimentIcon[comment.sentiment]}</span>
                    )}
                  </Link>
                  <p className="text-xs text-gray-700 ml-8 line-clamp-2">{comment.body}</p>
                </div>
              );
            })}
          </div>
        </section>
      )}'''
    
    new_section = '''      {/* ====== 👥 フォロー中の予想 ====== */}
      <section>
        <FollowingVotes />
      </section>'''
    
    if old_section_start in content:
        content = content.replace(old_section_start, new_section)
        print("✅ 盛り上がりコメントセクションをFollowingVotesに置き換え")
    else:
        print("⚠️  盛り上がりコメントセクションが見つかりません（手動確認が必要）")
    
    file_path.write_text(content, encoding="utf-8")
    print("")
    print("🎉 TOPページを更新しました")
    return True


if __name__ == "__main__":
    main()
