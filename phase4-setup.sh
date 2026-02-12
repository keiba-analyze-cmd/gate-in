#!/bin/bash
# ============================================
# ゲートイン！ Phase 4 セットアップスクリプト
# レース結果確定 → ポイント自動計算
# gate-in フォルダ内で実行してください
# ============================================

echo "🏇 ゲートイン！ Phase 4（ポイント自動計算）セットアップを開始します..."
echo ""

# ディレクトリ作成
mkdir -p src/app/api/admin/races/settle
mkdir -p src/app/api/admin/races/\[raceId\]/results
mkdir -p src/app/\(main\)/admin
mkdir -p src/lib/services

# ====== src/lib/services/settle-race.ts ======
echo "📝 src/lib/services/settle-race.ts（コアロジック）"
cat << 'FILEOF' > src/lib/services/settle-race.ts
import { SupabaseClient } from "@supabase/supabase-js";
import { getWinPoints, POINT_RULES } from "@/lib/constants/ranks";

type SettleResult = {
  success: boolean;
  settled_votes: number;
  total_points_awarded: number;
  errors: string[];
};

export async function settleRace(
  supabase: SupabaseClient,
  raceId: string
): Promise<SettleResult> {
  const errors: string[] = [];
  let settledVotes = 0;
  let totalPointsAwarded = 0;

  // 1. レース情報を取得
  const { data: race, error: raceErr } = await supabase
    .from("races")
    .select("*")
    .eq("id", raceId)
    .single();

  if (raceErr || !race) {
    return { success: false, settled_votes: 0, total_points_awarded: 0, errors: ["レースが見つかりません"] };
  }

  // 2. レース結果を取得
  const { data: results, error: resultsErr } = await supabase
    .from("race_results")
    .select("*, race_entries(id, post_number, odds, popularity, horse_id, horses(name))")
    .eq("race_id", raceId)
    .order("finish_position", { ascending: true });

  if (resultsErr || !results || results.length === 0) {
    return { success: false, settled_votes: 0, total_points_awarded: 0, errors: ["レース結果が登録されていません"] };
  }

  // 1着・3着以内のエントリーID
  const winnerEntryId = results.find((r) => r.finish_position === 1)?.race_entry_id;
  const winnerPopularity = results.find((r) => r.finish_position === 1)?.race_entries?.popularity ?? 1;
  const top3EntryIds = results
    .filter((r) => r.finish_position <= 3)
    .map((r) => r.race_entry_id);

  if (!winnerEntryId) {
    return { success: false, settled_votes: 0, total_points_awarded: 0, errors: ["1着が見つかりません"] };
  }

  // 3. 全投票を取得（pending のみ）
  const { data: votes, error: votesErr } = await supabase
    .from("votes")
    .select("*, vote_picks(*)")
    .eq("race_id", raceId)
    .eq("status", "pending");

  if (votesErr) {
    return { success: false, settled_votes: 0, total_points_awarded: 0, errors: [votesErr.message] };
  }

  if (!votes || votes.length === 0) {
    // 投票がなくてもレースは確定する
    await supabase.from("races").update({ status: "finished" }).eq("id", raceId);
    return { success: true, settled_votes: 0, total_points_awarded: 0, errors: [] };
  }

  // 4. 各投票のポイント計算
  for (const vote of votes) {
    try {
      let votePoints = 0;
      const transactions: { reason: string; amount: number; description: string }[] = [];
      let anyHit = false;
      let winHit = false;
      let allPlaceHit = true;
      let dangerHit = false;

      const picks = vote.vote_picks ?? [];

      // --- 1着的中判定 ---
      const winPick = picks.find((p: any) => p.pick_type === "win");
      if (winPick) {
        if (winPick.race_entry_id === winnerEntryId) {
          const pts = getWinPoints(winnerPopularity);
          votePoints += pts;
          winHit = true;
          anyHit = true;
          transactions.push({
            reason: "win_hit",
            amount: pts,
            description: `1着的中（${winnerPopularity}番人気）+${pts}P`,
          });

          // vote_picks を更新
          await supabase
            .from("vote_picks")
            .update({ is_hit: true, points_earned: pts })
            .eq("id", winPick.id);

          // G1/G2/G3 ボーナス
          if (race.grade === "G1") {
            votePoints += POINT_RULES.g1;
            transactions.push({
              reason: "g1_bonus",
              amount: POINT_RULES.g1,
              description: "G1的中ボーナス +100P",
            });
          }
        } else {
          await supabase
            .from("vote_picks")
            .update({ is_hit: false, points_earned: 0 })
            .eq("id", winPick.id);
        }
      }

      // --- 複勝的中判定 ---
      const placePicks = picks.filter((p: any) => p.pick_type === "place");
      for (const pp of placePicks) {
        if (top3EntryIds.includes(pp.race_entry_id)) {
          votePoints += POINT_RULES.place;
          anyHit = true;
          transactions.push({
            reason: "place_hit",
            amount: POINT_RULES.place,
            description: `複勝的中 +${POINT_RULES.place}P`,
          });
          await supabase
            .from("vote_picks")
            .update({ is_hit: true, points_earned: POINT_RULES.place })
            .eq("id", pp.id);
        } else {
          allPlaceHit = false;
          await supabase
            .from("vote_picks")
            .update({ is_hit: false, points_earned: 0 })
            .eq("id", pp.id);
        }
      }
      if (placePicks.length === 0) allPlaceHit = false;

      // --- 危険馬的中判定 ---
      const dangerPickItem = picks.find((p: any) => p.pick_type === "danger");
      if (dangerPickItem) {
        const dangerFinish = results.find(
          (r) => r.race_entry_id === dangerPickItem.race_entry_id
        );
        // 危険馬 = 4着以下（3着以内に入らなかった）
        if (dangerFinish && dangerFinish.finish_position > 3) {
          votePoints += POINT_RULES.danger;
          dangerHit = true;
          anyHit = true;
          transactions.push({
            reason: "danger_hit",
            amount: POINT_RULES.danger,
            description: `危険馬的中 +${POINT_RULES.danger}P`,
          });
          await supabase
            .from("vote_picks")
            .update({ is_hit: true, points_earned: POINT_RULES.danger })
            .eq("id", dangerPickItem.id);
        } else if (!dangerFinish) {
          // 結果にない（出走取消等）→ 的中扱いにしない
          await supabase
            .from("vote_picks")
            .update({ is_hit: false, points_earned: 0 })
            .eq("id", dangerPickItem.id);
        } else {
          await supabase
            .from("vote_picks")
            .update({ is_hit: false, points_earned: 0 })
            .eq("id", dangerPickItem.id);
        }
      }

      // --- 完全的中ボーナス ---
      const isPerfect = winHit && allPlaceHit && dangerHit;
      if (isPerfect) {
        votePoints += POINT_RULES.perfect;
        transactions.push({
          reason: "perfect_bonus",
          amount: POINT_RULES.perfect,
          description: "完全的中ボーナス +300P",
        });
      }

      // --- 連続的中ボーナス ---
      if (winHit) {
        // 現在のストリークを取得
        const { data: profile } = await supabase
          .from("profiles")
          .select("current_streak, best_streak")
          .eq("id", vote.user_id)
          .single();

        const newStreak = (profile?.current_streak ?? 0) + 1;

        // 3の倍数でボーナス
        if (newStreak > 0 && newStreak % 3 === 0) {
          votePoints += POINT_RULES.streak3;
          transactions.push({
            reason: "streak_bonus",
            amount: POINT_RULES.streak3,
            description: `${newStreak}連続的中ボーナス +${POINT_RULES.streak3}P`,
          });
        }

        // ストリーク更新
        await supabase
          .from("profiles")
          .update({
            current_streak: newStreak,
            best_streak: Math.max(newStreak, profile?.best_streak ?? 0),
          })
          .eq("id", vote.user_id);
      } else {
        // 1着ハズレ → ストリークリセット
        await supabase
          .from("profiles")
          .update({ current_streak: 0 })
          .eq("id", vote.user_id);
      }

      // 5. 投票ステータスを更新
      const status = anyHit ? "settled_hit" : "settled_miss";
      await supabase
        .from("votes")
        .update({
          status,
          earned_points: votePoints,
          is_perfect: isPerfect,
          settled_at: new Date().toISOString(),
        })
        .eq("id", vote.id);

      // 6. ポイント履歴を登録
      if (transactions.length > 0) {
        const txInserts = transactions.map((tx) => ({
          user_id: vote.user_id,
          vote_id: vote.id,
          race_id: raceId,
          amount: tx.amount,
          reason: tx.reason,
          description: tx.description,
        }));
        await supabase.from("points_transactions").insert(txInserts);
      }

      // 7. ユーザープロフィールのポイント・的中数を更新
      const { data: currentProfile } = await supabase
        .from("profiles")
        .select("cumulative_points, monthly_points, total_votes, win_hits, place_hits, danger_hits")
        .eq("id", vote.user_id)
        .single();

      if (currentProfile) {
        const placeHitCount = placePicks.filter((pp: any) =>
          top3EntryIds.includes(pp.race_entry_id)
        ).length;

        await supabase
          .from("profiles")
          .update({
            cumulative_points: currentProfile.cumulative_points + votePoints,
            monthly_points: currentProfile.monthly_points + votePoints,
            total_votes: currentProfile.total_votes + 1,
            win_hits: currentProfile.win_hits + (winHit ? 1 : 0),
            place_hits: currentProfile.place_hits + placeHitCount,
            danger_hits: currentProfile.danger_hits + (dangerHit ? 1 : 0),
          })
          .eq("id", vote.user_id);
      }

      // 8. 大会エントリーを更新
      const now = new Date();
      const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

      const { data: contest } = await supabase
        .from("contests")
        .select("id, min_votes")
        .eq("year_month", yearMonth)
        .eq("status", "active")
        .maybeSingle();

      if (contest) {
        // upsert
        const { data: existing } = await supabase
          .from("contest_entries")
          .select("id, total_points, vote_count")
          .eq("contest_id", contest.id)
          .eq("user_id", vote.user_id)
          .maybeSingle();

        if (existing) {
          const newVoteCount = existing.vote_count + 1;
          await supabase
            .from("contest_entries")
            .update({
              total_points: existing.total_points + votePoints,
              vote_count: newVoteCount,
              is_eligible: newVoteCount >= contest.min_votes,
            })
            .eq("id", existing.id);
        } else {
          await supabase.from("contest_entries").insert({
            contest_id: contest.id,
            user_id: vote.user_id,
            total_points: votePoints,
            vote_count: 1,
            is_eligible: 1 >= contest.min_votes,
          });
        }
      }

      settledVotes++;
      totalPointsAwarded += votePoints;
    } catch (err: any) {
      errors.push(`投票 ${vote.id} のエラー: ${err.message}`);
    }
  }

  // 9. レースステータスを finished に更新
  await supabase.from("races").update({ status: "finished" }).eq("id", raceId);

  return {
    success: errors.length === 0,
    settled_votes: settledVotes,
    total_points_awarded: totalPointsAwarded,
    errors,
  };
}
FILEOF

# ====== src/app/api/admin/races/[raceId]/results/route.ts ======
echo "📝 レース結果登録API"
cat << 'FILEOF' > src/app/api/admin/races/\[raceId\]/results/route.ts
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type Props = {
  params: Promise<{ raceId: string }>;
};

// レース結果を登録する
export async function POST(request: Request, { params }: Props) {
  const { raceId } = await params;
  const supabase = await createClient();
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
FILEOF

# ====== src/app/api/admin/races/settle/route.ts ======
echo "📝 レース結果確定 + ポイント計算API"
cat << 'FILEOF' > src/app/api/admin/races/settle/route.ts
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { settleRace } from "@/lib/services/settle-race";

export async function POST(request: Request) {
  const supabase = await createClient();
  const body = await request.json();
  const { race_id } = body;

  if (!race_id) {
    return NextResponse.json({ error: "race_id が必要です" }, { status: 400 });
  }

  const result = await settleRace(supabase, race_id);

  return NextResponse.json(result, {
    status: result.success ? 200 : 500,
  });
}
FILEOF

# ====== src/app/(main)/admin/page.tsx ======
echo "📝 管理画面"
cat << 'FILEOF' > src/app/\(main\)/admin/page.tsx
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AdminRaceList from "@/components/admin/AdminRaceList";

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // 投票受付中 + 投票締切のレース（結果確定待ち）
  const { data: pendingRaces } = await supabase
    .from("races")
    .select("*, race_entries(id, post_number, horses(name))")
    .in("status", ["voting_open", "voting_closed"])
    .order("race_date", { ascending: false });

  // 結果確定済みのレース（直近5件）
  const { data: finishedRaces } = await supabase
    .from("races")
    .select("*")
    .eq("status", "finished")
    .order("race_date", { ascending: false })
    .limit(5);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">⚙️ 管理画面</h1>
        <span className="text-xs bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full">
          開発用・テスト用
        </span>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
        💡 ここではレース結果を入力して、ポイント自動計算をテストできます。
        本番ではJRA-VAN等の外部APIから自動で結果を取得する予定です。
      </div>

      {/* 結果待ちレース */}
      <section>
        <h2 className="text-lg font-bold text-gray-800 mb-3">📋 結果入力待ち</h2>
        {pendingRaces && pendingRaces.length > 0 ? (
          <AdminRaceList races={pendingRaces} type="pending" />
        ) : (
          <div className="bg-white rounded-xl p-8 text-center text-gray-400">
            結果入力待ちのレースはありません
          </div>
        )}
      </section>

      {/* 確定済みレース */}
      {finishedRaces && finishedRaces.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-gray-800 mb-3">✅ 確定済み</h2>
          <div className="space-y-2">
            {finishedRaces.map((race) => (
              <div key={race.id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center justify-between">
                <div>
                  <span className="font-bold text-sm text-gray-800">{race.name}</span>
                  <span className="text-xs text-gray-400 ml-2">{race.course_name} {race.race_date}</span>
                </div>
                <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full">確定済み</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
FILEOF

# ====== src/components/admin/AdminRaceList.tsx ======
echo "📝 src/components/admin/AdminRaceList.tsx"
mkdir -p src/components/admin
cat << 'FILEOF' > src/components/admin/AdminRaceList.tsx
"use client";

import { useState } from "react";
import AdminSettleForm from "./AdminSettleForm";

type Race = {
  id: string;
  name: string;
  grade: string | null;
  race_date: string;
  course_name: string;
  status: string;
  race_entries: {
    id: string;
    post_number: number;
    horses: { name: string } | null;
  }[];
};

type Props = {
  races: Race[];
  type: "pending" | "finished";
};

export default function AdminRaceList({ races, type }: Props) {
  const [selectedRaceId, setSelectedRaceId] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {races.map((race) => (
        <div key={race.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          {/* レースヘッダー */}
          <button
            onClick={() => setSelectedRaceId(selectedRaceId === race.id ? null : race.id)}
            className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              {race.grade && (
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                  race.grade === "G2" ? "bg-red-100 text-red-700" :
                  race.grade === "G3" ? "bg-green-100 text-green-700" :
                  "bg-gray-100 text-gray-600"
                }`}>
                  {race.grade}
                </span>
              )}
              <span className="font-bold text-sm text-gray-800">{race.name}</span>
              <span className="text-xs text-gray-400">{race.course_name} {race.race_date}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">{race.race_entries?.length ?? 0}頭</span>
              <span className="text-gray-400">{selectedRaceId === race.id ? "▲" : "▼"}</span>
            </div>
          </button>

          {/* 展開: 結果入力フォーム */}
          {selectedRaceId === race.id && (
            <AdminSettleForm race={race} />
          )}
        </div>
      ))}
    </div>
  );
}
FILEOF

# ====== src/components/admin/AdminSettleForm.tsx ======
echo "📝 src/components/admin/AdminSettleForm.tsx"
cat << 'FILEOF' > src/components/admin/AdminSettleForm.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Entry = {
  id: string;
  post_number: number;
  horses: { name: string } | null;
};

type Race = {
  id: string;
  name: string;
  race_entries: Entry[];
};

type Props = {
  race: Race;
};

export default function AdminSettleForm({ race }: Props) {
  const router = useRouter();
  const entries = race.race_entries?.sort((a, b) => a.post_number - b.post_number) ?? [];

  // 着順入力（馬番 → 着順のマッピング）
  const [positions, setPositions] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"input" | "settling" | "done">("input");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const setPosition = (entryId: string, pos: string) => {
    setPositions((prev) => ({ ...prev, [entryId]: pos }));
  };

  // ステップ1: 結果を登録
  const handleRegisterResults = async () => {
    // バリデーション: 1着は必須
    const hasFirst = Object.values(positions).includes("1");
    if (!hasFirst) {
      setError("1着を入力してください");
      return;
    }

    setLoading(true);
    setError("");

    // 結果データを構築
    const resultData = Object.entries(positions)
      .filter(([_, pos]) => pos && parseInt(pos) > 0)
      .map(([entryId, pos]) => ({
        race_entry_id: entryId,
        finish_position: parseInt(pos),
      }));

    // API: 結果を登録
    const res = await fetch(`/api/admin/races/${race.id}/results`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ results: resultData }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError("結果登録エラー: " + (data.error ?? ""));
      setLoading(false);
      return;
    }

    // API: ポイント計算実行
    setStep("settling");
    const settleRes = await fetch("/api/admin/races/settle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ race_id: race.id }),
    });

    const settleData = await settleRes.json();
    setResult(settleData);
    setStep("done");
    setLoading(false);

    // 3秒後にページ更新
    setTimeout(() => router.refresh(), 3000);
  };

  // クイック入力: 上位3頭を選択式で
  const [first, setFirst] = useState("");
  const [second, setSecond] = useState("");
  const [third, setThird] = useState("");

  const handleQuickSet = () => {
    const newPositions: Record<string, string> = {};
    if (first) newPositions[first] = "1";
    if (second) newPositions[second] = "2";
    if (third) newPositions[third] = "3";

    // 残りの馬は4着以降
    let pos = 4;
    for (const entry of entries) {
      if (!newPositions[entry.id]) {
        newPositions[entry.id] = String(pos);
        pos++;
      }
    }
    setPositions(newPositions);
  };

  if (step === "done" && result) {
    return (
      <div className="p-5 border-t border-gray-100 bg-green-50">
        <h3 className="font-bold text-green-800 mb-3">
          ✅ {race.name} のポイント計算が完了しました！
        </h3>
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div className="bg-white rounded-lg p-3 text-center">
            <div className="text-xs text-gray-500">確定投票数</div>
            <div className="text-xl font-bold text-green-600">{result.settled_votes}</div>
          </div>
          <div className="bg-white rounded-lg p-3 text-center">
            <div className="text-xs text-gray-500">総付与ポイント</div>
            <div className="text-xl font-bold text-green-600">{result.total_points_awarded} P</div>
          </div>
          <div className="bg-white rounded-lg p-3 text-center">
            <div className="text-xs text-gray-500">ステータス</div>
            <div className="text-xl font-bold text-green-600">
              {result.success ? "成功" : "一部エラー"}
            </div>
          </div>
        </div>
        {result.errors?.length > 0 && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
            {result.errors.join(", ")}
          </div>
        )}
        <p className="text-xs text-gray-500 mt-2">ページが自動で更新されます...</p>
      </div>
    );
  }

  if (step === "settling") {
    return (
      <div className="p-5 border-t border-gray-100 bg-yellow-50 text-center">
        <div className="text-2xl mb-2">⏳</div>
        <p className="font-bold text-yellow-800">ポイント計算中...</p>
      </div>
    );
  }

  return (
    <div className="p-5 border-t border-gray-100 space-y-4">
      {/* クイック入力 */}
      <div className="bg-blue-50 rounded-xl p-4">
        <h3 className="text-sm font-bold text-blue-800 mb-3">🏆 かんたん入力（上位3頭を選択）</h3>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-blue-600 mb-1 font-medium">🥇 1着</label>
            <select
              value={first}
              onChange={(e) => setFirst(e.target.value)}
              className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value="">選択</option>
              {entries.map((e) => (
                <option key={e.id} value={e.id} disabled={e.id === second || e.id === third}>
                  {e.post_number} {e.horses?.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-blue-600 mb-1 font-medium">🥈 2着</label>
            <select
              value={second}
              onChange={(e) => setSecond(e.target.value)}
              className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value="">選択</option>
              {entries.map((e) => (
                <option key={e.id} value={e.id} disabled={e.id === first || e.id === third}>
                  {e.post_number} {e.horses?.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-blue-600 mb-1 font-medium">🥉 3着</label>
            <select
              value={third}
              onChange={(e) => setThird(e.target.value)}
              className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value="">選択</option>
              {entries.map((e) => (
                <option key={e.id} value={e.id} disabled={e.id === first || e.id === second}>
                  {e.post_number} {e.horses?.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button
          onClick={handleQuickSet}
          disabled={!first}
          className="mt-3 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors"
        >
          この着順をセット
        </button>
      </div>

      {/* 着順一覧 */}
      {Object.keys(positions).length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-gray-700 mb-2">📋 着順確認</h3>
          <div className="space-y-1.5">
            {entries
              .filter((e) => positions[e.id])
              .sort((a, b) => parseInt(positions[a.id] ?? "99") - parseInt(positions[b.id] ?? "99"))
              .map((entry) => (
                <div key={entry.id} className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    positions[entry.id] === "1" ? "bg-yellow-400 text-white" :
                    positions[entry.id] === "2" ? "bg-gray-300 text-white" :
                    positions[entry.id] === "3" ? "bg-orange-400 text-white" :
                    "bg-gray-200 text-gray-600"
                  }`}>
                    {positions[entry.id]}
                  </span>
                  <span className="font-medium text-sm">
                    {entry.post_number} {entry.horses?.name}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>
      )}

      {/* 確定ボタン */}
      <button
        onClick={handleRegisterResults}
        disabled={loading || !positions[entries[0]?.id]}
        className="w-full py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors disabled:opacity-40"
      >
        {loading ? "処理中..." : "🏁 結果を確定してポイントを計算する"}
      </button>
    </div>
  );
}
FILEOF

# ====== ヘッダーに管理画面リンクを追加 ======
echo "📝 ヘッダーに管理画面リンクを追加"
cat << 'FILEOF' > src/components/layout/Header.tsx
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getRank } from "@/lib/constants/ranks";
import LogoutButton from "@/components/LogoutButton";

export default async function Header() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let profile = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("display_name, avatar_url, rank_id, cumulative_points")
      .eq("id", user.id)
      .single();
    profile = data;
  }

  const rank = profile ? getRank(profile.rank_id) : null;

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-4 h-14">
        <Link href="/" className="text-xl font-bold text-green-600 shrink-0">
          🏇 ゲートイン！
        </Link>

        <nav className="hidden md:flex items-center gap-1 ml-8">
          <NavLink href="/">トップ</NavLink>
          <NavLink href="/races">レース</NavLink>
          <NavLink href="/admin">管理</NavLink>
        </nav>

        <div className="flex items-center gap-3">
          {profile ? (
            <>
              <div className="hidden sm:flex items-center gap-2 bg-green-50 px-3 py-1.5 rounded-full">
                <span className="text-xs">{rank?.icon}</span>
                <span className="text-sm font-bold text-green-700">
                  {profile.cumulative_points} P
                </span>
              </div>
              <span className="text-sm text-gray-600 hidden sm:block">
                {profile.display_name}
              </span>
              <LogoutButton />
            </>
          ) : (
            <Link href="/login" className="text-sm bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
              ログイン
            </Link>
          )}
        </div>
      </div>

      <nav className="md:hidden flex border-t border-gray-100">
        <MobileNavLink href="/">トップ</MobileNavLink>
        <MobileNavLink href="/races">レース</MobileNavLink>
        <MobileNavLink href="/admin">管理</MobileNavLink>
      </nav>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors">
      {children}
    </Link>
  );
}

function MobileNavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="flex-1 text-center py-2.5 text-sm font-medium text-gray-600 hover:text-green-600 hover:bg-green-50 transition-colors">
      {children}
    </Link>
  );
}
FILEOF

echo ""
echo "✅ Phase 4 セットアップ完了！"
echo ""
echo "📂 作成されたファイル:"
echo "  src/lib/services/settle-race.ts              ← ポイント計算コアロジック"
echo "  src/app/api/admin/races/[raceId]/results/route.ts ← 結果登録API"
echo "  src/app/api/admin/races/settle/route.ts      ← 結果確定+ポイント計算API"
echo "  src/app/(main)/admin/page.tsx                ← 管理画面"
echo "  src/components/admin/AdminRaceList.tsx        ← 管理レース一覧"
echo "  src/components/admin/AdminSettleForm.tsx      ← 結果入力フォーム"
echo "  src/components/layout/Header.tsx             ← 管理リンク追加"
echo ""
echo "🎮 テスト手順:"
echo "  1. pkill -f 'next dev'; rm -rf .next/dev/lock; npm run dev"
echo "  2. http://localhost:3000/admin にアクセス"
echo "  3. 京都記念の行をクリック → 展開"
echo "  4. 「かんたん入力」で 1着・2着・3着を選ぶ"
echo "  5. 「この着順をセット」→「結果を確定してポイントを計算する」"
echo "  6. ✅ ポイント計算完了！と表示される"
echo "  7. レース詳細ページで結果・ポイントが反映されている"
echo "  8. ヘッダーのポイント表示も更新されている"
