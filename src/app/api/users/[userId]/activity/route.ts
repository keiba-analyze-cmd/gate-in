import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/admin";
import { NextResponse } from "next/server";

type Props = { params: Promise<{ userId: string }> };

export async function GET(request: Request, { params }: Props) {
  const { userId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor");
  const limit = parseInt(searchParams.get("limit") ?? "5");

  const admin = createAdminClient();

  // 投票（settled + pending）
  let votesQ = admin.from("votes")
    .select("id, user_id, race_id, status, earned_points, is_perfect, settled_at, created_at, races(name, grade, course_name, race_number, race_date), vote_picks(pick_type, race_entries(post_number, horses(name)))")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit + 1);
  if (cursor) votesQ = votesQ.lt("created_at", cursor);
  const { data: votes } = await votesQ;

  const voteItems = (votes ?? []).map((v: any) => ({
    type: v.status === "pending" ? "vote_submitted" : "vote_result",
    id: `vote-${v.id}`,
    race: v.races,
    race_id: v.race_id,
    earned_points: v.earned_points,
    is_perfect: v.is_perfect,
    status: v.status,
    picks: formatPicks(v.vote_picks),
    timestamp: v.settled_at ?? v.created_at,
  }));

  // コメント（トップレベルのみ）
  let commentsQ = admin.from("comments")
    .select("id, user_id, race_id, body, sentiment, created_at, races(name, grade, course_name, race_number, race_date)")
    .eq("user_id", userId)
    .is("parent_id", null)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .limit(limit + 1);
  if (cursor) commentsQ = commentsQ.lt("created_at", cursor);
  const { data: comments } = await commentsQ;

  const commentItems = (comments ?? []).map((c: any) => ({
    type: "comment",
    id: `comment-${c.id}`,
    race: c.races,
    race_id: c.race_id,
    body: c.body,
    sentiment: c.sentiment,
    timestamp: c.created_at,
  }));

  const allItems = [...voteItems, ...commentItems]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit + 1);

  const hasMore = allItems.length > limit;
  const items = allItems.slice(0, limit);
  const nextCursor = hasMore ? items[items.length - 1].timestamp : null;

  return NextResponse.json({ items, next_cursor: nextCursor });
}

function formatPicks(votePicks: any[]) {
  if (!votePicks) return [];
  return votePicks
    .map((p: any) => ({
      pick_type: p.pick_type,
      post_number: (p.race_entries as any)?.post_number ?? 0,
      horse_name: (p.race_entries as any)?.horses?.name ?? "不明",
    }))
    .sort((a: any, b: any) => {
      const order: Record<string, number> = { win: 0, place: 1, danger: 2 };
      return (order[a.pick_type] ?? 9) - (order[b.pick_type] ?? 9);
    });
}
