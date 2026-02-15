import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/admin";
import { NextResponse } from "next/server";

type Props = {
  params: Promise<{ voteId: string }>;
};

export async function GET(request: Request, { params }: Props) {
  const { voteId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const admin = createAdminClient();

  // 投票とpicksを取得
  const { data: vote, error } = await admin
    .from("votes")
    .select(`
      id,
      user_id,
      race_id,
      profiles!votes_user_id_fkey(display_name),
      vote_picks(pick_type, race_entry_id)
    `)
    .eq("id", voteId)
    .single();

  if (error || !vote) {
    return NextResponse.json({ error: "投票が見つかりません" }, { status: 404 });
  }

  // 自分自身の投票にはコピーできない
  if (vote.user_id === user.id) {
    return NextResponse.json({ error: "自分の投票にはコピーできません" }, { status: 400 });
  }

  return NextResponse.json({
    vote_id: vote.id,
    user_id: vote.user_id,
    user_name: (vote.profiles as any)?.display_name ?? "匿名",
    race_id: vote.race_id,
    picks: vote.vote_picks ?? [],
  });
}
