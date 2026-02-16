import React, { useState } from 'react';

// Gate-In! テーマ設定
const themes = {
  light: {
    bgBase: 'bg-gray-50',
    bgCard: 'bg-white',
    textPrimary: 'text-gray-900',
    textSecondary: 'text-gray-700',
    textMuted: 'text-gray-500',
    textAccent: 'text-green-600',
    border: 'border-gray-100',
    borderStrong: 'border-gray-200',
    btnPrimary: 'bg-green-600 text-white hover:bg-green-700',
    btnSecondary: 'bg-green-50 text-green-600 hover:bg-green-100',
    btnGhost: 'text-gray-600 hover:bg-gray-100',
    navBg: 'bg-white border-gray-200',
    navActive: 'text-green-600',
    navInactive: 'text-gray-400',
    tagBg: 'bg-gray-100 text-gray-700',
    cardHover: 'hover:shadow-md',
  },
  dark: {
    bgBase: 'bg-slate-950',
    bgCard: 'bg-slate-900',
    textPrimary: 'text-slate-100',
    textSecondary: 'text-slate-300',
    textMuted: 'text-slate-500',
    textAccent: 'text-amber-400',
    border: 'border-slate-800',
    borderStrong: 'border-slate-700',
    btnPrimary: 'bg-amber-500 text-slate-900 hover:bg-amber-400',
    btnSecondary: 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20',
    btnGhost: 'text-slate-400 hover:bg-slate-800',
    navBg: 'bg-slate-900 border-slate-800',
    navActive: 'text-amber-400',
    navInactive: 'text-slate-500',
    tagBg: 'bg-slate-800 text-slate-300',
    cardHover: 'hover:bg-slate-800/50',
  },
};

const PAGES = [
  { id: 'list', label: '📚 一覧' },
  { id: 'category-list', label: '🏷️ カテゴリ' },
  { id: 'detail-top', label: '📖 詳細(上)' },
  { id: 'detail-mid', label: '📖 詳細(中)' },
  { id: 'detail-bottom', label: '📖 詳細(下)' },
  { id: 'search', label: '🔍 検索' },
];

export default function ArticleWireframe() {
  const [isDark, setIsDark] = useState(false);
  const [activePage, setActivePage] = useState('list');
  const t = isDark ? themes.dark : themes.light;

  return (
    <div className={`min-h-screen ${t.bgBase}`}>
      {/* ページセレクター */}
      <div className={`sticky top-0 z-50 ${t.bgCard} ${t.border} border-b shadow-sm`}>
        <div className="flex items-center justify-between p-2 px-3">
          <h1 className={`text-sm font-bold ${t.textPrimary}`}>📖 記事・コラム ワイヤーフレーム</h1>
          <button
            onClick={() => setIsDark(!isDark)}
            className={`px-3 py-1 rounded-full text-xs font-bold ${t.btnSecondary}`}
          >
            {isDark ? '🌙 Dark' : '☀️ Light'}
          </button>
        </div>
        <div className="flex gap-1 px-2 pb-2 overflow-x-auto">
          {PAGES.map((page) => (
            <button
              key={page.id}
              onClick={() => setActivePage(page.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                activePage === page.id ? t.btnPrimary : t.btnSecondary
              }`}
            >
              {page.label}
            </button>
          ))}
        </div>
      </div>

      {/* ページコンテンツ */}
      <div className="max-w-md mx-auto pb-24">
        {activePage === 'list' && <ArticleListPage t={t} isDark={isDark} />}
        {activePage === 'category-list' && <CategoryListPage t={t} isDark={isDark} />}
        {activePage === 'detail-top' && <ArticleDetailTopPage t={t} isDark={isDark} />}
        {activePage === 'detail-mid' && <ArticleDetailMidPage t={t} isDark={isDark} />}
        {activePage === 'detail-bottom' && <ArticleDetailBottomPage t={t} isDark={isDark} />}
        {activePage === 'search' && <SearchPage t={t} isDark={isDark} />}
      </div>

      {/* ボトムナビ */}
      <nav className={`fixed bottom-0 left-0 right-0 ${t.navBg} border-t shadow-lg z-40`}>
        <div className="max-w-md mx-auto flex items-center justify-around py-2 safe-area-pb">
          {[
            { icon: '🏠', label: 'TOP', active: false },
            { icon: '🏁', label: 'レース', active: false },
            { icon: '📖', label: 'コラム', active: true },
            { icon: '🎯', label: 'クイズ', active: false },
            { icon: '👤', label: 'マイページ', active: false },
          ].map((item, i) => (
            <button
              key={i}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors ${
                item.active ? t.navActive : t.navInactive
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

// ========================================
// 1. 記事一覧ページ
// ========================================
function ArticleListPage({ t, isDark }) {
  const [activeTab, setActiveTab] = useState('new');
  const [activeCategory, setActiveCategory] = useState('all');

  const categories = [
    { id: 'all', icon: '📚', name: 'すべて' },
    { id: 'blood', icon: '🧬', name: '血統' },
    { id: 'course', icon: '🏟️', name: 'コース' },
    { id: 'jockey', icon: '👨‍✈️', name: '騎手' },
    { id: 'prediction', icon: '📊', name: '予想術' },
    { id: 'legend', icon: '🏆', name: '名馬' },
    { id: 'data', icon: '📈', name: 'データ' },
  ];

  const featuredArticle = {
    title: 'ディープインパクト産駒の特徴と狙い方【完全版】',
    category: { icon: '🧬', name: '血統' },
    date: '2024.02.15',
    views: 2543,
    readTime: 8,
    hasQuiz: true,
  };

  const articles = [
    {
      id: 1,
      title: '東京芝2400m完全攻略ガイド',
      category: { icon: '🏟️', name: 'コース' },
      date: '2024.02.14',
      views: 1892,
      readTime: 6,
      hasQuiz: true,
      isPremium: false,
    },
    {
      id: 2,
      title: '【保存版】騎手の得意コース一覧2024',
      category: { icon: '👨‍✈️', name: '騎手' },
      date: '2024.02.13',
      views: 3156,
      readTime: 10,
      hasQuiz: false,
      isPremium: true,
    },
    {
      id: 3,
      title: '差し馬の見極め方 - 展開予想の基本',
      category: { icon: '📊', name: '予想術' },
      date: '2024.02.12',
      views: 956,
      readTime: 5,
      hasQuiz: true,
      isPremium: false,
    },
    {
      id: 4,
      title: '伝説の三冠馬たち - その系譜を辿る',
      category: { icon: '🏆', name: '名馬' },
      date: '2024.02.11',
      views: 1743,
      readTime: 12,
      hasQuiz: true,
      isPremium: false,
    },
    {
      id: 5,
      title: 'キタサンブラック産駒の狙い目',
      category: { icon: '🧬', name: '血統' },
      date: '2024.02.10',
      views: 1234,
      readTime: 7,
      hasQuiz: false,
      isPremium: false,
    },
  ];

  return (
    <div className="pb-4">
      {/* ヘッダー */}
      <div className={`${t.bgCard} p-4 ${t.border} border-b`}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className={`text-xl font-bold ${t.textPrimary}`}>📖 馬券力向上コラム</h1>
            <p className={`text-xs mt-1 ${t.textMuted}`}>データと知識で馬券力を鍛えよう</p>
          </div>
          <button className={`p-2 rounded-lg ${t.btnGhost}`}>
            <span className="text-xl">🔍</span>
          </button>
        </div>
      </div>

      {/* カテゴリ横スクロール */}
      <div className={`${t.bgCard} px-4 py-3 ${t.border} border-b`}>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                activeCategory === cat.id
                  ? t.btnPrimary
                  : t.btnSecondary
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* タブ */}
      <div className={`${t.bgCard} flex ${t.border} border-b`}>
        {[
          { id: 'new', label: '🆕 新着', count: null },
          { id: 'popular', label: '🔥 人気', count: null },
          { id: 'quiz', label: '🎯 クイズ付き', count: 12 },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-3 text-sm font-bold relative transition-colors ${
              activeTab === tab.id ? t.textAccent : t.textMuted
            }`}
          >
            <span>{tab.label}</span>
            {tab.count && (
              <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${
                isDark ? 'bg-amber-500/20' : 'bg-green-100'
              }`}>
                {tab.count}
              </span>
            )}
            {activeTab === tab.id && (
              <div className={`absolute bottom-0 left-4 right-4 h-0.5 rounded-full ${
                isDark ? 'bg-amber-400' : 'bg-green-600'
              }`} />
            )}
          </button>
        ))}
      </div>

      {/* 特集記事（大きめカード） */}
      <div className="p-4">
        <div className={`${t.bgCard} rounded-2xl ${t.border} border overflow-hidden shadow-sm ${t.cardHover} transition-all cursor-pointer`}>
          <div className={`h-36 ${isDark ? 'bg-gradient-to-br from-purple-900/60 to-pink-900/60' : 'bg-gradient-to-br from-purple-100 to-pink-100'} flex items-center justify-center relative`}>
            <span className="text-6xl">🧬</span>
            <div className="absolute top-3 left-3 flex gap-1.5">
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${isDark ? 'bg-purple-500/30 text-purple-200' : 'bg-purple-200 text-purple-800'}`}>
                🧬 血統
              </span>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${isDark ? 'bg-amber-500/30 text-amber-200' : 'bg-amber-100 text-amber-800'}`}>
                🎯 クイズ付き
              </span>
            </div>
            <div className={`absolute bottom-3 right-3 text-xs px-2 py-1 rounded-full ${isDark ? 'bg-black/40 text-white' : 'bg-white/80 text-gray-700'}`}>
              ⏱ {featuredArticle.readTime}分
            </div>
          </div>
          <div className="p-4">
            <h2 className={`font-bold text-lg leading-tight ${t.textPrimary}`}>
              {featuredArticle.title}
            </h2>
            <div className={`flex items-center gap-3 mt-3 text-xs ${t.textMuted}`}>
              <span>📅 {featuredArticle.date}</span>
              <span>👁 {featuredArticle.views.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 記事リスト */}
      <div className="px-4 space-y-3">
        {articles.map((article) => (
          <div
            key={article.id}
            className={`${t.bgCard} rounded-xl ${t.border} border p-3 flex gap-3 ${t.cardHover} transition-all cursor-pointer`}
          >
            <div className={`w-20 h-20 rounded-lg ${isDark ? 'bg-slate-800' : 'bg-gray-100'} flex items-center justify-center text-3xl shrink-0`}>
              {article.category.icon}
            </div>
            <div className="flex-1 min-w-0 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${t.tagBg}`}>
                    {article.category.icon} {article.category.name}
                  </span>
                  {article.hasQuiz && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700'}`}>
                      🎯
                    </span>
                  )}
                  {article.isPremium && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-gradient-to-r from-yellow-400 to-yellow-600 text-white">
                      👑 PRO
                    </span>
                  )}
                </div>
                <h3 className={`font-bold text-sm line-clamp-2 ${t.textPrimary}`}>
                  {article.title}
                </h3>
              </div>
              <div className={`flex items-center gap-3 text-xs ${t.textMuted}`}>
                <span>{article.date}</span>
                <span>👁 {article.views.toLocaleString()}</span>
                <span>⏱ {article.readTime}分</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* もっと見る */}
      <div className="px-4 mt-4">
        <button className={`w-full py-3 rounded-xl font-bold ${t.btnSecondary}`}>
          もっと見る →
        </button>
      </div>
    </div>
  );
}

// ========================================
// 2. カテゴリ一覧ページ
// ========================================
function CategoryListPage({ t, isDark }) {
  const categories = [
    { icon: '🧬', name: '血統', desc: '種牡馬の特徴、血統理論', count: 24, gradient: 'from-purple-500 to-pink-500' },
    { icon: '🏟️', name: 'コース攻略', desc: 'コース別の傾向と対策', count: 18, gradient: 'from-blue-500 to-cyan-500' },
    { icon: '👨‍✈️', name: '騎手分析', desc: '騎手の得意・不得意', count: 15, gradient: 'from-green-500 to-emerald-500' },
    { icon: '👔', name: '調教師', desc: '厩舎の特徴と狙い目', count: 12, gradient: 'from-orange-500 to-red-500' },
    { icon: '📊', name: '予想術', desc: 'データ分析・展開予想', count: 21, gradient: 'from-indigo-500 to-purple-500' },
    { icon: '🏆', name: '名馬列伝', desc: '伝説の名馬たち', count: 30, gradient: 'from-yellow-500 to-orange-500' },
    { icon: '📈', name: 'データ分析', desc: '統計で見る傾向', count: 16, gradient: 'from-teal-500 to-green-500' },
    { icon: '🎯', name: '馬券術', desc: '買い方のコツ', count: 9, gradient: 'from-red-500 to-pink-500' },
  ];

  const popularTags = [
    'ディープインパクト', 'キタサンブラック', '東京芝', 'ルメール',
    '三冠馬', 'G1', '重馬場', '逃げ馬', '牝馬', 'ダート', '阪神外回り', '中山'
  ];

  return (
    <div className="p-4 space-y-6">
      {/* ヘッダー */}
      <div>
        <h1 className={`text-xl font-bold ${t.textPrimary}`}>🏷️ カテゴリ一覧</h1>
        <p className={`text-sm mt-1 ${t.textMuted}`}>興味のあるテーマを探そう</p>
      </div>

      {/* カテゴリグリッド */}
      <div className="grid grid-cols-2 gap-3">
        {categories.map((cat) => (
          <div
            key={cat.name}
            className={`${t.bgCard} rounded-xl ${t.border} border p-4 relative overflow-hidden ${t.cardHover} transition-all cursor-pointer`}
          >
            <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${cat.gradient} opacity-10 rounded-bl-full`} />
            <span className="text-4xl">{cat.icon}</span>
            <div className={`font-bold mt-2 ${t.textPrimary}`}>{cat.name}</div>
            <div className={`text-xs mt-1 ${t.textMuted} line-clamp-2`}>{cat.desc}</div>
            <div className={`inline-flex items-center gap-1 mt-2 text-xs ${t.textAccent} font-medium`}>
              <span>{cat.count}記事</span>
              <span>→</span>
            </div>
          </div>
        ))}
      </div>

      {/* 人気タグ */}
      <div className={`${t.bgCard} rounded-2xl ${t.border} border p-4`}>
        <h3 className={`text-sm font-bold mb-3 ${t.textPrimary}`}>🔥 人気タグ</h3>
        <div className="flex flex-wrap gap-2">
          {popularTags.map((tag) => (
            <button
              key={tag}
              className={`text-xs px-3 py-1.5 rounded-full font-medium ${t.tagBg} hover:opacity-80 transition-opacity`}
            >
              #{tag}
            </button>
          ))}
        </div>
      </div>

      {/* 週間ランキング */}
      <div className={`${t.bgCard} rounded-2xl ${t.border} border overflow-hidden`}>
        <div className={`px-4 py-3 ${t.border} border-b flex items-center justify-between`}>
          <h3 className={`text-sm font-bold ${t.textPrimary}`}>📈 週間人気記事</h3>
          <span className={`text-xs ${t.textMuted}`}>もっと見る →</span>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-slate-800">
          {[
            { rank: 1, title: '【保存版】騎手の得意コース一覧2024', views: 3156 },
            { rank: 2, title: 'ディープインパクト産駒の特徴と狙い方', views: 2543 },
            { rank: 3, title: '東京芝2400m完全攻略ガイド', views: 1892 },
          ].map((article) => (
            <div key={article.rank} className={`px-4 py-3 flex items-center gap-3 ${t.cardHover} cursor-pointer`}>
              <span className={`text-lg font-black w-6 ${
                article.rank === 1 ? 'text-yellow-500' :
                article.rank === 2 ? 'text-gray-400' :
                'text-amber-600'
              }`}>
                {article.rank}
              </span>
              <div className="flex-1 min-w-0">
                <div className={`font-medium text-sm truncate ${t.textPrimary}`}>{article.title}</div>
                <div className={`text-xs ${t.textMuted}`}>👁 {article.views.toLocaleString()}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ========================================
// 3. 記事詳細ページ（上部）
// ========================================
function ArticleDetailTopPage({ t, isDark }) {
  return (
    <div className="pb-4">
      {/* ヘッダー（固定） */}
      <div className={`${t.bgCard} ${t.border} border-b sticky top-[88px] z-30`}>
        <div className="flex items-center justify-between px-4 py-3">
          <button className={`flex items-center gap-1 ${t.textMuted}`}>
            <span>←</span>
            <span className="text-sm">戻る</span>
          </button>
          <div className="flex items-center gap-2">
            <button className={`p-2 rounded-lg ${t.btnGhost}`}>🔖</button>
            <button className={`p-2 rounded-lg ${t.btnGhost}`}>↗️</button>
          </div>
        </div>
      </div>

      {/* サムネイル */}
      <div className={`h-52 ${isDark ? 'bg-gradient-to-br from-purple-900/60 to-pink-900/60' : 'bg-gradient-to-br from-purple-100 to-pink-100'} flex items-center justify-center relative`}>
        <span className="text-7xl">🧬</span>
        <div className={`absolute bottom-4 right-4 text-xs px-2 py-1 rounded-full ${isDark ? 'bg-black/40 text-white' : 'bg-white/80 text-gray-700'}`}>
          ⏱ 8分で読めます
        </div>
      </div>

      {/* 記事ヘッダー */}
      <div className={`${t.bgCard} p-4`}>
        {/* カテゴリ・タグ */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${isDark ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-100 text-purple-700'}`}>
            🧬 血統
          </span>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${isDark ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-100 text-amber-700'}`}>
            🎯 クイズ付き
          </span>
        </div>
        
        {/* タイトル */}
        <h1 className={`text-xl font-bold leading-tight ${t.textPrimary}`}>
          ディープインパクト産駒の<br />特徴と狙い方【完全版】
        </h1>
        
        {/* メタ情報 */}
        <div className={`flex items-center gap-4 mt-4 text-sm ${t.textMuted}`}>
          <span className="flex items-center gap-1">
            <span>📅</span>
            <span>2024.02.15</span>
          </span>
          <span className="flex items-center gap-1">
            <span>👁</span>
            <span>2,543</span>
          </span>
          <span className="flex items-center gap-1">
            <span>🔖</span>
            <span>234</span>
          </span>
        </div>

        {/* 著者 */}
        <div className={`flex items-center gap-3 mt-4 pt-4 ${t.border} border-t`}>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
            <span className="text-white text-lg">G</span>
          </div>
          <div className="flex-1">
            <div className={`font-bold text-sm ${t.textPrimary}`}>Gate-In!編集部</div>
            <div className={`text-xs ${t.textMuted}`}>@gatein_official</div>
          </div>
          <button className={`px-3 py-1.5 rounded-full text-xs font-bold ${t.btnSecondary}`}>
            フォロー
          </button>
        </div>
      </div>

      {/* 目次 */}
      <div className={`mx-4 mt-4 ${t.bgCard} rounded-xl ${t.border} border overflow-hidden`}>
        <button className={`w-full px-4 py-3 flex items-center justify-between ${t.border} border-b`}>
          <span className={`text-sm font-bold ${t.textPrimary}`}>📑 目次</span>
          <span className={t.textMuted}>▼</span>
        </button>
        <div className="p-4 space-y-2">
          {[
            { num: '1', title: 'ディープインパクトとは', active: true },
            { num: '2', title: '産駒の距離適性', active: false },
            { num: '3', title: '得意なコース', active: false },
            { num: '4', title: '苦手な条件', active: false },
            { num: '5', title: '代表産駒紹介', active: false },
            { num: '6', title: '実践的な狙い方', active: false },
            { num: '🎯', title: '理解度チェッククイズ', active: false, isQuiz: true },
          ].map((item) => (
            <div
              key={item.num}
              className={`flex items-center gap-2 py-1 ${
                item.active ? t.textAccent + ' font-medium' : 
                item.isQuiz ? t.textAccent + ' font-bold' : t.textSecondary
              }`}
            >
              <span className={`w-6 text-center ${item.isQuiz ? '' : 'text-sm'}`}>{item.num}</span>
              <span className="text-sm">{item.title}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 本文開始 */}
      <div className="p-4 space-y-6">
        {/* セクション1 */}
        <section>
          <h2 className={`text-lg font-bold mb-3 flex items-center gap-2 ${t.textPrimary}`}>
            <span className={`w-7 h-7 rounded-lg ${isDark ? 'bg-slate-800' : 'bg-gray-100'} flex items-center justify-center text-sm`}>1</span>
            ディープインパクトとは
          </h2>
          <p className={`text-sm leading-relaxed ${t.textSecondary}`}>
            2005年に史上6頭目の無敗三冠馬となったディープインパクト。
            その圧倒的な末脚は<span className={`font-bold ${t.textAccent}`}>「飛ぶ」</span>と形容され、競馬ファンに衝撃を与えました。
          </p>
          <p className={`text-sm leading-relaxed mt-3 ${t.textSecondary}`}>
            種牡馬としても大成功を収め、2012年から2019年まで<span className={`font-bold ${t.textAccent}`}>8年連続</span>でリーディングサイアーに輝きました。
            産駒のG1勝利数は50勝を超え、日本競馬史上最も成功した種牡馬の一頭です。
          </p>
        </section>

        {/* 続きは detail-mid で */}
        <div className={`text-center py-4 ${t.textMuted} text-sm border-t border-dashed ${t.border}`}>
          ▼ 続きは「詳細(中)」タブで ▼
        </div>
      </div>
    </div>
  );
}

// ========================================
// 4. 記事詳細ページ（中部：データ・グラフ）
// ========================================
function ArticleDetailMidPage({ t, isDark }) {
  return (
    <div className="p-4 space-y-6">
      {/* インフォグラフィック */}
      <div className={`${t.bgCard} rounded-xl ${t.border} border p-4`}>
        <h3 className={`text-sm font-bold mb-4 ${t.textPrimary}`}>📊 ディープインパクト産駒 基本データ</h3>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'G1勝利数', value: '50+', icon: '🏆', color: 'text-red-500' },
            { label: '重賞勝利数', value: '200+', icon: '🥇', color: 'text-blue-500' },
            { label: 'リーディング', value: '8年連続', icon: '👑', color: 'text-yellow-500' },
            { label: '代表産駒', value: '7頭', icon: '🌟', color: 'text-purple-500' },
          ].map((stat) => (
            <div key={stat.label} className={`text-center p-3 rounded-lg ${isDark ? 'bg-slate-800' : 'bg-gray-50'}`}>
              <div className="text-2xl mb-1">{stat.icon}</div>
              <div className={`text-2xl font-black ${stat.color}`}>{stat.value}</div>
              <div className={`text-xs mt-1 ${t.textMuted}`}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* セクション2 */}
      <section>
        <h2 className={`text-lg font-bold mb-3 flex items-center gap-2 ${t.textPrimary}`}>
          <span className={`w-7 h-7 rounded-lg ${isDark ? 'bg-slate-800' : 'bg-gray-100'} flex items-center justify-center text-sm`}>2</span>
          産駒の距離適性
        </h2>
        <p className={`text-sm leading-relaxed ${t.textSecondary}`}>
          ディープインパクト産駒の最大の特徴は、<span className={`font-bold ${t.textAccent}`}>芝中距離（1600m〜2400m）</span>での強さです。
          特に東京・阪神の外回りコースでの好走率が高く、直線の長いコースで本領を発揮します。
        </p>
      </section>

      {/* 距離別成績グラフ */}
      <div className={`${t.bgCard} rounded-xl ${t.border} border p-4`}>
        <h3 className={`text-sm font-bold mb-4 ${t.textPrimary}`}>📈 距離別 勝率データ</h3>
        <div className="space-y-3">
          {[
            { distance: '1200m', rate: 8, label: '苦手', color: 'bg-gray-400' },
            { distance: '1400m', rate: 10, label: '', color: 'bg-blue-400' },
            { distance: '1600m', rate: 14, label: '得意', color: 'bg-green-500' },
            { distance: '1800m', rate: 15, label: '得意', color: 'bg-green-500' },
            { distance: '2000m', rate: 16, label: '最得意', color: 'bg-green-600' },
            { distance: '2400m', rate: 14, label: '得意', color: 'bg-green-500' },
            { distance: '2500m+', rate: 11, label: '', color: 'bg-blue-400' },
          ].map((d) => (
            <div key={d.distance} className="flex items-center gap-2">
              <span className={`w-16 text-xs font-medium ${t.textMuted}`}>{d.distance}</span>
              <div className={`flex-1 h-5 rounded-full ${isDark ? 'bg-slate-700' : 'bg-gray-100'} overflow-hidden`}>
                <div
                  className={`h-full rounded-full ${d.color} transition-all flex items-center justify-end pr-2`}
                  style={{ width: `${d.rate * 5}%` }}
                >
                  <span className="text-[10px] font-bold text-white">{d.rate}%</span>
                </div>
              </div>
              {d.label && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                  d.label === '最得意' ? 'bg-green-100 text-green-700' : 
                  d.label === '得意' ? 'bg-blue-100 text-blue-700' : 
                  'bg-red-100 text-red-700'
                }`}>
                  {d.label}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* セクション3 */}
      <section>
        <h2 className={`text-lg font-bold mb-3 flex items-center gap-2 ${t.textPrimary}`}>
          <span className={`w-7 h-7 rounded-lg ${isDark ? 'bg-slate-800' : 'bg-gray-100'} flex items-center justify-center text-sm`}>3</span>
          得意なコース
        </h2>
        <p className={`text-sm leading-relaxed ${t.textSecondary}`}>
          直線が長く、末脚を活かせるコースが得意です。特に以下のコースでは勝率が高くなっています。
        </p>
      </section>

      {/* コース別カード */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { course: '東京芝2000m', rate: '18%', trend: '↑', trendText: '好調' },
          { course: '阪神芝2200m', rate: '16%', trend: '↑', trendText: '好調' },
          { course: '京都芝2400m', rate: '15%', trend: '→', trendText: '安定' },
          { course: '新潟芝2000m', rate: '14%', trend: '→', trendText: '安定' },
        ].map((c) => (
          <div key={c.course} className={`${t.bgCard} rounded-lg ${t.border} border p-3`}>
            <div className={`text-xs ${t.textMuted}`}>{c.course}</div>
            <div className={`text-xl font-black mt-1 ${t.textAccent}`}>{c.rate}</div>
            <div className={`text-xs mt-1 flex items-center gap-1 ${
              c.trend === '↑' ? 'text-green-500' : t.textMuted
            }`}>
              <span>{c.trend}</span>
              <span>{c.trendText}</span>
            </div>
          </div>
        ))}
      </div>

      {/* 続きは detail-bottom で */}
      <div className={`text-center py-4 ${t.textMuted} text-sm border-t border-dashed ${t.border}`}>
        ▼ 続きは「詳細(下)」タブで ▼
      </div>
    </div>
  );
}

// ========================================
// 5. 記事詳細ページ（下部：まとめ・クイズ連携）
// ========================================
function ArticleDetailBottomPage({ t, isDark }) {
  return (
    <div className="p-4 space-y-6">
      {/* セクション5: 代表産駒 */}
      <section>
        <h2 className={`text-lg font-bold mb-3 flex items-center gap-2 ${t.textPrimary}`}>
          <span className={`w-7 h-7 rounded-lg ${isDark ? 'bg-slate-800' : 'bg-gray-100'} flex items-center justify-center text-sm`}>5</span>
          代表産駒紹介
        </h2>
      </section>

      {/* 馬カード */}
      <div className="space-y-3">
        {[
          { name: 'ジェンティルドンナ', wins: 'G1 7勝', desc: '牝馬三冠 + JC2勝 + 有馬記念', highlight: true },
          { name: 'コントレイル', wins: 'G1 5勝', desc: '無敗三冠馬（史上3頭目）', highlight: true },
          { name: 'グランアレグリア', wins: 'G1 6勝', desc: '史上最強マイラー', highlight: false },
          { name: 'フィエールマン', wins: 'G1 4勝', desc: '天皇賞春連覇', highlight: false },
        ].map((horse) => (
          <div
            key={horse.name}
            className={`${t.bgCard} rounded-xl ${t.border} border p-4 flex items-center gap-3 ${
              horse.highlight ? (isDark ? 'ring-2 ring-amber-500/50' : 'ring-2 ring-green-500/50') : ''
            }`}
          >
            <div className={`w-14 h-14 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-gray-100'} flex items-center justify-center text-3xl`}>
              🏇
            </div>
            <div className="flex-1">
              <div className={`font-bold ${t.textPrimary}`}>{horse.name}</div>
              <div className={`text-xs mt-0.5 ${t.textMuted}`}>{horse.desc}</div>
            </div>
            <div className={`text-sm font-bold ${t.textAccent}`}>{horse.wins}</div>
          </div>
        ))}
      </div>

      {/* ポイントまとめ */}
      <div className={`${isDark ? 'bg-gradient-to-br from-green-900/30 to-emerald-900/30' : 'bg-gradient-to-br from-green-50 to-emerald-50'} rounded-2xl p-4 border-2 ${isDark ? 'border-green-700' : 'border-green-300'}`}>
        <h3 className={`font-bold mb-3 flex items-center gap-2 ${t.textPrimary}`}>
          <span>📝</span>
          この記事のポイント
        </h3>
        <ul className={`text-sm space-y-2 ${t.textSecondary}`}>
          {[
            '芝中距離（1600m〜2400m）が得意',
            '東京・阪神外回りで好走率UP',
            '短距離・重馬場は割引',
            '牝馬の活躍が目立つ',
            '末脚勝負になるレースで狙い目',
          ].map((point, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* クイズ誘導（重要！） */}
      <div className={`${isDark ? 'bg-gradient-to-br from-purple-900/50 to-pink-900/50' : 'bg-gradient-to-br from-purple-50 to-pink-50'} rounded-2xl p-5 border-2 ${isDark ? 'border-purple-600' : 'border-purple-300'}`}>
        <div className="text-center">
          <span className="text-5xl">🎯</span>
          <h3 className={`text-lg font-bold mt-3 ${t.textPrimary}`}>理解度チェック！</h3>
          <p className={`text-sm mt-2 ${t.textMuted}`}>
            記事の内容を覚えたかクイズでチェックしよう
          </p>
          <div className={`mt-3 flex items-center justify-center gap-4 text-xs ${t.textMuted}`}>
            <span>📝 5問</span>
            <span>⏱ 約2分</span>
            <span>🎁 +20P</span>
          </div>
          <button className={`w-full mt-4 py-3.5 rounded-xl font-bold text-lg ${t.btnPrimary} shadow-lg`}>
            🎯 クイズに挑戦する
          </button>
        </div>
      </div>

      {/* 関連クイズ */}
      <div className={`${t.bgCard} rounded-2xl ${t.border} border overflow-hidden`}>
        <div className={`px-4 py-3 ${t.border} border-b flex items-center justify-between`}>
          <h3 className={`text-sm font-bold ${t.textPrimary}`}>🎯 関連クイズ</h3>
          <span className={`text-xs ${t.textAccent}`}>すべて見る →</span>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-slate-800">
          {[
            { name: '血統マスター検定', level: '上級', questions: 10, points: 50 },
            { name: 'ディープ産駒クイズ', level: '中級', questions: 5, points: 20 },
          ].map((quiz) => (
            <div key={quiz.name} className={`px-4 py-3 flex items-center justify-between ${t.cardHover}`}>
              <div>
                <div className={`font-bold text-sm ${t.textPrimary}`}>{quiz.name}</div>
                <div className={`text-xs mt-0.5 ${t.textMuted}`}>
                  {quiz.level} / {quiz.questions}問 / +{quiz.points}P
                </div>
              </div>
              <button className={`px-4 py-1.5 rounded-lg text-sm font-bold ${t.btnSecondary}`}>
                挑戦
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 関連記事 */}
      <div className={`${t.bgCard} rounded-2xl ${t.border} border overflow-hidden`}>
        <div className={`px-4 py-3 ${t.border} border-b`}>
          <h3 className={`text-sm font-bold ${t.textPrimary}`}>📖 関連記事</h3>
        </div>
        <div className="p-4 space-y-3">
          {[
            { title: 'キタサンブラック産駒の特徴と狙い方', category: '🧬 血統' },
            { title: '東京芝2000m完全攻略ガイド', category: '🏟️ コース' },
            { title: '血統で狙う天皇賞・春', category: '🧬 血統' },
          ].map((article) => (
            <div key={article.title} className={`flex items-center gap-3 ${t.cardHover} cursor-pointer`}>
              <div className={`w-14 h-14 rounded-lg ${isDark ? 'bg-slate-800' : 'bg-gray-100'} flex items-center justify-center text-xl`}>
                🏇
              </div>
              <div className="flex-1 min-w-0">
                <div className={`font-bold text-sm line-clamp-1 ${t.textPrimary}`}>{article.title}</div>
                <div className={`text-xs mt-0.5 ${t.textMuted}`}>{article.category}</div>
              </div>
              <span className={t.textMuted}>→</span>
            </div>
          ))}
        </div>
      </div>

      {/* タグ */}
      <div>
        <h3 className={`text-sm font-bold mb-2 ${t.textPrimary}`}>🏷️ タグ</h3>
        <div className="flex flex-wrap gap-2">
          {['ディープインパクト', '血統', '種牡馬', '芝', '中距離', '東京競馬場'].map((tag) => (
            <button
              key={tag}
              className={`text-xs px-3 py-1.5 rounded-full font-medium ${t.tagBg}`}
            >
              #{tag}
            </button>
          ))}
        </div>
      </div>

      {/* シェアボタン */}
      <div className="grid grid-cols-3 gap-2">
        <button className="py-3 rounded-xl font-bold bg-black text-white text-sm flex items-center justify-center gap-1">
          <span>𝕏</span>
          <span>シェア</span>
        </button>
        <button className="py-3 rounded-xl font-bold bg-green-500 text-white text-sm flex items-center justify-center gap-1">
          <span>💬</span>
          <span>LINE</span>
        </button>
        <button className={`py-3 rounded-xl font-bold ${t.btnSecondary} text-sm flex items-center justify-center gap-1`}>
          <span>🔗</span>
          <span>コピー</span>
        </button>
      </div>

      {/* 著者フォローCTA */}
      <div className={`${t.bgCard} rounded-2xl ${t.border} border p-4`}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
            <span className="text-white text-xl font-bold">G</span>
          </div>
          <div className="flex-1">
            <div className={`font-bold ${t.textPrimary}`}>Gate-In!編集部</div>
            <div className={`text-xs ${t.textMuted}`}>毎週新しい記事を更新中！</div>
          </div>
          <button className={`px-4 py-2 rounded-xl font-bold ${t.btnPrimary}`}>
            フォロー
          </button>
        </div>
      </div>
    </div>
  );
}

// ========================================
// 6. 検索ページ
// ========================================
function SearchPage({ t, isDark }) {
  const [query, setQuery] = useState('ディープインパクト');

  return (
    <div className="pb-4">
      {/* 検索ヘッダー */}
      <div className={`${t.bgCard} p-4 ${t.border} border-b`}>
        <div className="flex items-center gap-3">
          <button className={t.textMuted}>←</button>
          <div className={`flex-1 flex items-center gap-2 px-4 py-2.5 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-gray-100'}`}>
            <span>🔍</span>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="キーワードを入力..."
              className={`flex-1 bg-transparent outline-none text-sm ${t.textPrimary}`}
            />
            {query && (
              <button onClick={() => setQuery('')} className={t.textMuted}>✕</button>
            )}
          </div>
        </div>
      </div>

      {/* フィルター */}
      <div className={`${t.bgCard} px-4 py-3 ${t.border} border-b`}>
        <div className="flex gap-2 overflow-x-auto">
          {['すべて', '血統', 'コース', '騎手', '予想術', '名馬'].map((f, i) => (
            <button
              key={f}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap ${
                i === 0 ? t.btnPrimary : t.btnSecondary
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* 検索結果 */}
      <div className="p-4">
        <div className={`text-sm mb-4 ${t.textMuted}`}>
          「{query}」の検索結果: <span className={t.textPrimary}>12件</span>
        </div>

        <div className="space-y-3">
          {[
            { 
              title: 'ディープインパクト産駒の特徴と狙い方【完全版】', 
              category: '🧬 血統', 
              date: '2024.02.15',
              matchType: 'タイトル',
              hasQuiz: true,
            },
            { 
              title: '東京芝2400mで狙うべき血統は？ディープ産駒の好走パターン', 
              category: '🏟️ コース', 
              date: '2024.02.10',
              matchType: '本文',
              hasQuiz: true,
            },
            { 
              title: '種牡馬リーディングの読み解き方 - ディープインパクトの軌跡', 
              category: '📊 予想術', 
              date: '2024.01.28',
              matchType: '本文',
              hasQuiz: false,
            },
            { 
              title: '無敗三冠馬コントレイル - ディープの後継者', 
              category: '🏆 名馬', 
              date: '2024.01.20',
              matchType: 'タイトル',
              hasQuiz: true,
            },
          ].map((result, i) => (
            <div
              key={i}
              className={`${t.bgCard} rounded-xl ${t.border} border p-4 ${t.cardHover} cursor-pointer`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${t.tagBg}`}>
                  {result.category}
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${isDark ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>
                  {result.matchType}にマッチ
                </span>
                {result.hasQuiz && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700'}`}>
                    🎯
                  </span>
                )}
              </div>
              <h3 className={`font-bold text-sm ${t.textPrimary}`}>
                {result.title.split(query).map((part, j, arr) => (
                  <React.Fragment key={j}>
                    {part}
                    {j < arr.length - 1 && (
                      <span className={`${isDark ? 'bg-amber-500/30 text-amber-300' : 'bg-yellow-200 text-yellow-900'} px-0.5 rounded`}>
                        {query}
                      </span>
                    )}
                  </React.Fragment>
                ))}
              </h3>
              <div className={`text-xs mt-2 ${t.textMuted}`}>{result.date}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 人気の検索キーワード */}
      <div className="px-4 mt-4">
        <h3 className={`text-sm font-bold mb-3 ${t.textPrimary}`}>🔥 人気の検索キーワード</h3>
        <div className="flex flex-wrap gap-2">
          {['キタサンブラック', '東京芝', 'ルメール', '重馬場', '逃げ馬', '三冠馬'].map((keyword) => (
            <button
              key={keyword}
              onClick={() => setQuery(keyword)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium ${t.tagBg}`}
            >
              {keyword}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
