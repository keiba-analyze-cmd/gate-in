"use client";

import Link from "next/link";

type Race = {
  id: string;
  name: string;
  grade: string | null;
  course_name: string;
  race_date: string;
};

export default function LandingHero({ openRaces }: { openRaces: Race[] }) {
  const gradeRaces = openRaces.filter((r) => r.grade);

  return (
    <div className="space-y-0">
      {/* ヒーロー */}
      <section className="relative overflow-hidden rounded-2xl" style={{ background: "linear-gradient(135deg, #16a34a 0%, #15803d 50%, #166534 100%)" }}>
        <div className="relative px-6 py-12 text-center text-white">
          <div className="text-6xl mb-4">🏇</div>
          <h1 className="text-3xl sm:text-4xl font-black mb-3 leading-tight">
            みんなの予想で<br />
            <span className="text-yellow-300">腕試し！</span>
          </h1>
          <p className="text-green-100 text-sm sm:text-base mb-6 max-w-md mx-auto leading-relaxed">
            本命・対抗・危険馬を予想してポイントを稼ごう。<br />
            月間ランキング上位者にはAmazonギフト券をプレゼント！
          </p>
          <Link
            href="/login"
            className="inline-block bg-white text-green-700 font-black text-base px-8 py-3.5 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all"
          >
            無料で始める →
          </Link>
        </div>
      </section>

      {/* 特徴 */}
      <section className="py-8">
        <h2 className="text-center text-lg font-black text-gray-800 mb-6">ゲートイン！の特徴</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: "🎯", title: "3つの予想", desc: "本命・対抗・危険馬を予想。的中でポイントゲット！" },
            { icon: "🏆", title: "月間大会", desc: "毎月ランキングを競い合い、上位者には豪華景品！" },
            { icon: "👥", title: "みんなの予想", desc: "フォローした仲間の予想やコメントをタイムラインでチェック。" },
          ].map((f) => (
            <div key={f.title} className="bg-white rounded-xl border border-gray-200 p-5 text-center">
              <div className="text-3xl mb-2">{f.icon}</div>
              <h3 className="font-bold text-gray-800 mb-1">{f.title}</h3>
              <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ポイントシステム */}
      <section className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="text-center text-lg font-black text-gray-800 mb-4">🎯 ポイントシステム</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {[
            { label: "1着的中", points: "50〜500P", color: "text-green-600" },
            { label: "対抗的中（○）", points: "馬連等で加算", color: "text-blue-600" },
            { label: "危険馬的中", points: "10P", color: "text-orange-600" },
            { label: "完全的中", points: "+300Pボーナス", color: "text-yellow-600" },
          ].map((p) => (
            <div key={p.label} className="text-center">
              <div className={`text-lg font-black ${p.color}`}>{p.points}</div>
              <div className="text-xs text-gray-500">{p.label}</div>
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-gray-400">※ 人気薄の馬を的中させるほど高ポイント！</p>
      </section>

      {/* 景品 */}
      <section className="bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-2xl p-6 text-center mt-4">
        <h2 className="text-lg font-black text-white mb-3">🎁 毎月の景品</h2>
        <div className="flex justify-center gap-4">
          {[
            { medal: "🥇", prize: "¥10,000" },
            { medal: "🥈", prize: "¥5,000" },
            { medal: "🥉", prize: "¥3,000" },
          ].map((p) => (
            <div key={p.medal} className="bg-white/30 rounded-xl px-4 py-3">
              <div className="text-2xl">{p.medal}</div>
              <div className="text-sm font-black text-white">Amazon {p.prize}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 今週の重賞 */}
      {gradeRaces.length > 0 && (
        <section className="mt-6">
          <h2 className="text-center text-lg font-black text-gray-800 mb-4">🔥 今週の重賞</h2>
          <div className="space-y-2">
            {gradeRaces.map((race) => (
              <div key={race.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
                <span className="bg-red-600 text-white text-xs font-black px-2 py-1 rounded">
                  {race.grade}
                </span>
                <div className="flex-1">
                  <div className="text-sm font-bold text-gray-800">{race.name}</div>
                  <div className="text-xs text-gray-500">{race.race_date} {race.course_name}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="text-center py-8">
        <Link
          href="/login"
          className="inline-block bg-green-600 text-white font-black text-base px-10 py-4 rounded-full shadow-lg hover:bg-green-700 hover:shadow-xl transition-all"
        >
          🏇 無料でアカウント作成
        </Link>
        <p className="text-xs text-gray-400 mt-3">Google・Xアカウントで簡単ログイン</p>
      </section>
    </div>
  );
}
