"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { getRank, RANKS } from "@/lib/constants/ranks";

type Race = {
  id: string;
  name: string;
  grade: string | null;
  course_name: string;
  race_date: string;
};

type Stats = {
  races: number;
  horses: number;
  votes: number;
};

type HeroImage = {
  url: string | null;
  alt: string;
} | null;

type Props = {
  openRaces: Race[];
  stats: Stats;
  heroImage?: HeroImage;
};

export default function LandingPage({ openRaces, stats, heroImage }: Props) {
  const gradeRaces = openRaces.filter((r) => r.grade);

  return (
    <div className="space-y-8 pb-24">
      {/* ====== ヒーロー ====== */}
      <HeroSection heroImage={heroImage} />

      {/* ====== 3ステップ ====== */}
      <StepsSection />

      {/* ====== 特徴 ====== */}
      <FeaturesSection />

      {/* ====== 画面イメージ ====== */}
      <ScreenshotSection />

      {/* ====== ポイントシステム ====== */}
      <PointSystemSection />

      {/* ====== ランク＆バッジ ====== */}
      <RankBadgeSection />

      {/* ====== 実績数字 ====== */}
      <StatsSection stats={stats} />

      {/* ====== 公式予想家募集 ====== */}
      <OfficialRecruiterSection />

      {/* ====== 月間大会＆景品 ====== */}
      <ContestSection />

      {/* ====== 今週の重賞 ====== */}
      {gradeRaces.length > 0 && <GradeRacesSection races={gradeRaces} />}

      {/* ====== FAQ ====== */}
      <FAQSection />

      {/* ====== 最終CTA ====== */}
      <FinalCTASection />

      {/* ====== 追従フッター ====== */}
      <StickyFooter />
    </div>
  );
}

// ====== ヒーローセクション ======
function HeroSection({ heroImage }: { heroImage?: HeroImage }) {
  const hasImage = heroImage?.url;
  
  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-green-600 via-green-500 to-emerald-600 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800">
      {/* カスタム背景画像 */}
      {hasImage && (
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImage.url})` }}
        >
          <div className="absolute inset-0 bg-black/40" />
        </div>
      )}
      {/* デフォルトパターン（画像がない場合） */}
      {!hasImage && (
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
      )}
      <div className="relative px-6 py-16 text-center text-white">
        <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-4 py-1.5 mb-6">
          <span className="text-yellow-300 text-sm">🎉</span>
          <span className="text-sm font-medium">β版公開中！</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-black mb-4 leading-tight">
          競馬予想で<br />
          <span className="text-yellow-300">腕試し！</span>
        </h1>
        <p className="text-green-100 dark:text-slate-300 text-base sm:text-lg mb-8 max-w-md mx-auto leading-relaxed">
          本命・対抗・危険馬を予想してポイントを稼ごう。<br />
          月間ランキング上位者には<span className="font-bold text-yellow-300">Amazonギフト券</span>をプレゼント！
        </p>
        <Link
          href="/login"
          className="inline-block bg-white text-green-700 dark:text-slate-900 font-black text-lg px-10 py-4 rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition-all"
        >
          無料で始める →
        </Link>
        <p className="text-green-200 dark:text-slate-400 text-xs mt-4">
          Google・Xアカウントで30秒で登録完了
        </p>
      </div>
    </section>
  );
}

// ====== 3ステップセクション ======
function StepsSection() {
  const steps = [
    { num: "1", icon: "🎯", title: "予想する", desc: "本命・対抗・危険馬を選んで投票" },
    { num: "2", icon: "🏇", title: "結果を見る", desc: "レース後に自動でポイント計算" },
    { num: "3", icon: "🏆", title: "ランキング", desc: "月間ランキングで景品をゲット" },
  ];

  return (
    <section>
      <h2 className="text-xl font-black text-gray-900 dark:text-white text-center mb-6">
        🚀 3ステップで簡単スタート
      </h2>
      <div className="flex flex-col sm:flex-row gap-4">
        {steps.map((step, i) => (
          <div key={step.num} className="flex-1 relative">
            <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-5 text-center h-full">
              <div className="w-8 h-8 bg-green-600 dark:bg-amber-500 text-white rounded-full flex items-center justify-center text-sm font-black mx-auto mb-3">
                {step.num}
              </div>
              <div className="text-3xl mb-2">{step.icon}</div>
              <h3 className="font-bold text-gray-800 dark:text-white mb-1">{step.title}</h3>
              <p className="text-xs text-gray-500 dark:text-slate-400">{step.desc}</p>
            </div>
            {i < steps.length - 1 && (
              <div className="hidden sm:block absolute top-1/2 -right-2 transform -translate-y-1/2 text-gray-300 dark:text-slate-600 text-xl">
                →
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

// ====== 特徴セクション ======
function FeaturesSection() {
  const features = [
    { icon: "🎯", title: "シンプルな予想", desc: "本命◎、対抗○、危険馬⚠️を選ぶだけ。馬券を買わなくてもOK！", color: "bg-red-50 dark:bg-red-500/10" },
    { icon: "👥", title: "SNS機能", desc: "予想家をフォローしてタイムラインをチェック。いいね＆コメントで交流！", color: "bg-blue-50 dark:bg-blue-500/10" },
    { icon: "📊", title: "成績管理", desc: "的中率・回収率を自動計算。自分の予想傾向を分析できます。", color: "bg-green-50 dark:bg-green-500/10" },
    { icon: "🎁", title: "毎月景品", desc: "ランキング上位者にAmazonギフト券をプレゼント！", color: "bg-yellow-50 dark:bg-yellow-500/10" },
  ];

  return (
    <section>
      <h2 className="text-xl font-black text-gray-900 dark:text-white text-center mb-6">
        ✨ Gate In! の特徴
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {features.map((f) => (
          <div key={f.title} className={`${f.color} rounded-2xl p-5 border border-gray-100 dark:border-slate-700`}>
            <div className="flex items-start gap-4">
              <div className="text-3xl">{f.icon}</div>
              <div>
                <h3 className="font-bold text-gray-800 dark:text-white mb-1">{f.title}</h3>
                <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed">{f.desc}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ====== 画面イメージセクション ======
function ScreenshotSection() {
  return (
    <section>
      <h2 className="text-xl font-black text-gray-900 dark:text-white text-center mb-6">
        📱 こんな画面で予想できます
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* 予想画面モック */}
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-4 shadow-lg">
          <div className="text-xs font-bold text-gray-500 dark:text-slate-400 mb-2">予想投票画面</div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-500/10 rounded-lg">
              <span className="text-red-600 dark:text-red-400 font-black">◎</span>
              <span className="text-sm text-gray-700 dark:text-slate-300">1 イクイノックス</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-500/10 rounded-lg">
              <span className="text-blue-600 dark:text-blue-400 font-black">○</span>
              <span className="text-sm text-gray-700 dark:text-slate-300">5 リバティアイランド</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-slate-700 rounded-lg">
              <span className="text-gray-600 dark:text-slate-400 font-black">⚠️</span>
              <span className="text-sm text-gray-700 dark:text-slate-300">3 ドウデュース</span>
            </div>
            <button className="w-full py-2 bg-green-600 dark:bg-amber-500 text-white text-sm font-bold rounded-lg mt-2">
              投票する
            </button>
          </div>
        </div>

        {/* タイムラインモック */}
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-4 shadow-lg">
          <div className="text-xs font-bold text-gray-500 dark:text-slate-400 mb-2">タイムライン</div>
          <div className="space-y-3">
            {[
              { name: "田中太郎", badge: true, text: "🎯 的中！東京11R +150P" },
              { name: "山田花子", badge: false, text: "🗳 有馬記念を予想しました" },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="w-8 h-8 bg-green-100 dark:bg-slate-700 rounded-full flex items-center justify-center text-sm">🏇</div>
                <div className="flex-1">
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-bold text-gray-800 dark:text-white">{item.name}</span>
                    {item.badge && <span className="text-blue-500 text-xs">✓</span>}
                  </div>
                  <p className="text-xs text-gray-600 dark:text-slate-400">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ランキングモック */}
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-4 shadow-lg">
          <div className="text-xs font-bold text-gray-500 dark:text-slate-400 mb-2">月間ランキング</div>
          <div className="space-y-2">
            {[
              { rank: "🥇", name: "予想の達人", pts: "12,450P" },
              { rank: "🥈", name: "穴馬ハンター", pts: "10,230P" },
              { rank: "🥉", name: "堅実派", pts: "8,920P" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-slate-700 rounded-lg">
                <span className="text-lg">{item.rank}</span>
                <span className="flex-1 text-sm font-medium text-gray-700 dark:text-slate-300">{item.name}</span>
                <span className="text-xs font-bold text-green-600 dark:text-amber-400">{item.pts}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ====== ポイントシステムセクション ======
function PointSystemSection() {
  return (
    <section className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-6">
      <h2 className="text-xl font-black text-gray-900 dark:text-white text-center mb-6">
        🎯 ポイントシステム
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: "単勝的中（◎1着）", points: "20〜250P", color: "text-red-600 dark:text-red-400", desc: "オッズ連動" },
          { label: "複勝的中（◎3着以内）", points: "10〜60P", color: "text-blue-600 dark:text-blue-400", desc: "オッズ連動" },
          { label: "馬連的中", points: "30〜280P", color: "text-purple-600 dark:text-purple-400", desc: "◎○で1-2着" },
          { label: "ワイド的中", points: "15〜90P", color: "text-green-600 dark:text-green-400", desc: "◎○で3着以内" },
          { label: "三連複的中", points: "20〜300P", color: "text-orange-600 dark:text-orange-400", desc: "◎○△で1-2-3着" },
          { label: "危険馬的中", points: "10〜50P", color: "text-gray-600 dark:text-gray-400", desc: "⚠️が4着以下" },
        ].map((p) => (
          <div key={p.label} className="text-center p-3 bg-gray-50 dark:bg-slate-700 rounded-xl">
            <div className={`text-lg font-black ${p.color}`}>{p.points}</div>
            <div className="text-xs font-bold text-gray-700 dark:text-slate-300 mt-1">{p.label}</div>
            <div className="text-[10px] text-gray-400 dark:text-slate-500">{p.desc}</div>
          </div>
        ))}
      </div>
      <div className="bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/30 rounded-xl p-4 text-center">
        <div className="text-2xl mb-1">🔥</div>
        <div className="text-sm font-bold text-yellow-800 dark:text-yellow-400">人気薄の馬を当てるほど高ポイント！</div>
        <div className="text-xs text-yellow-600 dark:text-yellow-500 mt-1">完全的中で+200Pボーナス</div>
      </div>
    </section>
  );
}

// ====== ランク＆バッジセクション ======
function RankBadgeSection() {
  const ranks = [
    { icon: "🌱", name: "ビギナー", color: "bg-gray-100 dark:bg-slate-700" },
    { icon: "🐴", name: "レギュラー", color: "bg-green-100 dark:bg-green-500/20" },
    { icon: "⭐", name: "エキスパート", color: "bg-blue-100 dark:bg-blue-500/20" },
    { icon: "👑", name: "マスター", color: "bg-yellow-100 dark:bg-yellow-500/20" },
  ];

  const badges = ["🎯", "🔥", "💎", "🏆", "👑", "🌟"];

  return (
    <section>
      <h2 className="text-xl font-black text-gray-900 dark:text-white text-center mb-6">
        📈 ランク＆バッジで成長
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-5">
          <h3 className="font-bold text-gray-800 dark:text-white mb-3">🏅 ランクシステム</h3>
          <p className="text-xs text-gray-500 dark:text-slate-400 mb-3">ポイントを貯めてランクアップ！</p>
          <div className="flex flex-wrap gap-2">
            {ranks.map((r) => (
              <div key={r.name} className={`${r.color} px-3 py-1.5 rounded-full flex items-center gap-1`}>
                <span>{r.icon}</span>
                <span className="text-xs font-bold text-gray-700 dark:text-slate-300">{r.name}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-5">
          <h3 className="font-bold text-gray-800 dark:text-white mb-3">🎖️ バッジコレクション</h3>
          <p className="text-xs text-gray-500 dark:text-slate-400 mb-3">条件を達成してバッジをゲット！</p>
          <div className="flex flex-wrap gap-2">
            {badges.map((b, i) => (
              <div key={i} className="w-10 h-10 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center text-xl">
                {b}
              </div>
            ))}
            <div className="w-10 h-10 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center text-xs text-gray-400">
              +20
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ====== 実績数字セクション ======
function StatsSection({ stats }: { stats: Stats }) {
  return (
    <section className="bg-gradient-to-r from-green-600 to-emerald-600 dark:from-slate-700 dark:to-slate-800 rounded-2xl p-6 text-white">
      <h2 className="text-xl font-black text-center mb-6">📊 サービス実績</h2>
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-3xl font-black">{stats.races.toLocaleString()}+</div>
          <div className="text-xs text-green-200 dark:text-slate-400">対応レース数</div>
        </div>
        <div>
          <div className="text-3xl font-black">{stats.horses.toLocaleString()}+</div>
          <div className="text-xs text-green-200 dark:text-slate-400">登録馬数</div>
        </div>
        <div>
          <div className="text-3xl font-black">{stats.votes.toLocaleString()}+</div>
          <div className="text-xs text-green-200 dark:text-slate-400">投稿された予想</div>
        </div>
      </div>
    </section>
  );
}

// ====== 公式予想家募集セクション ======
function OfficialRecruiterSection() {
  return (
    <section className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-2xl p-6">
      <div className="flex items-start gap-4">
        <div className="text-4xl">✅</div>
        <div className="flex-1">
          <h2 className="text-lg font-black text-gray-900 dark:text-white mb-2">公式予想家を募集中！</h2>
          <p className="text-sm text-gray-600 dark:text-slate-300 mb-4 leading-relaxed">
            競馬の知識を活かして、公式予想家として活動しませんか？<br />
            認証バッジ付きでプロフィールが目立ちます。
          </p>
          <Link
            href="/inquiry"
            className="inline-block bg-blue-600 dark:bg-blue-500 text-white text-sm font-bold px-5 py-2 rounded-full hover:bg-blue-700 transition-colors"
          >
            お問い合わせ →
          </Link>
        </div>
      </div>
    </section>
  );
}

// ====== 月間大会＆景品セクション ======
function ContestSection() {
  return (
    <section className="bg-gradient-to-r from-yellow-400 to-amber-500 dark:from-amber-600 dark:to-orange-600 rounded-2xl p-6 text-center text-white">
      <h2 className="text-xl font-black mb-4">🎁 毎月開催！予想大会</h2>
      <p className="text-sm text-yellow-100 mb-6">月間ポイントランキング上位者に豪華景品！</p>
      <div className="flex justify-center gap-4 mb-4">
        {[
          { medal: "🥇", rank: "1位", prize: "¥10,000" },
          { medal: "🥈", rank: "2位", prize: "¥5,000" },
          { medal: "🥉", rank: "3位", prize: "¥3,000" },
        ].map((p) => (
          <div key={p.rank} className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-3">
            <div className="text-3xl mb-1">{p.medal}</div>
            <div className="text-xs font-medium text-yellow-100">{p.rank}</div>
            <div className="text-sm font-black">Amazon {p.prize}</div>
          </div>
        ))}
      </div>
      <p className="text-xs text-yellow-200">※ 4位〜10位にも参加賞あり</p>
    </section>
  );
}

// ====== 今週の重賞セクション ======
function GradeRacesSection({ races }: { races: Race[] }) {
  const gradeColors: Record<string, string> = {
    G1: "from-yellow-500 to-yellow-600",
    G2: "from-red-500 to-red-600",
    G3: "from-green-500 to-green-600",
  };

  return (
    <section>
      <h2 className="text-xl font-black text-gray-900 dark:text-white text-center mb-6">
        🔥 今週の重賞レース
      </h2>
      <div className="space-y-3">
        {races.slice(0, 5).map((race) => {
          const bg = gradeColors[race.grade ?? ""] ?? "from-gray-500 to-gray-600";
          return (
            <div
              key={race.id}
              className={`bg-gradient-to-r ${bg} rounded-xl p-4 text-white flex items-center justify-between`}
            >
              <div className="flex items-center gap-3">
                <span className="bg-white/25 text-white text-xs font-black px-2 py-1 rounded">
                  {race.grade}
                </span>
                <div>
                  <div className="font-bold">{race.name}</div>
                  <div className="text-xs text-white/80">{race.course_name} • {race.race_date}</div>
                </div>
              </div>
              <Link
                href="/login"
                className="bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-3 py-1.5 rounded-full transition-colors"
              >
                予想する →
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ====== FAQセクション ======
function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    { q: "無料で利用できますか？", a: "はい、完全無料でご利用いただけます。登録も利用も一切料金はかかりません。" },
    { q: "馬券を買わないといけませんか？", a: "いいえ、馬券を買う必要はありません。予想だけで楽しめるサービスです。ポイントは仮想的なもので、現金化はできません。" },
    { q: "どうやってポイントを稼ぐの？", a: "レースで予想を投票し、的中するとポイントがもらえます。人気薄の馬を的中させるほど高ポイント！" },
    { q: "景品はどうやってもらえるの？", a: "月間ポイントランキングの上位に入ると、Amazonギフト券がもらえます。毎月集計してお届けします。" },
    { q: "スマホでも使えますか？", a: "はい、スマートフォン・タブレット・PCすべてに対応しています。アプリのインストールは不要です。" },
    { q: "アカウント登録に必要なものは？", a: "GoogleアカウントまたはXアカウントがあれば、30秒で登録完了です。メールアドレスでの登録も可能です。" },
    { q: "予想を変更・取り消しできますか？", a: "はい、発走2分前まで予想の変更・取り消しが可能です。" },
    { q: "フォロー機能とは何ですか？", a: "気になる予想家をフォローすると、その人の予想がタイムラインに表示されます。参考にしたり、いいね・コメントで交流できます。" },
    { q: "公式予想家になるには？", a: "お問い合わせフォームからご連絡ください。審査の上、認証バッジを付与いたします。" },
    { q: "退会はできますか？", a: "はい、マイページの設定からいつでも退会できます。データは完全に削除されます。" },
  ];

  return (
    <section>
      <h2 className="text-xl font-black text-gray-900 dark:text-white text-center mb-6">
        ❓ よくある質問
      </h2>
      <div className="space-y-2">
        {faqs.map((faq, i) => (
          <div
            key={i}
            className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden"
          >
            <button
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
              className="w-full flex items-center justify-between p-4 text-left"
            >
              <span className="font-bold text-sm text-gray-800 dark:text-white">{faq.q}</span>
              <span className={`text-gray-400 transition-transform ${openIndex === i ? "rotate-180" : ""}`}>
                ▼
              </span>
            </button>
            {openIndex === i && (
              <div className="px-4 pb-4">
                <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed">{faq.a}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

// ====== 最終CTAセクション ======
function FinalCTASection() {
  return (
    <section className="text-center py-8">
      <div className="text-5xl mb-4">🏇</div>
      <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-3">
        さあ、予想を始めよう！
      </h2>
      <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
        登録無料・30秒で完了
      </p>
      <Link
        href="/login"
        className="inline-block bg-green-600 dark:bg-amber-500 text-white font-black text-lg px-12 py-4 rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition-all"
      >
        無料でアカウント作成 →
      </Link>
    </section>
  );
}

// ====== 追従フッター ======
function StickyFooter() {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-700 px-4 py-3 z-50 shadow-lg">
      <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🏇</span>
          <span className="text-sm font-bold text-gray-800 dark:text-white hidden sm:inline">Gate In!</span>
        </div>
        <Link
          href="/login"
          className="flex-1 sm:flex-none bg-green-600 dark:bg-amber-500 text-white text-sm font-bold px-6 py-2.5 rounded-full text-center hover:bg-green-700 dark:hover:bg-amber-600 transition-colors"
        >
          無料で始める →
        </Link>
      </div>
    </div>
  );
}
