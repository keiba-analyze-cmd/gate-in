#!/bin/bash
set -e

echo "=================================================="
echo "🏇 レース結果自動取得（netkeiba→ワンクリック承認）"
echo "=================================================="
echo ""

# ============================================================
# 1. 結果スクレイプAPI
# ============================================================
echo "━━━ 1. 結果スクレイプAPI ━━━"

mkdir -p src/app/api/admin/scrape-results
cat > src/app/api/admin/scrape-results/route.ts << 'EOF'
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/admin";
import { load } from "cheerio";
import iconv from "iconv-lite";

async function checkAdmin() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("id, is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) return null;
  return user;
}

async function fetchPage(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      "Accept": "text/html,application/xhtml+xml",
      "Accept-Language": "ja,en;q=0.9",
    },
  });
  const buffer = Buffer.from(await res.arrayBuffer());
  const eucHtml = iconv.decode(buffer, "EUC-JP");
  if (/[あ-んア-ン一-龥]/.test(eucHtml)) return eucHtml;
  return buffer.toString("utf8");
}

async function scrapeResults(externalRaceId: string) {
  const url = `https://race.netkeiba.com/race/result.html?race_id=${externalRaceId}`;
  const html = await fetchPage(url);
  const $ = load(html);

  const results: {
    post_number: number; horse_name: string; finish_position: number;
    finish_time: string | null; jockey: string;
  }[] = [];

  $("table.RaceTable01 tbody tr, table.Shutuba_Table tbody tr, #All_Result_Table tbody tr").each((_, row) => {
    const $r = $(row);
    const tds = $r.find("td");
    if (tds.length < 4) return;

    const posText = tds.eq(0).text().trim();
    const pos = parseInt(posText);
    if (!pos || isNaN(pos)) return;

    const postNum = parseInt(tds.eq(2).text().trim());
    if (!postNum || isNaN(postNum)) return;

    const horseName = $r.find("span.Horse_Name a, a[href*='/horse/']").first().text().trim()
      || tds.eq(3).text().trim();
    if (!horseName) return;

    const timeText = tds.eq(7).text().trim() || null;
    const jockey = $r.find("a[href*='/jockey/']").first().text().trim() || "";

    results.push({
      finish_position: pos, post_number: postNum,
      horse_name: horseName.replace(/\s+/g, ""),
      finish_time: timeText, jockey,
    });
  });

  const payouts: { bet_type: string; combination: string; payout_amount: number; popularity: number | null }[] = [];

  $(".Payout_Detail_Table tr, .Result_Pay_Back table tr, table.Pay_Table_01 tr").each((_, row) => {
    const $r = $(row);
    const th = $r.find("th").first().text().trim();
    const tds = $r.find("td");
    if (tds.length < 2) return;

    let betType = "";
    if (/単勝/.test(th)) betType = "win";
    else if (/複勝/.test(th)) betType = "place";
    else if (/枠連/.test(th)) betType = "bracket_quinella";
    else if (/馬連/.test(th)) betType = "quinella";
    else if (/ワイド/.test(th)) betType = "wide";
    else if (/馬単/.test(th)) betType = "exacta";
    else if (/三連複/.test(th)) betType = "trio";
    else if (/三連単/.test(th)) betType = "trifecta";
    else return;

    const combos = tds.eq(0).html()?.split(/<br\s*\/?>/) ?? [tds.eq(0).text()];
    const amounts = tds.eq(1).html()?.split(/<br\s*\/?>/) ?? [tds.eq(1).text()];
    const pops = tds.length > 2 ? (tds.eq(2).html()?.split(/<br\s*\/?>/) ?? []) : [];

    for (let i = 0; i < combos.length; i++) {
      const combo = combos[i].replace(/<[^>]*>/g, "").trim();
      const payStr = (amounts[i] ?? "").replace(/<[^>]*>/g, "").replace(/[,、円\s]/g, "").trim();
      const amount = parseInt(payStr);
      if (!combo || !amount || isNaN(amount)) continue;
      const popStr = (pops[i] ?? "").replace(/<[^>]*>/g, "").trim();
      payouts.push({ bet_type: betType, combination: combo, payout_amount: amount, popularity: parseInt(popStr) || null });
    }
  });

  results.sort((a, b) => a.finish_position - b.finish_position);
  return { results, payouts, source_url: url };
}

export async function GET(request: Request) {
  const user = await checkAdmin();
  if (!user) return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });

  const raceId = new URL(request.url).searchParams.get("race_id");
  if (!raceId) return NextResponse.json({ error: "race_id が必要です" }, { status: 400 });

  const admin = createAdminClient();
  const { data: race } = await admin
    .from("races")
    .select("id, name, external_id, race_entries(id, post_number, horses(name))")
    .eq("id", raceId).single();

  if (!race) return NextResponse.json({ error: "レースが見つかりません" }, { status: 404 });
  if (!race.external_id) return NextResponse.json({ error: "external_idが未設定です（手動登録レースは自動取得不可）" }, { status: 400 });

  try {
    const { results, payouts, source_url } = await scrapeResults(race.external_id);

    if (results.length === 0) {
      return NextResponse.json({
        error: "結果が取得できませんでした。レースがまだ終了していない可能性があります。",
        source_url,
      }, { status: 404 });
    }

    const entryMap = new Map(
      ((race.race_entries as any[]) ?? []).map((e: any) => [
        e.post_number, { id: e.id, horse_name: (e.horses as any)?.name }
      ])
    );

    const mappedResults = results.map((r) => {
      const entry = entryMap.get(r.post_number);
      return { ...r, race_entry_id: entry?.id ?? null, db_horse_name: entry?.horse_name ?? null, matched: !!entry };
    });

    return NextResponse.json({
      race_id: race.id, race_name: race.name,
      results: mappedResults, payouts, source_url,
      all_matched: mappedResults.every((r) => r.matched),
    });
  } catch (err: any) {
    return NextResponse.json({ error: "スクレイプエラー: " + err.message }, { status: 500 });
  }
}
EOF
echo "  ✅ src/app/api/admin/scrape-results/route.ts"

# ============================================================
# 2. AdminSettleForm 全置換（自動+手動デュアルモード）
# ============================================================
echo "━━━ 2. AdminSettleForm 全置換 ━━━"

cat > src/components/admin/AdminSettleForm.tsx << 'EOF'
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Entry = { id: string; post_number: number; horses: { name: string } | null };
type Race = { id: string; name: string; external_id?: string | null; race_entries: Entry[] };
type ScrapedResult = {
  post_number: number; horse_name: string; finish_position: number;
  finish_time: string | null; race_entry_id: string | null;
  db_horse_name: string | null; matched: boolean;
};
type Payout = { bet_type: string; combination: string; payout_amount: number; popularity: number | null };

const BET_LABEL: Record<string, string> = {
  win: "単勝", place: "複勝", bracket_quinella: "枠連", quinella: "馬連",
  wide: "ワイド", exacta: "馬単", trio: "三連複", trifecta: "三連単",
};

export default function AdminSettleForm({ race }: { race: Race }) {
  const router = useRouter();
  const entries = race.race_entries?.sort((a, b) => a.post_number - b.post_number) ?? [];
  const [mode, setMode] = useState<"auto" | "manual">(race.external_id ? "auto" : "manual");

  const [autoLoading, setAutoLoading] = useState(false);
  const [autoResults, setAutoResults] = useState<ScrapedResult[] | null>(null);
  const [autoPayouts, setAutoPayouts] = useState<Payout[]>([]);
  const [autoError, setAutoError] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");

  const [positions, setPositions] = useState<Record<string, string>>({});
  const [first, setFirst] = useState("");
  const [second, setSecond] = useState("");
  const [third, setThird] = useState("");

  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"input" | "settling" | "done">("input");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const handleAutoFetch = async () => {
    setAutoLoading(true); setAutoError(""); setAutoResults(null);
    try {
      const res = await fetch(`/api/admin/scrape-results?race_id=${race.id}`);
      const data = await res.json();
      if (!res.ok) { setAutoError(data.error ?? "取得に失敗しました"); setAutoLoading(false); return; }
      setAutoResults(data.results); setAutoPayouts(data.payouts ?? []); setSourceUrl(data.source_url ?? "");
    } catch (e: any) { setAutoError(e.message ?? "通信エラー"); }
    setAutoLoading(false);
  };

  const handleAutoConfirm = async () => {
    if (!autoResults) return;
    setLoading(true); setError(""); setStep("settling");
    try {
      const resultData = autoResults.filter((r) => r.race_entry_id && r.finish_position)
        .map((r) => ({ race_entry_id: r.race_entry_id, finish_position: r.finish_position, finish_time: r.finish_time ?? null }));

      const resR = await fetch(`/api/admin/races/${race.id}/results`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ results: resultData, payouts: autoPayouts }),
      });
      if (!resR.ok) { const d = await resR.json(); setError("結果登録エラー: " + (d.error ?? "")); setStep("input"); setLoading(false); return; }

      const settleRes = await fetch("/api/admin/races/settle", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ race_id: race.id }),
      });
      const settleData = await settleRes.json();
      setResult(settleData); setStep("done");
      setTimeout(() => router.refresh(), 3000);
    } catch (e: any) { setError(e.message ?? "通信エラー"); setStep("input"); }
    setLoading(false);
  };

  const handleQuickSet = () => {
    const p: Record<string, string> = {};
    if (first) p[first] = "1"; if (second) p[second] = "2"; if (third) p[third] = "3";
    let n = 4;
    for (const e of entries) { if (!p[e.id]) { p[e.id] = String(n); n++; } }
    setPositions(p);
  };

  const handleManualConfirm = async () => {
    if (!Object.values(positions).includes("1")) { setError("1着を入力してください"); return; }
    setLoading(true); setError("");
    const rd = Object.entries(positions).filter(([_, p]) => p && parseInt(p) > 0)
      .map(([eid, p]) => ({ race_entry_id: eid, finish_position: parseInt(p) }));
    const res = await fetch(`/api/admin/races/${race.id}/results`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ results: rd }),
    });
    if (!res.ok) { const d = await res.json(); setError("エラー: " + (d.error ?? "")); setLoading(false); return; }
    setStep("settling");
    const sr = await fetch("/api/admin/races/settle", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ race_id: race.id }),
    });
    const sd = await sr.json(); setResult(sd); setStep("done"); setLoading(false);
    setTimeout(() => router.refresh(), 3000);
  };

  if (step === "done" && result) {
    return (
      <div className="p-5 border-t border-gray-100 bg-green-50">
        <h3 className="font-bold text-green-800 mb-3">✅ {race.name} のポイント計算が完了しました！</h3>
        <div className="grid grid-cols-3 gap-3 mb-3">
          {[
            { label: "確定投票数", value: result.settled_votes ?? 0 },
            { label: "総付与ポイント", value: `${result.total_points_awarded ?? 0} P` },
            { label: "ステータス", value: result.success ? "成功" : "一部エラー" },
          ].map((item) => (
            <div key={item.label} className="bg-white rounded-lg p-3 text-center">
              <div className="text-xs text-gray-500">{item.label}</div>
              <div className="text-xl font-bold text-green-600">{item.value}</div>
            </div>
          ))}
        </div>
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
      <div className="flex gap-2">
        <button onClick={() => setMode("auto")} disabled={!race.external_id}
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${mode === "auto" ? "bg-green-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"} ${!race.external_id ? "opacity-40 cursor-not-allowed" : ""}`}>
          🤖 自動取得
        </button>
        <button onClick={() => setMode("manual")}
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${mode === "manual" ? "bg-green-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
          ✏️ 手動入力
        </button>
      </div>
      {!race.external_id && <p className="text-xs text-gray-400">※ 手動登録レースのため自動取得は利用できません</p>}

      {mode === "auto" && (
        <div className="space-y-4">
          {!autoResults ? (
            <div className="bg-green-50 rounded-xl p-6 text-center border border-green-200">
              <div className="text-3xl mb-3">🤖</div>
              <p className="text-sm text-gray-700 mb-4">netkeibaからレース結果を自動取得します</p>
              <button onClick={handleAutoFetch} disabled={autoLoading}
                className="px-6 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 disabled:opacity-50 transition-colors">
                {autoLoading ? "取得中..." : "🔍 結果を取得する"}
              </button>
              {autoError && <p className="text-sm text-red-600 mt-3">{autoError}</p>}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-800">📊 取得結果（{autoResults.length}頭）</h3>
                  {sourceUrl && <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline">netkeiba →</a>}
                </div>
                <div className="divide-y divide-gray-100">
                  {autoResults.slice(0, 12).map((r, i) => (
                    <div key={i} className={`flex items-center gap-3 px-4 py-2.5 ${!r.matched ? "bg-red-50" : r.finish_position <= 3 ? "bg-yellow-50/50" : ""}`}>
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                        r.finish_position === 1 ? "bg-yellow-400 text-white" : r.finish_position === 2 ? "bg-gray-300 text-white" :
                        r.finish_position === 3 ? "bg-orange-400 text-white" : "bg-gray-100 text-gray-600"}`}>
                        {r.finish_position}
                      </span>
                      <span className="w-6 h-6 rounded-full bg-gray-800 text-white flex items-center justify-center text-[10px] font-bold">{r.post_number}</span>
                      <div className="flex-1">
                        <span className="text-sm font-bold text-gray-800">{r.horse_name}</span>
                        {!r.matched && <span className="text-xs text-red-500 ml-2">⚠️ DB未一致</span>}
                      </div>
                      {r.finish_time && <span className="text-xs text-gray-400">{r.finish_time}</span>}
                    </div>
                  ))}
                  {autoResults.length > 12 && <div className="px-4 py-2 text-xs text-gray-400 text-center">... 他{autoResults.length - 12}頭</div>}
                </div>
              </div>

              {autoPayouts.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                    <h3 className="text-sm font-bold text-gray-800">💰 払戻金</h3>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {autoPayouts.map((p, i) => (
                      <div key={i} className="flex items-center gap-3 px-4 py-2">
                        <span className="text-xs font-bold text-gray-600 w-16">{BET_LABEL[p.bet_type] ?? p.bet_type}</span>
                        <span className="text-sm text-gray-800 flex-1">{p.combination}</span>
                        <span className="text-sm font-bold text-green-600">¥{p.payout_amount.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {autoResults.some((r) => !r.matched) && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-sm text-yellow-700">
                  ⚠️ 一部の馬がDBエントリーと不一致。不一致の馬はスキップされます。
                </div>
              )}

              {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>}

              <div className="flex gap-3">
                <button onClick={() => { setAutoResults(null); setAutoPayouts([]); setAutoError(""); }}
                  className="flex-1 py-3 border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50 transition-colors">← やり直す</button>
                <button onClick={handleAutoConfirm} disabled={loading}
                  className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors">
                  {loading ? "処理中..." : "🏁 この結果で確定する"}</button>
              </div>
            </div>
          )}
        </div>
      )}

      {mode === "manual" && (
        <div className="space-y-4">
          <div className="bg-blue-50 rounded-xl p-4">
            <h3 className="text-sm font-bold text-blue-800 mb-3">🏆 かんたん入力（上位3頭を選択）</h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "🥇 1着", val: first, set: setFirst, dis: [second, third] },
                { label: "🥈 2着", val: second, set: setSecond, dis: [first, third] },
                { label: "🥉 3着", val: third, set: setThird, dis: [first, second] },
              ].map(({ label, val, set, dis }) => (
                <div key={label}>
                  <label className="block text-xs text-blue-600 mb-1 font-medium">{label}</label>
                  <select value={val} onChange={(e) => set(e.target.value)}
                    className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm bg-white">
                    <option value="">選択</option>
                    {entries.map((e) => (
                      <option key={e.id} value={e.id} disabled={dis.includes(e.id)}>{e.post_number} {e.horses?.name}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            <button onClick={handleQuickSet} disabled={!first}
              className="mt-3 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors">
              この着順をセット</button>
          </div>

          {Object.keys(positions).length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-gray-700 mb-2">📋 着順確認</h3>
              <div className="space-y-1.5">
                {entries.filter((e) => positions[e.id]).sort((a, b) => parseInt(positions[a.id] ?? "99") - parseInt(positions[b.id] ?? "99")).map((entry) => (
                  <div key={entry.id} className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2">
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      positions[entry.id] === "1" ? "bg-yellow-400 text-white" : positions[entry.id] === "2" ? "bg-gray-300 text-white" :
                      positions[entry.id] === "3" ? "bg-orange-400 text-white" : "bg-gray-200 text-gray-600"}`}>
                      {positions[entry.id]}</span>
                    <span className="font-medium text-sm">{entry.post_number} {entry.horses?.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>}

          <button onClick={handleManualConfirm} disabled={loading || !Object.values(positions).includes("1")}
            className="w-full py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors disabled:opacity-40">
            {loading ? "処理中..." : "🏁 結果を確定してポイントを計算する"}</button>
        </div>
      )}
    </div>
  );
}
EOF
echo "  ✅ src/components/admin/AdminSettleForm.tsx"

# ============================================================
# 3. AdminRaceList の type に external_id を追加
# ============================================================
echo "━━━ 3. AdminRaceList に external_id 追加 ━━━"

sed -i '' '/type Race = {/,/^};/ {
  /name: string;/a\
\  external_id?: string | null;
}' src/components/admin/AdminRaceList.tsx
echo "  ✅ src/components/admin/AdminRaceList.tsx (型にexternal_id追加)"

# ============================================================
# 4. admin/page.tsx の結果入力タブを実装
# ============================================================
echo "━━━ 4. admin/page.tsx 結果入力タブ実装 ━━━"

# AdminRaceList importがなければ追加
if ! grep -q "AdminRaceList" 'src/app/(main)/admin/page.tsx'; then
  sed -i '' '/import AdminComments/a\
import AdminRaceList from "@/components/admin/AdminRaceList";
' 'src/app/(main)/admin/page.tsx'
fi

# listタブのselectにexternal_idを追加
sed -i '' 's|\.select("id, name, grade, race_date, course_name, race_number, status, head_count")|.select("id, name, external_id, grade, race_date, course_name, race_number, status, head_count")|' 'src/app/(main)/admin/page.tsx'

# 結果入力用のレース取得を追加 (listの後に)
# まずlet racesの後にresultsRacesを追加
sed -i '' '/let races: any\[\] = \[\];/a\
\  let resultsRaces: any[] = [];
' 'src/app/(main)/admin/page.tsx'

# resultsタブ用のデータ取得を追加
cat > /tmp/results_query.txt << 'TMPEOF'

  // 結果入力タブ用（投票受付中のレースを取得）
  if (currentTab === "results") {
    const { data } = await supabase
      .from("races")
      .select("id, name, external_id, grade, race_date, course_name, race_number, status, head_count, race_entries(id, post_number, horses(name))")
      .in("status", ["voting_open", "voting_closed"])
      .order("race_date", { ascending: false })
      .order("race_number")
      .limit(50);
    resultsRaces = data ?? [];
  }
TMPEOF

# racesの取得ブロック直後に挿入
if ! grep -q "resultsRaces = data" 'src/app/(main)/admin/page.tsx'; then
  sed -i '' '/races = data ?? \[\];/r /tmp/results_query.txt' 'src/app/(main)/admin/page.tsx'
fi

# 結果入力タブのプレースホルダーを実際のUIに置換
sed -i '' '/{currentTab === "results" && (/,/)}/c\
\        {currentTab === "results" \&\& (\
          resultsRaces.length > 0 ? (\
            <AdminRaceList races={resultsRaces} type="pending" />\
          ) : (\
            <div className="text-center py-12 text-gray-400">\
              <p className="text-4xl mb-3">🏁</p>\
              <p>結果入力待ちのレースはありません</p>\
              <p className="text-xs mt-1">ステータスが「投票受付中」のレースがここに表示されます</p>\
            </div>\
          )\
        )}' 'src/app/(main)/admin/page.tsx'

echo "  ✅ src/app/(main)/admin/page.tsx (結果入力タブ実装)"

rm -f /tmp/results_query.txt

echo ""
echo "=================================================="
echo "🏁 レース結果自動取得 セットアップ完了!"
echo "=================================================="
echo ""
echo "📋 次のステップ:"
echo "  1. npm run build"
echo "  2. エラーがあれば貼ってください"
echo "  3. ビルド成功後:"
echo "     git add -A && git commit -m 'feat: レース結果自動取得（netkeiba→ワンクリック承認）' && git push"
echo ""
echo "📝 使い方:"
echo "  管理画面 → 🏁結果入力 → レース選択 → 🤖自動取得 → 確認 → 🏁確定"
