import React, { useState } from 'react';

// テーマ設定（Gate-In!既存デザインに合わせる）
const themes = {
  light: {
    bgBase: 'bg-gray-50',
    bgCard: 'bg-white',
    textPrimary: 'text-gray-900',
    textSecondary: 'text-gray-700',
    textMuted: 'text-gray-500',
    textAccent: 'text-green-600',
    border: 'border-gray-100',
    btnPrimary: 'bg-green-600 text-white hover:bg-green-700',
    btnSecondary: 'bg-green-50 text-green-600 hover:bg-green-100',
    navBg: 'bg-white border-gray-200',
    navActive: 'text-green-600',
    navInactive: 'text-gray-400',
    progressBg: 'bg-gray-200',
    progressFill: 'bg-green-500',
    correct: 'bg-green-100 border-green-500 text-green-800',
    incorrect: 'bg-red-100 border-red-500 text-red-800',
  },
  dark: {
    bgBase: 'bg-slate-950',
    bgCard: 'bg-slate-900',
    textPrimary: 'text-slate-100',
    textSecondary: 'text-slate-300',
    textMuted: 'text-slate-500',
    textAccent: 'text-amber-400',
    border: 'border-slate-800',
    btnPrimary: 'bg-amber-500 text-slate-900 hover:bg-amber-400',
    btnSecondary: 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20',
    navBg: 'bg-slate-900 border-slate-800',
    navActive: 'text-amber-400',
    navInactive: 'text-slate-500',
    progressBg: 'bg-slate-700',
    progressFill: 'bg-amber-500',
    correct: 'bg-green-900/50 border-green-500 text-green-300',
    incorrect: 'bg-red-900/50 border-red-500 text-red-300',
  },
};

const PAGES = [
  { id: 'top', label: '🎯 トップ' },
  { id: 'category', label: '📚 カテゴリ' },
  { id: 'quiz', label: '❓ 出題' },
  { id: 'answer', label: '✅ 解答' },
  { id: 'result', label: '🏆 結果' },
  { id: 'ranking', label: '👑 ランキング' },
  { id: 'article', label: '📖 記事連動' },
];

export default function QuizWireframe() {
  const [isDark, setIsDark] = useState(false);
  const [activePage, setActivePage] = useState('top');
  const t = isDark ? themes.dark : themes.light;

  return (
    <div className={`min-h-screen ${t.bgBase}`}>
      {/* ページセレクター */}
      <div className={`sticky top-0 z-50 ${t.bgCard} ${t.border} border-b p-2`}>
        <div className="flex items-center justify-between mb-2 px-2">
          <h1 className={`text-sm font-bold ${t.textPrimary}`}>🎯 競馬クイズ ワイヤーフレーム</h1>
          <button
            onClick={() => setIsDark(!isDark)}
            className={`px-3 py-1 rounded-full text-xs font-bold ${t.btnSecondary}`}
          >
            {isDark ? '🌙 Dark' : '☀️ Light'}
          </button>
        </div>
        <div className="flex gap-1 overflow-x-auto pb-1">
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
      <div className="max-w-md mx-auto pb-20">
        {activePage === 'top' && <QuizTopPage t={t} isDark={isDark} />}
        {activePage === 'category' && <CategoryPage t={t} isDark={isDark} />}
        {activePage === 'quiz' && <QuizPage t={t} isDark={isDark} />}
        {activePage === 'answer' && <AnswerPage t={t} isDark={isDark} />}
        {activePage === 'result' && <ResultPage t={t} isDark={isDark} />}
        {activePage === 'ranking' && <RankingPage t={t} isDark={isDark} />}
        {activePage === 'article' && <ArticlePage t={t} isDark={isDark} />}
      </div>

      {/* ボトムナビ */}
      <nav className={`fixed bottom-0 left-0 right-0 ${t.navBg} border-t z-40`}>
        <div className="max-w-md mx-auto flex items-center justify-around py-2">
          {[
            { icon: '🏠', label: 'TOP' },
            { icon: '🏁', label: 'レース' },
            { icon: '🎯', label: 'クイズ', active: true },
            { icon: '🏆', label: 'ランキング' },
            { icon: '👤', label: 'マイページ' },
          ].map((item, i) => (
            <button
              key={i}
              className={`flex flex-col items-center gap-0.5 ${
                item.active ? t.navActive : t.navInactive
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-[10px]">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

// ========================================
// 1. クイズトップページ
// ========================================
function QuizTopPage({ t, isDark }) {
  return (
    <div className="p-4 space-y-4">
      {/* ヘッダー */}
      <div className="text-center py-4">
        <span className="text-5xl">🎯</span>
        <h1 className={`text-2xl font-black mt-2 ${t.textPrimary}`}>競馬力検定</h1>
        <p className={`text-sm mt-1 ${t.textMuted}`}>クイズで馬券力を鍛えよう！</p>
      </div>

      {/* デイリーチャレンジ */}
      <div className={`${isDark ? 'bg-gradient-to-br from-amber-900/30 to-orange-900/30' : 'bg-gradient-to-br from-amber-50 to-orange-50'} rounded-2xl p-4 border-2 ${isDark ? 'border-amber-600' : 'border-amber-300'}`}>
        <div className="flex items-center gap-3">
          <span className="text-4xl">📅</span>
          <div className="flex-1">
            <div className={`text-xs font-bold ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>TODAY's CHALLENGE</div>
            <div className={`text-lg font-black ${t.textPrimary}`}>今日の1問</div>
            <div className={`text-xs ${t.textMuted}`}>正解率 12% の難問！</div>
          </div>
          <button className={`px-4 py-2 rounded-xl font-bold ${t.btnPrimary}`}>
            挑戦
          </button>
        </div>
        <div className={`mt-3 flex items-center gap-2 text-xs ${t.textMuted}`}>
          <span>🔥 連続正解</span>
          <span className={`font-bold ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>5日</span>
          <span className="mx-2">|</span>
          <span>⏰ あと 8時間32分</span>
        </div>
      </div>

      {/* 検定カテゴリ */}
      <div>
        <h2 className={`text-sm font-bold mb-3 ${t.textPrimary}`}>🏆 検定に挑戦</h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: '🧬', name: '血統マスター', questions: 30, difficulty: '★★★★', color: 'from-purple-500 to-pink-500' },
            { icon: '🏇', name: 'G1メモリアル', questions: 25, difficulty: '★★★', color: 'from-blue-500 to-cyan-500' },
            { icon: '👨‍✈️', name: '騎手検定', questions: 20, difficulty: '★★', color: 'from-green-500 to-emerald-500' },
            { icon: '🏟️', name: 'コース攻略', questions: 20, difficulty: '★★', color: 'from-orange-500 to-red-500' },
          ].map((cat) => (
            <div
              key={cat.name}
              className={`${t.bgCard} rounded-xl ${t.border} border p-3 relative overflow-hidden`}
            >
              <div className={`absolute top-0 right-0 w-16 h-16 bg-gradient-to-br ${cat.color} opacity-10 rounded-bl-full`} />
              <span className="text-3xl">{cat.icon}</span>
              <div className={`font-bold mt-1 ${t.textPrimary}`}>{cat.name}</div>
              <div className={`text-xs ${t.textMuted}`}>{cat.questions}問</div>
              <div className={`text-xs mt-1 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>{cat.difficulty}</div>
            </div>
          ))}
        </div>
      </div>

      {/* あなたの成績 */}
      <div className={`${t.bgCard} rounded-2xl ${t.border} border p-4`}>
        <h3 className={`text-sm font-bold mb-3 ${t.textPrimary}`}>📊 あなたの成績</h3>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className={`text-2xl font-black ${isDark ? 'text-amber-400' : 'text-green-600'}`}>76%</div>
            <div className={`text-xs ${t.textMuted}`}>正答率</div>
          </div>
          <div>
            <div className={`text-2xl font-black ${t.textPrimary}`}>234</div>
            <div className={`text-xs ${t.textMuted}`}>回答数</div>
          </div>
          <div>
            <div className={`text-2xl font-black ${t.textPrimary}`}>12</div>
            <div className={`text-xs ${t.textMuted}`}>称号</div>
          </div>
        </div>
        <div className="flex gap-2 mt-4 overflow-x-auto pb-1">
          {['🧬 血統博士', '🏇 G1マニア', '🔥 5日連続'].map((badge) => (
            <span
              key={badge}
              className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-gray-100 text-gray-700'}`}
            >
              {badge}
            </span>
          ))}
        </div>
      </div>

      {/* 週間激ムズチャレンジ */}
      <div className={`${t.bgCard} rounded-2xl ${t.border} border p-4`}>
        <div className="flex items-center justify-between">
          <div>
            <div className={`text-xs font-bold text-red-500`}>🔥 EXTREME</div>
            <div className={`font-bold ${t.textPrimary}`}>週間激ムズ1問</div>
            <div className={`text-xs ${t.textMuted}`}>正解率 1.2% | 正解者 3人</div>
          </div>
          <button className={`px-4 py-2 rounded-xl font-bold bg-red-500 text-white`}>
            挑む
          </button>
        </div>
      </div>
    </div>
  );
}

// ========================================
// 2. カテゴリ選択ページ
// ========================================
function CategoryPage({ t, isDark }) {
  const [selected, setSelected] = useState('blood');
  
  const categories = [
    { id: 'blood', icon: '🧬', name: '血統', desc: '種牡馬・血統理論', levels: ['入門', '中級', '上級', 'マスター'] },
    { id: 'g1', icon: '🏆', name: 'G1レース', desc: '歴代G1の記録', levels: ['入門', '中級', '上級'] },
    { id: 'jockey', icon: '👨‍✈️', name: '騎手', desc: '騎手の記録・特徴', levels: ['入門', '中級', '上級'] },
    { id: 'trainer', icon: '👔', name: '調教師', desc: '厩舎の特徴', levels: ['入門', '中級'] },
    { id: 'course', icon: '🏟️', name: 'コース', desc: 'コース傾向', levels: ['入門', '中級', '上級'] },
    { id: 'history', icon: '📜', name: '名馬伝説', desc: '伝説の名馬たち', levels: ['入門', '中級', 'マスター'] },
  ];

  return (
    <div className="p-4 space-y-4">
      <div className={`text-sm ${t.textMuted}`}>
        クイズ › <span className={t.textPrimary}>カテゴリ選択</span>
      </div>
      <h1 className={`text-xl font-bold ${t.textPrimary}`}>📚 カテゴリを選ぶ</h1>

      {/* カテゴリリスト */}
      <div className="space-y-3">
        {categories.map((cat) => (
          <div
            key={cat.id}
            onClick={() => setSelected(cat.id)}
            className={`${t.bgCard} rounded-xl ${t.border} border-2 p-4 cursor-pointer transition-all ${
              selected === cat.id 
                ? isDark ? 'border-amber-500' : 'border-green-500' 
                : ''
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-3xl">{cat.icon}</span>
              <div className="flex-1">
                <div className={`font-bold ${t.textPrimary}`}>{cat.name}</div>
                <div className={`text-xs ${t.textMuted}`}>{cat.desc}</div>
                <div className="flex gap-1 mt-2">
                  {cat.levels.map((level, i) => (
                    <span
                      key={level}
                      className={`text-[10px] px-2 py-0.5 rounded-full ${
                        i < 2 
                          ? 'bg-green-100 text-green-700' 
                          : isDark ? 'bg-slate-700 text-slate-400' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {level} {i < 2 ? '✓' : ''}
                    </span>
                  ))}
                </div>
              </div>
              {selected === cat.id && (
                <span className={`text-2xl ${isDark ? 'text-amber-400' : 'text-green-500'}`}>✓</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 難易度選択 */}
      <div className={`${t.bgCard} rounded-2xl ${t.border} border p-4`}>
        <h3 className={`text-sm font-bold mb-3 ${t.textPrimary}`}>難易度を選ぶ</h3>
        <div className="grid grid-cols-2 gap-2">
          {[
            { level: '入門', stars: '★', time: '10問 / 5分', color: 'bg-green-500' },
            { level: '中級', stars: '★★', time: '10問 / 5分', color: 'bg-blue-500' },
            { level: '上級', stars: '★★★', time: '10問 / 5分', color: 'bg-purple-500' },
            { level: 'マスター', stars: '★★★★', time: '10問 / 5分', color: 'bg-red-500' },
          ].map((d) => (
            <button
              key={d.level}
              className={`p-3 rounded-xl text-left ${isDark ? 'bg-slate-800 hover:bg-slate-700' : 'bg-gray-50 hover:bg-gray-100'} transition-all`}
            >
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${d.color}`} />
                <span className={`font-bold ${t.textPrimary}`}>{d.level}</span>
              </div>
              <div className={`text-xs ${t.textMuted} mt-1`}>{d.stars}</div>
              <div className={`text-xs ${t.textMuted}`}>{d.time}</div>
            </button>
          ))}
        </div>
      </div>

      <button className={`w-full py-4 rounded-xl font-bold text-lg ${t.btnPrimary}`}>
        🎯 検定スタート！
      </button>
    </div>
  );
}

// ========================================
// 3. クイズ出題ページ
// ========================================
function QuizPage({ t, isDark }) {
  const [selectedAnswer, setSelectedAnswer] = useState(null);

  return (
    <div className="p-4 space-y-4">
      {/* 進捗バー */}
      <div className="flex items-center gap-3">
        <span className={`text-sm font-bold ${t.textPrimary}`}>Q3 / 10</span>
        <div className={`flex-1 h-2 rounded-full ${t.progressBg}`}>
          <div className={`h-full rounded-full ${t.progressFill} transition-all`} style={{ width: '30%' }} />
        </div>
        <span className={`text-sm font-mono ${t.textMuted}`}>04:32</span>
      </div>

      {/* カテゴリ表示 */}
      <div className="flex items-center gap-2">
        <span className={`text-xs px-2 py-1 rounded-full ${isDark ? 'bg-purple-900/50 text-purple-300' : 'bg-purple-100 text-purple-700'}`}>
          🧬 血統マスター
        </span>
        <span className={`text-xs px-2 py-1 rounded-full ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-gray-100 text-gray-600'}`}>
          上級 ★★★
        </span>
      </div>

      {/* 問題文 */}
      <div className={`${t.bgCard} rounded-2xl ${t.border} border p-5`}>
        <div className={`text-lg font-bold leading-relaxed ${t.textPrimary}`}>
          ディープインパクト産駒で、<br />
          G1を最も多く勝利した馬は？
        </div>
      </div>

      {/* 選択肢 */}
      <div className="space-y-3">
        {[
          { id: 'A', text: 'ジェンティルドンナ', subtext: 'G1 7勝' },
          { id: 'B', text: 'コントレイル', subtext: 'G1 5勝' },
          { id: 'C', text: 'グランアレグリア', subtext: 'G1 6勝' },
          { id: 'D', text: 'サトノダイヤモンド', subtext: 'G1 3勝' },
        ].map((option) => (
          <button
            key={option.id}
            onClick={() => setSelectedAnswer(option.id)}
            className={`w-full p-4 rounded-xl text-left transition-all border-2 ${
              selectedAnswer === option.id
                ? isDark 
                  ? 'bg-amber-500/20 border-amber-500' 
                  : 'bg-green-50 border-green-500'
                : `${t.bgCard} ${t.border} hover:border-gray-300`
            }`}
          >
            <div className="flex items-center gap-3">
              <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                selectedAnswer === option.id
                  ? isDark ? 'bg-amber-500 text-slate-900' : 'bg-green-500 text-white'
                  : isDark ? 'bg-slate-700 text-slate-300' : 'bg-gray-100 text-gray-700'
              }`}>
                {option.id}
              </span>
              <div>
                <div className={`font-bold ${t.textPrimary}`}>{option.text}</div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* 回答ボタン */}
      <button
        disabled={!selectedAnswer}
        className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
          selectedAnswer ? t.btnPrimary : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        }`}
      >
        回答する
      </button>

      {/* スキップ */}
      <button className={`w-full py-2 text-sm ${t.textMuted}`}>
        この問題をスキップ →
      </button>
    </div>
  );
}

// ========================================
// 4. 解答ページ
// ========================================
function AnswerPage({ t, isDark }) {
  const isCorrect = true;

  return (
    <div className="p-4 space-y-4">
      {/* 進捗バー */}
      <div className="flex items-center gap-3">
        <span className={`text-sm font-bold ${t.textPrimary}`}>Q3 / 10</span>
        <div className={`flex-1 h-2 rounded-full ${t.progressBg}`}>
          <div className={`h-full rounded-full ${t.progressFill}`} style={{ width: '30%' }} />
        </div>
      </div>

      {/* 正解/不正解 */}
      <div className={`text-center py-6 rounded-2xl ${isCorrect ? (isDark ? 'bg-green-900/30' : 'bg-green-50') : (isDark ? 'bg-red-900/30' : 'bg-red-50')}`}>
        <span className="text-5xl">{isCorrect ? '🎉' : '😢'}</span>
        <div className={`text-2xl font-black mt-2 ${isCorrect ? 'text-green-500' : 'text-red-500'}`}>
          {isCorrect ? '正解！' : '不正解...'}
        </div>
        <div className={`text-sm mt-1 ${t.textMuted}`}>
          正解率 24% の問題でした
        </div>
      </div>

      {/* 問題と答え */}
      <div className={`${t.bgCard} rounded-2xl ${t.border} border p-4`}>
        <div className={`text-sm ${t.textMuted} mb-2`}>問題</div>
        <div className={`font-bold ${t.textPrimary} mb-4`}>
          ディープインパクト産駒で、G1を最も多く勝利した馬は？
        </div>
        
        <div className={`p-3 rounded-xl border-2 ${isDark ? 'bg-green-900/30 border-green-500' : 'bg-green-50 border-green-500'}`}>
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded bg-green-500 text-white text-xs flex items-center justify-center font-bold">A</span>
            <span className={`font-bold ${t.textPrimary}`}>ジェンティルドンナ</span>
            <span className="text-green-500 ml-auto">✓ 正解</span>
          </div>
        </div>
      </div>

      {/* 解説 */}
      <div className={`${t.bgCard} rounded-2xl ${t.border} border p-4`}>
        <div className={`text-sm font-bold mb-2 ${t.textPrimary}`}>📖 解説</div>
        <div className={`text-sm ${t.textSecondary} leading-relaxed`}>
          ジェンティルドンナは2012年の牝馬三冠を含む<span className={`font-bold ${t.textAccent}`}>G1通算7勝</span>を挙げ、
          ディープインパクト産駒として最多のG1勝利数を記録しています。
          <br /><br />
          主なG1勝利：桜花賞、オークス、秋華賞、ジャパンC（2回）、有馬記念、ドバイシーマクラシック
        </div>
        <button className={`mt-3 text-sm ${t.textAccent}`}>
          📚 関連記事を読む →
        </button>
      </div>

      {/* 次へ */}
      <button className={`w-full py-4 rounded-xl font-bold text-lg ${t.btnPrimary}`}>
        次の問題へ →
      </button>
    </div>
  );
}

// ========================================
// 5. 結果ページ（SNSシェア用）
// ========================================
function ResultPage({ t, isDark }) {
  return (
    <div className="p-4 space-y-4">
      {/* 結果カード（シェア用） */}
      <div className={`${isDark ? 'bg-gradient-to-br from-purple-900/50 to-pink-900/50' : 'bg-gradient-to-br from-purple-50 to-pink-50'} rounded-2xl p-6 text-center border-2 ${isDark ? 'border-purple-500' : 'border-purple-300'}`}>
        <div className="text-5xl mb-2">🎯</div>
        <div className={`text-sm ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>Gate-In! 血統マスター検定</div>
        
        <div className={`text-6xl font-black my-4 ${t.textPrimary}`}>
          8<span className={`text-2xl ${t.textMuted}`}>/10</span>
        </div>
        
        <div className={`text-xl font-bold ${isDark ? 'text-amber-400' : 'text-green-600'}`}>
          正答率 80%
        </div>
        
        <div className={`inline-block mt-4 px-4 py-2 rounded-full ${isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-green-100 text-green-700'} font-bold`}>
          🏆 称号獲得：血統博士
        </div>
        
        <div className={`mt-4 text-sm ${t.textMuted}`}>
          上位 8% の成績です！
        </div>
      </div>

      {/* 詳細スタッツ */}
      <div className={`${t.bgCard} rounded-2xl ${t.border} border p-4`}>
        <h3 className={`text-sm font-bold mb-3 ${t.textPrimary}`}>📊 詳細結果</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className={`text-2xl font-black text-green-500`}>8</div>
            <div className={`text-xs ${t.textMuted}`}>正解</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-black text-red-500`}>2</div>
            <div className={`text-xs ${t.textMuted}`}>不正解</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-black ${t.textPrimary}`}>3:42</div>
            <div className={`text-xs ${t.textMuted}`}>所要時間</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-black ${isDark ? 'text-amber-400' : 'text-green-600'}`}>+50P</div>
            <div className={`text-xs ${t.textMuted}`}>獲得ポイント</div>
          </div>
        </div>
      </div>

      {/* 問題別結果 */}
      <div className={`${t.bgCard} rounded-2xl ${t.border} border p-4`}>
        <h3 className={`text-sm font-bold mb-3 ${t.textPrimary}`}>問題別結果</h3>
        <div className="flex gap-2 flex-wrap">
          {[true, true, true, false, true, true, true, false, true, true].map((correct, i) => (
            <span
              key={i}
              className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                correct 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-red-100 text-red-700'
              }`}
            >
              {i + 1}
            </span>
          ))}
        </div>
      </div>

      {/* 獲得称号 */}
      <div className={`${t.bgCard} rounded-2xl ${t.border} border p-4`}>
        <h3 className={`text-sm font-bold mb-3 ${t.textPrimary}`}>🎖️ 獲得した称号</h3>
        <div className="flex items-center gap-3">
          <span className="text-4xl">🧬</span>
          <div>
            <div className={`font-bold ${t.textPrimary}`}>血統博士</div>
            <div className={`text-xs ${t.textMuted}`}>血統マスター検定 上級クリア</div>
          </div>
        </div>
      </div>

      {/* シェアボタン */}
      <div className="grid grid-cols-2 gap-3">
        <button className="py-3 rounded-xl font-bold bg-black text-white flex items-center justify-center gap-2">
          <span>𝕏</span> シェア
        </button>
        <button className="py-3 rounded-xl font-bold bg-green-500 text-white flex items-center justify-center gap-2">
          <span>📷</span> 画像保存
        </button>
      </div>

      {/* アクション */}
      <button className={`w-full py-4 rounded-xl font-bold text-lg ${t.btnPrimary}`}>
        🔄 もう一度挑戦
      </button>
      <button className={`w-full py-3 rounded-xl font-bold ${t.btnSecondary}`}>
        📚 他のカテゴリに挑戦
      </button>
    </div>
  );
}

// ========================================
// 6. ランキングページ
// ========================================
function RankingPage({ t, isDark }) {
  const [tab, setTab] = useState('weekly');

  return (
    <div className="pb-4">
      <div className="p-4">
        <h1 className={`text-xl font-bold ${t.textPrimary}`}>👑 ランキング</h1>
      </div>

      {/* タブ */}
      <div className={`${t.bgCard} ${t.border} border-b flex`}>
        {['weekly', 'monthly', 'all'].map((tb) => (
          <button
            key={tb}
            onClick={() => setTab(tb)}
            className={`flex-1 py-3 text-sm font-bold relative ${
              tab === tb ? t.navActive : t.navInactive
            }`}
          >
            {tb === 'weekly' ? '📅 週間' : tb === 'monthly' ? '📆 月間' : '🏆 総合'}
            {tab === tb && <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${isDark ? 'bg-amber-400' : 'bg-green-600'}`} />}
          </button>
        ))}
      </div>

      {/* 自分の順位 */}
      <div className={`m-4 p-4 rounded-xl ${isDark ? 'bg-amber-500/10 border-amber-500' : 'bg-green-50 border-green-500'} border-2`}>
        <div className="flex items-center gap-3">
          <span className={`text-2xl font-black ${isDark ? 'text-amber-400' : 'text-green-600'}`}>#12</span>
          <div className="flex-1">
            <div className={`font-bold ${t.textPrimary}`}>あなたの順位</div>
            <div className={`text-xs ${t.textMuted}`}>正答率 76% / 234問回答</div>
          </div>
          <div className="text-right">
            <div className={`text-xs ${t.textMuted}`}>あと</div>
            <div className={`font-bold ${isDark ? 'text-amber-400' : 'text-green-600'}`}>+5問で11位</div>
          </div>
        </div>
      </div>

      {/* ランキングリスト */}
      <div className="px-4 space-y-2">
        {[
          { rank: 1, name: '血統の鬼', score: '98%', count: 312, badges: ['🧬', '🏆'] },
          { rank: 2, name: 'G1マスター', score: '95%', count: 289, badges: ['🏇', '👑'] },
          { rank: 3, name: '予想家タロウ', score: '92%', count: 256, badges: ['🔥'] },
          { rank: 4, name: '穴党マスター', score: '89%', count: 234, badges: [] },
          { rank: 5, name: '週末競馬師', score: '87%', count: 223, badges: [] },
        ].map((user) => (
          <div
            key={user.rank}
            className={`${t.bgCard} rounded-xl ${t.border} border p-3 flex items-center gap-3`}
          >
            <span className={`text-xl font-black w-8 text-center ${
              user.rank === 1 ? 'text-yellow-500' :
              user.rank === 2 ? 'text-gray-400' :
              user.rank === 3 ? 'text-amber-600' :
              t.textMuted
            }`}>
              {user.rank <= 3 ? ['🥇', '🥈', '🥉'][user.rank - 1] : user.rank}
            </span>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-xl">
              👤
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className={`font-bold ${t.textPrimary}`}>{user.name}</span>
                {user.badges.map((b, i) => (
                  <span key={i} className="text-sm">{b}</span>
                ))}
              </div>
              <div className={`text-xs ${t.textMuted}`}>{user.count}問回答</div>
            </div>
            <div className={`text-lg font-bold ${isDark ? 'text-amber-400' : 'text-green-600'}`}>
              {user.score}
            </div>
          </div>
        ))}
      </div>

      {/* カテゴリ別ランキング */}
      <div className="p-4">
        <h3 className={`text-sm font-bold mb-3 ${t.textPrimary}`}>🏅 カテゴリ別トップ</h3>
        <div className="grid grid-cols-2 gap-2">
          {[
            { cat: '🧬 血統', name: '血統の鬼', score: '98%' },
            { cat: '🏇 G1', name: 'G1マスター', score: '96%' },
            { cat: '👨‍✈️ 騎手', name: '騎手オタク', score: '94%' },
            { cat: '🏟️ コース', name: 'コース博士', score: '91%' },
          ].map((item) => (
            <div key={item.cat} className={`${t.bgCard} rounded-xl ${t.border} border p-3`}>
              <div className={`text-xs ${t.textMuted}`}>{item.cat}</div>
              <div className={`font-bold ${t.textPrimary} truncate`}>{item.name}</div>
              <div className={`text-sm ${isDark ? 'text-amber-400' : 'text-green-600'}`}>{item.score}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ========================================
// 7. 記事連動ページ
// ========================================
function ArticlePage({ t, isDark }) {
  return (
    <div className="pb-4">
      {/* 記事ヘッダー */}
      <div className={`${t.bgCard} p-4`}>
        <div className={`text-xs ${t.textMuted} mb-2`}>📚 馬券力向上コラム</div>
        <h1 className={`text-xl font-bold leading-tight ${t.textPrimary}`}>
          ディープインパクト産駒の<br />特徴と狙い方
        </h1>
        <div className={`flex items-center gap-3 mt-3 text-xs ${t.textMuted}`}>
          <span>2024.02.15</span>
          <span>|</span>
          <span>🧬 血統</span>
          <span>|</span>
          <span>👁 1,234</span>
        </div>
      </div>

      {/* 記事本文（抜粋） */}
      <div className="p-4 space-y-4">
        <div className={`${t.bgCard} rounded-2xl ${t.border} border p-4`}>
          <h2 className={`font-bold mb-2 ${t.textPrimary}`}>🏇 ディープインパクトとは</h2>
          <p className={`text-sm ${t.textSecondary} leading-relaxed`}>
            2005年に無敗で三冠を達成し、種牡馬としても大成功を収めた歴史的名馬。
            産駒はG1で通算50勝以上を挙げ、日本競馬史上最も成功した種牡馬の一頭です。
          </p>
        </div>

        <div className={`${t.bgCard} rounded-2xl ${t.border} border p-4`}>
          <h2 className={`font-bold mb-2 ${t.textPrimary}`}>📊 産駒の特徴</h2>
          <ul className={`text-sm ${t.textSecondary} space-y-2`}>
            <li>• 芝中距離（1600m〜2400m）に強い</li>
            <li>• 瞬発力に優れ、直線の長いコースで好成績</li>
            <li>• 牝馬の活躍が目立つ</li>
            <li>• 東京・阪神外回りで好走率UP</li>
          </ul>
        </div>

        {/* クイズ誘導（記事内埋め込み） */}
        <div className={`${isDark ? 'bg-gradient-to-br from-purple-900/30 to-pink-900/30' : 'bg-gradient-to-br from-purple-50 to-pink-50'} rounded-2xl p-4 border-2 ${isDark ? 'border-purple-500' : 'border-purple-300'}`}>
          <div className="flex items-center gap-3">
            <span className="text-3xl">🎯</span>
            <div className="flex-1">
              <div className={`font-bold ${t.textPrimary}`}>記事を読んだらチャレンジ！</div>
              <div className={`text-xs ${t.textMuted}`}>ディープ産駒クイズ 5問</div>
            </div>
          </div>
          <button className={`w-full mt-3 py-3 rounded-xl font-bold ${t.btnPrimary}`}>
            🎯 クイズに挑戦
          </button>
        </div>

        <div className={`${t.bgCard} rounded-2xl ${t.border} border p-4`}>
          <h2 className={`font-bold mb-2 ${t.textPrimary}`}>🏆 代表産駒</h2>
          <div className="space-y-3">
            {[
              { name: 'ジェンティルドンナ', wins: 'G1 7勝', desc: '牝馬三冠+JC2勝' },
              { name: 'コントレイル', wins: 'G1 5勝', desc: '無敗三冠馬' },
              { name: 'グランアレグリア', wins: 'G1 6勝', desc: '最強マイラー' },
            ].map((horse) => (
              <div key={horse.name} className={`flex items-center gap-3 p-2 rounded-lg ${isDark ? 'bg-slate-800' : 'bg-gray-50'}`}>
                <span className="text-2xl">🏇</span>
                <div className="flex-1">
                  <div className={`font-bold ${t.textPrimary}`}>{horse.name}</div>
                  <div className={`text-xs ${t.textMuted}`}>{horse.desc}</div>
                </div>
                <span className={`text-sm font-bold ${isDark ? 'text-amber-400' : 'text-green-600'}`}>{horse.wins}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 関連クイズ */}
        <div className={`${t.bgCard} rounded-2xl ${t.border} border overflow-hidden`}>
          <div className={`px-4 py-3 ${t.border} border-b`}>
            <h3 className={`text-sm font-bold ${t.textPrimary}`}>🎯 関連クイズ</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {[
              { name: '血統マスター検定', level: '上級', questions: 10 },
              { name: 'ディープ産駒クイズ', level: '中級', questions: 5 },
            ].map((quiz) => (
              <div key={quiz.name} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <div className={`font-bold ${t.textPrimary}`}>{quiz.name}</div>
                  <div className={`text-xs ${t.textMuted}`}>{quiz.level} / {quiz.questions}問</div>
                </div>
                <button className={`px-3 py-1.5 rounded-lg text-sm font-bold ${t.btnSecondary}`}>
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
          <div className="divide-y divide-gray-100">
            {[
              '血統で狙う東京芝2400m攻略法',
              'キタサンブラック産駒の特徴',
              '種牡馬リーディングの読み方',
            ].map((title) => (
              <div key={title} className={`px-4 py-3 flex items-center justify-between ${t.textSecondary}`}>
                <span className="text-sm">{title}</span>
                <span className={t.textMuted}>→</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
