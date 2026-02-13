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
          各レースで「1着予想（本命）」「複勝予想（相手）」「危険馬」を選んで投票。
          レース確定後に自動で採点され、ポイントが加算されます。
        </p>
        <div className="bg-green-50 rounded-xl p-4 text-sm text-green-800">
          <strong>投票ルール：</strong>
          <ul className="mt-2 space-y-1 list-disc list-inside">
            <li>1着予想（◎）… 必須、1頭選択</li>
            <li>複勝予想（○）… 任意、最大2頭</li>
            <li>危険馬（△）… 任意、最大1頭</li>
            <li>締切：発走2分前まで</li>
          </ul>
        </div>
      </Section>

      {/* ポイント計算 */}
      <Section title="💰 ポイント計算">
        <h3 className="text-sm font-bold text-gray-700 mb-2">◎ 1着的中（人気別）</h3>
        <p className="text-xs text-gray-500 mb-2">大穴を的中させるほど高ポイント！</p>
        <Table
          headers={["条件", "獲得ポイント"]}
          rows={[
            ["1番人気", "+30P"],
            ["2〜3番人気", "+50P"],
            ["4〜5番人気", "+80P"],
            ["6〜7番人気", "+120P"],
            ["8〜9番人気", "+200P"],
            ["10番人気〜", "+300P"],
          ]}
        />

        <h3 className="text-sm font-bold text-gray-700 mt-4 mb-2">○ 複勝的中</h3>
        <Table
          headers={["条件", "獲得ポイント"]}
          rows={[
            ["3着以内に入った場合（1頭あたり）", "+20P"],
          ]}
        />

        <h3 className="text-sm font-bold text-gray-700 mt-4 mb-2">△ 危険馬的中（人気別）</h3>
        <p className="text-xs text-gray-500 mb-2">人気馬を危険視して着外なら高評価！</p>
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

        <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm">
          <strong className="text-yellow-800">⚡ ボーナスポイント</strong>
          <div className="mt-2 space-y-1.5 text-yellow-700">
            <div className="flex justify-between">
              <span>💎 完全的中（◎○△すべて的中）</span><span className="font-bold">+200P</span>
            </div>
            <div className="flex justify-between">
              <span>🔥 3連続的中ボーナス</span><span className="font-bold">+50P</span>
            </div>
          </div>
        </div>

        <div className="mt-3 bg-gray-50 rounded-xl p-4 text-sm text-gray-600">
          <strong>計算例：</strong>G1レースで5番人気を◎にして1着的中した場合
          <div className="mt-2 text-gray-800">
            1着的中（5番人気）<span className="text-green-600 font-bold ml-1">+80P</span> ＋ G1ボーナス <span className="text-green-600 font-bold">+30P</span> ＝ <span className="text-green-700 font-bold">110P</span>
          </div>
        </div>
      </Section>

      {/* 危険馬の説明 */}
      <Section title="△ 危険馬とは？">
        <p className="text-sm text-gray-600 mb-3">
          「人気はあるが着外になりそうな馬」を指名する、ゲートイン！独自のシステムです。
          指名した馬が4着以下（着外）になった場合にポイントを獲得できます。
        </p>
        <div className="bg-orange-50 rounded-xl p-4 text-sm text-orange-800">
          <strong>ポイント：</strong>人気が高い馬ほど着外時のポイントが高くなります。
          1番人気を危険視して的中すれば+50P！逆に、人気薄の馬を危険視してもポイントは少なめです。
          「この馬は過大評価されている」という目利き力が試されます。
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
          <FAQ q="完全的中とは？" a="1着予想・複勝予想・危険馬の全てが的中した場合に達成です。+200Pのボーナスが付きます。" />
          <FAQ q="グレードボーナスはいつ加算されますか？" a="G1〜OPレースで◎○△のいずれかが的中するたびに、各的中ポイントにグレード分が上乗せされます。" />
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
