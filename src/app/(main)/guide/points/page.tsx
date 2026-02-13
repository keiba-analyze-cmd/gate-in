export const revalidate = 3600;

import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ポイントシステム | ゲートイン！",
  description: "ゲートイン！のポイント計算ルール、ランクシステム、バッジの獲得条件を解説します。",
};

export default function PointsGuidePage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-sm text-gray-400">
        <Link href="/" className="hover:text-green-600">TOP</Link>
        <span className="mx-2">›</span>
        <span className="text-gray-600">ポイントシステム</span>
      </div>

      <h1 className="text-2xl font-bold text-gray-800">🎯 ポイントシステム</h1>

      {/* 基本ルール */}
      <Section title="📋 基本ルール" icon="📋">
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
      <Section title="💰 ポイント計算" icon="💰">
        <Table
          headers={["条件", "獲得ポイント"]}
          rows={[
            ["◎ 1着的中（1番人気）", "+50P"],
            ["◎ 1着的中（2〜3番人気）", "+100P"],
            ["◎ 1着的中（4〜6番人気）", "+200P"],
            ["◎ 1着的中（7〜9番人気）", "+350P"],
            ["◎ 1着的中（10番人気〜）", "+500P"],
            ["○ 複勝的中（1頭あたり）", "+30P"],
            ["△ 危険馬的中（着外）", "+10P"],
          ]}
        />
        <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm">
          <strong className="text-yellow-800">⚡ ボーナスポイント</strong>
          <div className="mt-2 space-y-1.5 text-yellow-700">
            <div className="flex justify-between">
              <span>💎 完全的中（全て的中）</span><span className="font-bold">+300P</span>
            </div>
            <div className="flex justify-between">
              <span>🔥 3連続的中ボーナス</span><span className="font-bold">+50P</span>
            </div>
            <div className="flex justify-between">
              <span>🏅 G1レースボーナス</span><span className="font-bold">+100P</span>
            </div>
          </div>
        </div>
      </Section>

      {/* 危険馬の説明 */}
      <Section title="△ 危険馬とは？" icon="△">
        <p className="text-sm text-gray-600">
          「人気はあるが着外になりそうな馬」を指名します。
          指名した馬が4着以下（着外）になった場合に+10Pを獲得できます。
          穴党の方には特に有効な戦略です。
        </p>
      </Section>

      {/* ランクシステム */}
      <Section title="👑 ランクシステム" icon="👑">
        <p className="text-sm text-gray-600 mb-3">
          累計ポイントに応じてランクが上がります。ランクは一度上がると下がりません。
        </p>
        <Table
          headers={["ランク", "必要ポイント"]}
          rows={[
            ["🔰 ビギナー Ⅰ〜Ⅴ", "0 〜 350P"],
            ["⭐ 予想士 Ⅰ〜Ⅴ", "500 〜 2,500P"],
            ["⭐⭐ 上級予想士 Ⅰ〜Ⅴ", "3,000 〜 12,000P"],
            ["👑 予想マスター Ⅰ〜Ⅴ", "15,000 〜 80,000P"],
            ["🏆 レジェンド", "100,000P"],
          ]}
        />
      </Section>

      {/* 月間大会 */}
      <Section title="🎪 月間大会" icon="🎪">
        <p className="text-sm text-gray-600 mb-3">
          毎月1日〜末日で月間ポイントを競います。月初にポイントはリセットされ、
          全員が同じスタートラインから競い合います。
        </p>
        <div className="bg-purple-50 rounded-xl p-4 text-sm text-purple-800">
          <strong>月間ランキング報酬（予定）</strong>
          <div className="mt-2 space-y-1">
            <div>🥇 1位：特別バッジ + ボーナスポイント</div>
            <div>🥈 2位：特別バッジ</div>
            <div>🥉 3位：特別バッジ</div>
          </div>
        </div>
      </Section>

      {/* バッジ */}
      <Section title="🏅 バッジ" icon="🏅">
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
      <Section title="❓ よくある質問" icon="❓">
        <div className="space-y-4">
          <FAQ q="ポイントは減ることはありますか？" a="いいえ。ハズレてもポイントは減りません。累計ポイントは増え続けます。" />
          <FAQ q="投票を変更できますか？" a="発走2分前まで変更・取り消しが可能です。" />
          <FAQ q="月間ポイントと累計ポイントの違いは？" a="月間ポイントは毎月1日にリセットされ、月間ランキングに使用されます。累計ポイントはリセットされず、ランクの計算に使用されます。" />
          <FAQ q="完全的中とは？" a="1着予想・複勝予想・危険馬の全てが的中した場合に達成です。+300Pのボーナスが付きます。" />
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; icon: string; children: React.ReactNode }) {
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
