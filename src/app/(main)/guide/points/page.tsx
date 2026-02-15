export const revalidate = 3600;

import Link from "next/link";
import BackLink from "@/components/ui/BackLink";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ポイントシステム | ゲートイン！",
  description: "ゲートイン！のポイント計算ルール、ランクシステム、バッジの獲得条件を解説します。",
};

export default function PointsGuidePage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <BackLink href="/" label="トップ" />

      <h1 className="text-2xl font-bold text-gray-800">🎯 ポイントシステム</h1>

      {/* 基本ルール */}
      <Section title="📋 基本ルール">
        <p className="text-sm text-gray-600 mb-3">
          各レースで「1着予想（本命）」「複勝予想（相手）」「抑え」「危険馬」を選んで投票。
          レース確定後に自動で採点され、ポイントが加算されます。
        </p>
        <div className="bg-green-50 rounded-xl p-4 text-sm text-green-800">
          <strong>投票ルール：</strong>
          <ul className="mt-2 space-y-1 list-disc list-inside">
            <li>◎ 1着予想（本命）… 必須、1頭選択</li>
            <li>○ 複勝予想（相手）… 任意、最大2頭</li>
            <li>△ 抑え … 任意、最大5頭</li>
            <li>⚠️ 危険馬 … 任意、最大1頭</li>
            <li>締切：発走2分前まで</li>
          </ul>
        </div>
      </Section>

      {/* ポイント計算 */}
      <Section title="💰 ポイント計算（オッズ連動）">
        <p className="text-xs text-gray-500 mb-4">
          すべてのポイントは実際のオッズに連動！高配当を当てるほど高ポイント獲得！
        </p>

        <h3 className="text-sm font-bold text-gray-700 mb-2">◎ 単勝的中（1着予想）</h3>
        <Table
          headers={["オッズ", "獲得ポイント"]}
          rows={[
            ["〜1.9倍", "+20P"],
            ["2.0〜3.9倍", "+40P"],
            ["4.0〜6.9倍", "+60P"],
            ["7.0〜14.9倍", "+100P"],
            ["15.0〜29.9倍", "+150P"],
            ["30.0倍〜", "+250P"],
          ]}
        />

        <h3 className="text-sm font-bold text-gray-700 mt-4 mb-2">○ 複勝的中（3着以内）</h3>
        <Table
          headers={["オッズ", "獲得ポイント"]}
          rows={[
            ["〜1.4倍", "+10P"],
            ["1.5〜2.4倍", "+15P"],
            ["2.5〜3.9倍", "+25P"],
            ["4.0〜6.9倍", "+40P"],
            ["7.0倍〜", "+60P"],
          ]}
        />

        <h3 className="text-sm font-bold text-gray-700 mt-4 mb-2">🎫 馬連的中（◎○が1-2着）</h3>
        <p className="text-xs text-gray-500 mb-2">◎と○が1着・2着（順不同）で的中</p>
        <Table
          headers={["オッズ", "獲得ポイント"]}
          rows={[
            ["〜9.9倍", "+30P"],
            ["10〜29.9倍", "+50P"],
            ["30〜59.9倍", "+80P"],
            ["60〜99.9倍", "+120P"],
            ["100〜299.9倍", "+180P"],
            ["300倍〜", "+280P"],
          ]}
        />

        <h3 className="text-sm font-bold text-gray-700 mt-4 mb-2">🎟️ ワイド的中（◎○が3着以内）</h3>
        <p className="text-xs text-gray-500 mb-2">◎と○が両方とも3着以内で的中（複数組み合わせ可）</p>
        <Table
          headers={["オッズ", "獲得ポイント"]}
          rows={[
            ["〜2.9倍", "+15P"],
            ["3〜5.9倍", "+25P"],
            ["6〜9.9倍", "+40P"],
            ["10〜19.9倍", "+60P"],
            ["20倍〜", "+90P"],
          ]}
        />

        <h3 className="text-sm font-bold text-gray-700 mt-4 mb-2">🎰 三連複的中</h3>
        <p className="text-xs text-gray-500 mb-2">◎○○、◎○△、◎△△が1-2-3着（順不同）で的中</p>
        <Table
          headers={["オッズ", "獲得ポイント"]}
          rows={[
            ["〜9.9倍", "+20P"],
            ["10〜49.9倍", "+50P"],
            ["50〜99.9倍", "+80P"],
            ["100〜299.9倍", "+120P"],
            ["300〜999.9倍", "+180P"],
            ["1000倍〜", "+300P"],
          ]}
        />

        <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm">
          <strong className="text-yellow-800">△ 抑えと倍率</strong>
          <p className="text-xs text-yellow-700 mt-1 mb-2">
            △（抑え）を使うと三連複の当たりやすさは上がりますが、ポイントに倍率がかかります
          </p>
          <div className="space-y-1 text-yellow-700 text-xs">
            <div className="flex justify-between"><span>△ 1頭</span><span>×1.0（そのまま）</span></div>
            <div className="flex justify-between"><span>△ 2頭</span><span>×0.8</span></div>
            <div className="flex justify-between"><span>△ 3頭</span><span>×0.6</span></div>
            <div className="flex justify-between"><span>△ 4頭</span><span>×0.4</span></div>
            <div className="flex justify-between"><span>△ 5頭</span><span>×0.2</span></div>
          </div>
          <p className="text-xs text-yellow-600 mt-2">
            ※ 馬連・ワイドは◎○のみで判定（△は対象外）
          </p>
        </div>

        <h3 className="text-sm font-bold text-gray-700 mt-4 mb-2">⚠️ 危険馬的中（人気別）</h3>
        <p className="text-xs text-gray-500 mb-2">人気馬を危険視して着外（4着以下）なら高評価！</p>
        <Table
          headers={["危険視した馬の人気", "獲得ポイント"]}
          rows={[
            ["1番人気", "+50P"],
            ["2番人気", "+40P"],
            ["3番人気", "+30P"],
            ["4番人気", "+20P"],
            ["5番人気", "+15P"],
            ["6番人気〜", "+10P"],
          ]}
        />

        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm">
          <strong className="text-blue-800">🏟️ グレード別ボーナス</strong>
          <p className="text-xs text-blue-600 mt-1 mb-2">重賞レースでは各的中にボーナスが加算されます</p>
          <div className="space-y-1.5 text-blue-700">
            <div className="flex justify-between"><span>G1 レース</span><span className="font-bold">各的中 +30P</span></div>
            <div className="flex justify-between"><span>G2 レース</span><span className="font-bold">各的中 +15P</span></div>
            <div className="flex justify-between"><span>G3 レース</span><span className="font-bold">各的中 +10P</span></div>
            <div className="flex justify-between"><span>OP・リステッド</span><span className="font-bold">各的中 +5P</span></div>
            <div className="flex justify-between"><span>平場</span><span className="text-gray-400">+0P</span></div>
          </div>
        </div>

        <div className="mt-3 bg-purple-50 border border-purple-200 rounded-xl p-4 text-sm">
          <strong className="text-purple-800">⚡ ボーナスポイント</strong>
          <div className="mt-2 space-y-1.5 text-purple-700">
            <div className="flex justify-between">
              <span>💎 完全的中（◎○⚠️すべて的中）</span><span className="font-bold">+200P</span>
            </div>
            <div className="flex justify-between">
              <span>🔥 3連続的中ボーナス</span><span className="font-bold">+50P</span>
            </div>
          </div>
        </div>

        <div className="mt-3 bg-gray-50 rounded-xl p-4 text-sm text-gray-600">
          <strong>計算例：</strong>G2レースで◎（8倍）が1着、○が2着（馬連35倍）
          <div className="mt-2 text-gray-800 space-y-1">
            <div>単勝的中（8倍）<span className="text-green-600 font-bold ml-1">+100P</span> ＋ G2ボーナス <span className="text-green-600 font-bold">+15P</span></div>
            <div>馬連的中（35倍）<span className="text-green-600 font-bold ml-1">+80P</span> ＋ G2ボーナス <span className="text-green-600 font-bold">+15P</span></div>
            <div className="pt-1 border-t border-gray-200">合計 <span className="text-green-700 font-bold">210P</span></div>
          </div>
        </div>
      </Section>

      {/* 印の説明 */}
      <Section title="🏇 印の説明">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <span className="text-lg">◎</span>
            <div>
              <div className="font-bold text-gray-800">本命（1着予想）</div>
              <p className="text-sm text-gray-600">1着になると予想する馬。必須選択。</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-lg">○</span>
            <div>
              <div className="font-bold text-gray-800">相手（複勝予想）</div>
              <p className="text-sm text-gray-600">3着以内に入ると予想する馬。馬連・ワイド・三連複の判定に使用。</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-lg">△</span>
            <div>
              <div className="font-bold text-gray-800">抑え</div>
              <p className="text-sm text-gray-600">
                押さえておきたい馬。三連複の判定に使用。
                数を増やすと的中しやすくなりますが、倍率でポイントが減ります。
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-lg">⚠️</span>
            <div>
              <div className="font-bold text-gray-800">危険馬</div>
              <p className="text-sm text-gray-600">
                人気はあるが着外になりそうな馬。4着以下でポイント獲得。
                人気馬ほど高ポイント！
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* ランクシステム */}
      <Section title="👑 ランクシステム">
        <p className="text-sm text-gray-600 mb-3">
          累計ポイントに応じてランクが上がります。ランクは一度上がると下がりません。
        </p>
        <Table
          headers={["ランク", "必要ポイント"]}
          rows={[
            ["🔰 ビギナー Ⅰ〜Ⅴ", "0 〜 400P"],
            ["⭐ 予想士 Ⅰ〜Ⅴ", "700 〜 3,000P"],
            ["⭐⭐ 上級予想士 Ⅰ〜Ⅴ", "4,000 〜 13,000P"],
            ["👑 予想マスター Ⅰ〜Ⅴ", "16,500 〜 36,000P"],
            ["🏆 レジェンド", "45,000P"],
          ]}
        />
        <p className="text-xs text-gray-500 mt-2">
          ※ 目安：週10レース投票の上級者で月3,000〜4,000P → レジェンド到達まで約9〜12ヶ月
        </p>
      </Section>

      {/* 月間大会 */}
      <Section title="🎪 月間大会">
        <p className="text-sm text-gray-600 mb-3">
          毎月1日〜末日で月間ポイントを競います。月初にポイントはリセットされ、
          全員が同じスタートラインから競い合います。
        </p>
        <div className="bg-purple-50 rounded-xl p-4 text-sm text-purple-800">
          <strong>月間ランキング報酬（近日開催予定）</strong>
          <div className="mt-2 space-y-1">
            <div>🥇 1位：Amazonギフト券 ¥10,000</div>
            <div>🥈 2位：Amazonギフト券 ¥5,000</div>
            <div>🥉 3位：Amazonギフト券 ¥3,000</div>
          </div>
        </div>
      </Section>

      {/* バッジ */}
      <Section title="🏅 バッジ">
        <p className="text-sm text-gray-600 mb-3">
          特定の条件を達成するとバッジを獲得できます。
          バッジはプロフィールに表示され、実力の証明になります。
        </p>
        <Link
          href="/mypage/badges"
          className="inline-block bg-green-100 text-green-700 text-sm font-bold px-4 py-2 rounded-lg hover:bg-green-200 transition-colors"
        >
          🏅 バッジ一覧を見る →
        </Link>
      </Section>

      {/* FAQ */}
      <Section title="❓ よくある質問">
        <div className="space-y-4">
          <FAQ q="ポイントは減ることはありますか？" a="いいえ。ハズレてもポイントは減りません。累計ポイントは増え続けます。" />
          <FAQ q="投票を変更できますか？" a="発走2分前まで変更・取り消しが可能です。" />
          <FAQ q="月間ポイントと累計ポイントの違いは？" a="月間ポイントは毎月1日にリセットされ、月間ランキングに使用されます。累計ポイントはリセットされず、ランクの計算に使用されます。" />
          <FAQ q="完全的中とは？" a="1着予想（◎）・複勝予想（○）・危険馬（⚠️）の全てが的中した場合に達成です。+200Pのボーナスが付きます。" />
          <FAQ q="△（抑え）を増やすとどうなりますか？" a="三連複が当たりやすくなりますが、獲得ポイントに倍率（0.2〜1.0）がかかります。絞るほど高リターン、広げるほど安定だが低リターンです。" />
          <FAQ q="馬連・ワイドに△は使えますか？" a="いいえ。馬連・ワイドは◎と○の組み合わせのみで判定されます。△は三連複のみに影響します。" />
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <h2 className="text-lg font-bold text-gray-800 mb-3">{title}</h2>
      {children}
    </div>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            {headers.map((h, i) => (
              <th key={i} className="text-left py-2 px-3 font-bold text-gray-700">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-gray-50 last:border-0">
              {row.map((cell, j) => (
                <td key={j} className={`py-2.5 px-3 ${j === row.length - 1 ? "font-bold text-green-600 text-right" : "text-gray-700"}`}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FAQ({ q, a }: { q: string; a: string }) {
  return (
    <div>
      <div className="font-bold text-sm text-gray-800 mb-1">Q. {q}</div>
      <div className="text-sm text-gray-600 pl-4">A. {a}</div>
    </div>
  );
}
