import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/admin";
import { NextResponse } from "next/server";

type Props = {
  params: Promise<{ raceId: string }>;
};

export async function GET(request: Request, { params }: Props) {
  const { raceId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const { data: members } = await supabase
    .from("newspaper_members")
    .select("member_user_id, display_order, profiles!newspaper_members_member_user_id_fkey(display_name, avatar_url, rank_id)")
    .eq("user_id", user.id)
    .order("display_order", { ascending: true });

  if (!members || members.length === 0) {
    return NextResponse.json({ members: [], picks: [] });
  }

  const memberUserIds = members.map((m: any) => m.member_user_id);

  const admin = createAdminClient();
  const { data: votes } = await admin
    .from("votes")
    .select("id, user_id, vote_picks(pick_type, race_entry_id)")
    .eq("race_id", raceId)
    .in("user_id", memberUserIds);

  const formattedMembers = members.map((m: any) => ({
    user_id: m.member_user_id,
    display_name: m.profiles?.display_name ?? "匿名",
    avatar_url: m.profiles?.avatar_url,
    rank_id: m.profiles?.rank_id ?? "beginner_1",
  }));

  const formattedPicks = (votes ?? []).map((v: any) => ({
    user_id: v.user_id,
    picks: v.vote_picks ?? [],
  }));

  return NextResponse.json({
    members: formattedMembers,
    picks: formattedPicks,
  });
}
