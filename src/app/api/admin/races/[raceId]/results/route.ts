import { createAdminClient } from "@/lib/admin";
import { NextResponse } from "next/server";

type Props = {
  params: Promise<{ raceId: string }>;
};

// レース結果を登録する
export async function POST(request: Request, { params }: Props) {
  const { raceId } = await params;
  const supabase = createAdminClient();
  const body = await request.json();

  // body.results: [{ race_entry_id, finish_position, finish_time?, margin?, last_3f? }]
  // body.payouts: [{ bet_type, combination, payout_amount, popularity? }]

  if (!body.results || !Array.isArray(body.results) || body.results.length === 0) {
    return NextResponse.json({ error: "results が必要です" }, { status: 400 });
  }

  // 既存の結果を削除（再登録対応）
  await supabase.from("race_results").delete().eq("race_id", raceId);
  await supabase.from("payouts").delete().eq("race_id", raceId);

  // 結果を登録
  const resultInserts = body.results.map((r: any) => ({
    race_id: raceId,
    race_entry_id: r.race_entry_id,
    finish_position: r.finish_position,
    finish_time: r.finish_time ?? null,
    margin: r.margin ?? null,
    last_3f: r.last_3f ?? null,
    corner_positions: r.corner_positions ?? null,
  }));

  const { error: resultErr } = await supabase.from("race_results").insert(resultInserts);
  if (resultErr) {
    return NextResponse.json({ error: resultErr.message }, { status: 500 });
  }

  // 払戻を登録
  if (body.payouts && Array.isArray(body.payouts)) {
    const payoutInserts = body.payouts.map((p: any) => ({
      race_id: raceId,
      bet_type: p.bet_type,
      combination: p.combination,
      payout_amount: p.payout_amount,
      popularity: p.popularity ?? null,
    }));
    await supabase.from("payouts").insert(payoutInserts);
  }

  return NextResponse.json({ success: true, results_count: resultInserts.length });
}
