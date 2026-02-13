import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/admin";
import { NextResponse } from "next/server";

type Props = {
  params: Promise<{ raceId: string }>;
};

export async function GET(request: Request, { params }: Props) {
  const { raceId } = await params;

  // 認証チェック（ログイン済みユーザーのみ閲覧可）
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  // レート制限
  const rl = rateLimit(`votes:${user.id}`, { limit: 60, windowMs: 60_000 });
  if (!rl.ok) return rateLimitResponse();

  // 集計にはAdmin clientを使用（RLSバイパスで全投票を集計）
  const admin = createAdminClient();

  // 全投票データを取得
  const { data: votes, error: votesErr } = await admin
    .from("votes")
    .select("id, user_id, profiles(rank_id)")
    .eq("race_id", raceId);

  if (votesErr) {
    return NextResponse.json({ error: votesErr.message }, { status: 500 });
  }

  const totalVotes = votes?.length ?? 0;

  // 全 vote_picks を取得
  const voteIds = votes?.map((v) => v.id) ?? [];
  if (voteIds.length === 0) {
    return NextResponse.json({ total_votes: 0, win: [], place: [], danger: [] });
  }

  const { data: picks } = await admin
    .from("vote_picks")
    .select("vote_id, pick_type, race_entry_id")
    .in("vote_id", voteIds);

  // エントリー情報
  const { data: entries } = await admin
    .from("race_entries")
    .select("id, post_number, odds, popularity, horses(name)")
    .eq("race_id", raceId)
    .order("post_number");

  const entryMap = new Map(
    (entries ?? []).map((e: any) => [
      e.id,
      {
        id: e.id,
        post_number: e.post_number,
        horse_name: (e.horses as any)?.name ?? "不明",
        odds: e.odds,
        popularity: e.popularity,
      },
    ])
  );

  // 投票者のランク分布
  const rankCounts: Record<string, number> = {};
  for (const vote of votes ?? []) {
    const rankId = (vote.profiles as any)?.rank_id ?? "unknown";
    rankCounts[rankId] = (rankCounts[rankId] ?? 0) + 1;
  }

  // 集計
  const aggregate = (pickType: string) => {
    const counts = new Map<string, number>();
    for (const pick of picks ?? []) {
      if (pick.pick_type === pickType) {
        counts.set(pick.race_entry_id, (counts.get(pick.race_entry_id) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .map(([entryId, count]) => ({
        ...(entryMap.get(entryId) ?? { post_number: 0, horse_name: "不明" }),
        race_entry_id: entryId,
        count,
        percentage: totalVotes > 0 ? Math.round((count / totalVotes) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  };

  return NextResponse.json({
    total_votes: totalVotes,
    win: aggregate("win"),
    place: aggregate("place"),
    danger: aggregate("danger"),
    rank_distribution: rankCounts,
  });
}


// ====== 投票取り消し ======
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ raceId: string }> }
) {
  const { raceId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "ログインが必要です" }, { status: 401 });
  }

  // レースの発走時刻チェック（2分前まで変更可能）
  const { createAdminClient } = await import("@/lib/admin");
  const admin = createAdminClient();
  const { data: race } = await admin
    .from("races")
    .select("post_time, status")
    .eq("id", raceId)
    .single();

  if (!race || race.status !== "voting_open") {
    return Response.json({ error: "投票受付中ではありません" }, { status: 400 });
  }

  if (race.post_time) {
    const deadline = new Date(race.post_time).getTime() - 2 * 60 * 1000;
    if (Date.now() > deadline) {
      return Response.json({ error: "締切を過ぎています（発走2分前）" }, { status: 400 });
    }
  }

  // 投票を取得
  const { data: vote } = await supabase
    .from("votes")
    .select("id")
    .eq("race_id", raceId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!vote) {
    return Response.json({ error: "投票が見つかりません" }, { status: 404 });
  }

  // vote_picks → votes の順で削除
  await admin.from("vote_picks").delete().eq("vote_id", vote.id);
  await admin.from("votes").delete().eq("id", vote.id);

  return Response.json({ success: true, message: "投票を取り消しました" });
}


// ====== 投票変更 ======
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ raceId: string }> }
) {
  const { raceId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const body = await request.json();
  const { winPick, placePicks, dangerPick } = body as {
    winPick: string;
    placePicks: string[];
    dangerPick: string | null;
  };

  if (!winPick) {
    return Response.json({ error: "1着予想は必須です" }, { status: 400 });
  }

  // レースの発走時刻チェック
  const { createAdminClient } = await import("@/lib/admin");
  const admin = createAdminClient();
  const { data: race } = await admin
    .from("races")
    .select("post_time, status")
    .eq("id", raceId)
    .single();

  if (!race || race.status !== "voting_open") {
    return Response.json({ error: "投票受付中ではありません" }, { status: 400 });
  }

  if (race.post_time) {
    const deadline = new Date(race.post_time).getTime() - 2 * 60 * 1000;
    if (Date.now() > deadline) {
      return Response.json({ error: "締切を過ぎています（発走2分前）" }, { status: 400 });
    }
  }

  // 既存投票を取得
  const { data: vote } = await supabase
    .from("votes")
    .select("id")
    .eq("race_id", raceId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!vote) {
    return Response.json({ error: "投票が見つかりません" }, { status: 404 });
  }

  // 既存 picks を削除して新しいものを挿入
  await admin.from("vote_picks").delete().eq("vote_id", vote.id);

  const picks = [
    { vote_id: vote.id, pick_type: "win", race_entry_id: winPick },
    ...placePicks.map((id: string) => ({
      vote_id: vote.id,
      pick_type: "place",
      race_entry_id: id,
    })),
    ...(dangerPick
      ? [{ vote_id: vote.id, pick_type: "danger", race_entry_id: dangerPick }]
      : []),
  ];

  const { error: pickErr } = await admin.from("vote_picks").insert(picks);
  if (pickErr) {
    return Response.json({ error: "投票の更新に失敗しました" }, { status: 500 });
  }

  return Response.json({ success: true, message: "投票を変更しました" });
}
