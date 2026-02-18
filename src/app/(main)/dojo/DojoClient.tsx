// src/app/(main)/dojo/DojoClient.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useTheme } from "@/contexts/ThemeContext";
import {
  CLUSTERS,
  CLUSTER_MAP,
  COURSES,
  COURSE_MAP,
  DEFAULT_STAGES,
  STAGE_COUNT,
  BOSS_QUESTIONS,
  ARTICLE_CATEGORY_GROUPS,
  buildStageStates,
  buildCourseStates,
  getCurrentTitle,
  getNextTitle,
  type StageState,
  type CourseState,
  type DojoProgressRow,
} from "@/lib/constants/dojo";

// ============================================================
// 型定義
// ============================================================

type QuizCategoryData = {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description: string;
  color: string;
  order: number;
  questionCount: number;
};

type ArticleCategoryData = {
  id: string;
  name: string;
  icon: string;
  order: number;
};

type ArticleData = {
  id: string;
  title: string;
  slug: string;
  emoji: string;
  excerpt: string;
  readTime: number;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  hasQuiz: boolean;
};

type Props = {
  userId: string;
  quizCategories: QuizCategoryData[];
  articles: ArticleData[];
  articleCategories: ArticleCategoryData[];
  progressRows: DojoProgressRow[];
  articleReadCount: number;
  dailyStreak: number;
  dailyCompleted: boolean;
};

// ============================================================
// メインコンポーネント
// ============================================================

export default function DojoClient({
  userId,
  quizCategories,
  articles,
  articleCategories,
  progressRows,
  articleReadCount,
  dailyStreak,
  dailyCompleted,
}: Props) {
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<"quiz" | "articles">("quiz");
  const [selectedCluster, setSelectedCluster] = useState("beginner");
  const [selectedCourse, setSelectedCourse] = useState("beginner_first");
  const [showAllClusters, setShowAllClusters] = useState(false);

  // 進捗データから各種状態を計算
  const allCourseStates = buildCourseStates(progressRows);
  const clusterCourses = allCourseStates.filter(
    (c) => c.clusterId === selectedCluster
  );
  const currentCourseState = allCourseStates.find(
    (c) => c.id === selectedCourse
  );
  const stages = buildStageStates(progressRows, selectedCourse);

  // 統計
  const totalStars = progressRows.reduce((a, r) => a + r.stars, 0);
  const totalCleared = allCourseStates.filter(
    (c) => c.status === "complete"
  ).length;
  const totalStagesCleared = progressRows.filter((r) => r.stars > 0).length;

  const currentTitle = getCurrentTitle(totalCleared);
  const nextTitle = getNextTitle(totalCleared);

  // 記事
  const sortedArticleCategories = [...articleCategories].sort(
    (a, b) => a.order - b.order
  );

  // クラスター変更時にコースをリセット
  const handleClusterChange = (clusterId: string) => {
    setSelectedCluster(clusterId);
    const first = COURSES.find((c) => c.clusterId === clusterId);
    if (first) setSelectedCourse(first.id);
  };

  // テーマスタイル
  const s = {
    card: isDark
      ? "bg-slate-900 border-slate-800"
      : "bg-white border-gray-200",
    text: isDark ? "text-slate-100" : "text-gray-900",
    sub: isDark ? "text-slate-400" : "text-gray-500",
    muted: isDark ? "text-slate-500" : "text-gray-400",
    accent: isDark ? "text-amber-400" : "text-green-600",
    accentBg: isDark ? "bg-amber-500" : "bg-green-500",
    btn: isDark
      ? "bg-amber-500 text-slate-900 hover:bg-amber-400"
      : "bg-green-600 text-white hover:bg-green-700",
    btnSec: isDark
      ? "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
      : "bg-green-50 text-green-700 hover:bg-green-100",
    chip: isDark
      ? "border-slate-700 text-slate-400 hover:border-slate-500"
      : "border-gray-200 text-gray-500 hover:border-gray-400",
    chipOn: isDark
      ? "bg-amber-500/20 border-amber-500/50 text-amber-400"
      : "bg-green-50 border-green-500 text-green-700",
    progBg: isDark ? "bg-slate-700" : "bg-gray-200",
    progFill: isDark ? "bg-amber-500" : "bg-green-500",
    tabOn: isDark
      ? "text-amber-400 border-amber-500"
      : "text-green-700 border-green-600",
    tabOff: isDark
      ? "text-slate-500 hover:text-slate-300"
      : "text-gray-400 hover:text-gray-600",
    nodeDone: isDark
      ? "bg-amber-500/20 border-amber-500/50"
      : "bg-green-50 border-green-400",
    nodeCur: isDark
      ? "bg-slate-800 border-amber-500 ring-1 ring-amber-500/30"
      : "bg-white border-green-500 ring-1 ring-green-400/30",
    nodeLock: isDark
      ? "bg-slate-800/50 border-slate-700"
      : "bg-gray-50 border-gray-200",
    bossGrad: isDark
      ? "from-red-950/50 to-orange-950/30 border-red-700"
      : "from-red-50 to-orange-50 border-red-300",
    quizTag: isDark
      ? "bg-amber-500/20 text-amber-400"
      : "bg-amber-100 text-amber-700",
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-8">
      {/* ━━━ ① 道場ヘッダー ━━━ */}
      <div className={`rounded-2xl border overflow-hidden ${s.card}`}>
        <div
          className={`p-4 ${
            isDark
              ? "bg-gradient-to-r from-amber-900/20 to-orange-900/10"
              : "bg-gradient-to-r from-green-50 to-emerald-50"
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <h1 className={`text-lg font-black ${s.text}`}>🥋 競馬道場</h1>
            <Link
              href="/dojo/ranking"
              className={`text-xs font-bold ${s.accent}`}
            >
              🏆 ランキング →
            </Link>
          </div>

          {/* 4統計 */}
          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              { value: `⭐ ${totalStars}`, label: "獲得スター" },
              {
                value: `${totalCleared}/${COURSES.length}`,
                label: "コース完了",
              },
              { value: String(totalStagesCleared), label: "ステージ" },
              { value: String(articleReadCount), label: "読了記事" },
            ].map((item, i) => (
              <div key={i}>
                <div
                  className={`text-lg font-black ${
                    i === 0 ? s.accent : s.text
                  }`}
                >
                  {item.value}
                </div>
                <div className={`text-[10px] ${s.muted}`}>{item.label}</div>
              </div>
            ))}
          </div>

          {/* 称号プログレス */}
          <div className="mt-3">
            <div className="flex justify-between text-[10px] mb-1">
              <span className={s.sub}>
                {currentTitle.emoji} {currentTitle.name}
              </span>
              {nextTitle && (
                <span className={s.muted}>
                  次: {nextTitle.emoji} {nextTitle.name}（あと
                  {nextTitle.minCourses - totalCleared}コース）
                </span>
              )}
            </div>
            {nextTitle && (
              <div className={`h-1.5 rounded-full ${s.progBg}`}>
                <div
                  className={`h-full rounded-full ${s.progFill}`}
                  style={{
                    width: `${Math.min(
                      100,
                      (totalCleared / nextTitle.minCourses) * 100
                    )}%`,
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ━━━ ② タブ切替 ━━━ */}
      <div
        className={`flex border-b ${
          isDark ? "border-slate-800" : "border-gray-200"
        }`}
      >
        {(
          [
            { id: "quiz", label: "🎯 クイズ" },
            { id: "articles", label: "📖 記事" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2.5 text-sm font-bold text-center transition-colors border-b-2 ${
              activeTab === tab.id
                ? s.tabOn
                : `${s.tabOff} border-transparent`
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ━━━━━━━━ クイズタブ ━━━━━━━━ */}
      {activeTab === "quiz" && (
        <>
          {/* ③ クラスター選択 */}
          <div>
            <div className={`text-xs font-bold mb-2 ${s.sub}`}>
              📚 カテゴリを選ぶ
            </div>
            <div
              className="flex gap-2 overflow-x-auto pb-2"
              style={{ scrollbarWidth: "none" }}
            >
              {CLUSTERS.map((cl) => {
                const clCourses = allCourseStates.filter(
                  (c) => c.clusterId === cl.id
                );
                const clCompleted = clCourses.filter(
                  (c) => c.status === "complete"
                ).length;
                return (
                  <button
                    key={cl.id}
                    onClick={() => handleClusterChange(cl.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border transition-all shrink-0 ${
                      selectedCluster === cl.id ? s.chipOn : s.chip
                    }`}
                  >
                    <span>{cl.emoji}</span>
                    <span>{cl.name}</span>
                    {clCompleted > 0 && (
                      <span className={`text-[10px] ${s.accent}`}>
                        {clCompleted}/{clCourses.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ③b コース選択チップ */}
          <div>
            <div className={`text-xs font-bold mb-2 ${s.sub}`}>
              {CLUSTER_MAP[selectedCluster]?.emoji}{" "}
              {CLUSTER_MAP[selectedCluster]?.name} のコース
            </div>
            <div
              className="flex gap-2 overflow-x-auto pb-1"
              style={{ scrollbarWidth: "none" }}
            >
              {clusterCourses.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCourse(c.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap border transition-all shrink-0 ${
                    selectedCourse === c.id ? s.chipOn : s.chip
                  }`}
                >
                  <span>{c.emoji}</span>
                  <span>{c.name}</span>
                  {c.status === "complete" && <span>✅</span>}
                  {c.status === "playing" && c.progress > 0 && (
                    <span className={`text-[10px] ${s.accent}`}>
                      {c.progress}%
                    </span>
                  )}
                  <span className={`text-[10px] ${s.muted}`}>
                    {"★".repeat(c.difficulty)}
                    {"☆".repeat(3 - c.difficulty)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* ④ コース進捗バー */}
          {currentCourseState && (
            <div className={`rounded-xl border p-3 ${s.card}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{currentCourseState.emoji}</span>
                  <span className={`text-sm font-bold ${s.text}`}>
                    {currentCourseState.name}
                  </span>
                </div>
                <span className={`text-xs font-bold ${s.accent}`}>
                  {currentCourseState.completedStages}/{STAGE_COUNT} ステージ
                </span>
              </div>
              <div className={`h-2 rounded-full ${s.progBg}`}>
                <div
                  className={`h-full rounded-full ${s.progFill} transition-all`}
                  style={{ width: `${currentCourseState.progress}%` }}
                />
              </div>
              <div className={`text-[10px] mt-1.5 ${s.muted}`}>
                {COURSE_MAP[selectedCourse]?.description}
              </div>
            </div>
          )}

          {/* ⑤ ステージグリッド */}
          <StageGrid
            isDark={isDark}
            s={s}
            stages={stages}
            courseId={selectedCourse}
          />

          {/* ⑥ デイリーチャレンジ */}
          <div
            className={`rounded-2xl border p-4 ${
              isDark
                ? "bg-gradient-to-br from-purple-900/15 to-blue-900/15 border-purple-500/30"
                : "bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">🔥</span>
                <div>
                  <div className={`font-bold text-sm ${s.text}`}>
                    今日のチャレンジ
                  </div>
                  <div className={`text-[10px] ${s.muted}`}>
                    🔥{dailyStreak}日連続！{" "}
                    {dailyCompleted ? "✅ 完了" : "ボーナス+10P"}
                  </div>
                </div>
              </div>
              <Link
                href="/dojo/daily"
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                  dailyCompleted ? s.btnSec : s.btn
                }`}
              >
                {dailyCompleted ? "結果を見る" : "挑戦 →"}
              </Link>
            </div>
          </div>

          {/* ⑦ おすすめ記事 */}
          {articles.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className={`text-sm font-bold ${s.text}`}>
                  📖 おすすめ記事
                </h3>
                <Link
                  href="/dojo/articles"
                  className={`text-[10px] ${s.accent}`}
                >
                  すべて見る →
                </Link>
              </div>
              <div className="space-y-2">
                {articles
                  .filter((a) => a.hasQuiz)
                  .slice(0, 2)
                  .map((a) => (
                    <ArticleRow key={a.id} article={a} isDark={isDark} s={s} />
                  ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ━━━━━━━━ 記事タブ ━━━━━━━━ */}
      {activeTab === "articles" && (
        <>
          {/* ⑧ あなたへのおすすめ記事 */}
          {articles.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className={`text-sm font-bold ${s.text}`}>
                  📚 あなたへのおすすめ
                </h2>
                <Link
                  href="/dojo/articles"
                  className={`text-[10px] ${s.accent}`}
                >
                  すべて見る →
                </Link>
              </div>
              <div className="space-y-2">
                {articles.slice(0, 3).map((a) => (
                  <ArticleRow key={a.id} article={a} isDark={isDark} s={s} />
                ))}
              </div>
            </div>
          )}

          {/* ⑨ 人気記事ランキング */}
          {articles.length > 0 && (
            <div className={`rounded-2xl border overflow-hidden ${s.card}`}>
              <div
                className={`px-4 py-3 border-b flex items-center justify-between ${
                  isDark ? "border-slate-800" : "border-gray-200"
                }`}
              >
                <h2 className={`text-sm font-bold ${s.text}`}>
                  🔥 人気記事ランキング
                </h2>
                <Link
                  href="/dojo/articles"
                  className={`text-[10px] ${s.accent}`}
                >
                  もっと見る →
                </Link>
              </div>
              {articles.slice(0, 5).map((article, i) => (
                <Link
                  key={article.id}
                  href={`/dojo/articles/${article.id}`}
                  className={`px-4 py-3 flex items-center gap-3 border-b last:border-b-0 transition-colors ${
                    isDark
                      ? "border-slate-800 hover:bg-slate-800/50"
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <span
                    className={`text-lg font-black w-7 text-center ${
                      i === 0
                        ? "text-yellow-500"
                        : i === 1
                          ? "text-gray-400"
                          : i === 2
                            ? "text-amber-600"
                            : s.muted
                    }`}
                  >
                    {i < 3 ? ["🥇", "🥈", "🥉"][i] : i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className={`font-medium text-sm truncate ${s.text}`}>
                      {article.title}
                    </div>
                    <div className={`text-[10px] ${s.muted}`}>
                      {article.categoryIcon} {article.categoryName}
                      {article.readTime ? ` • ⏱ ${article.readTime}分` : ""}
                    </div>
                  </div>
                  <span className={s.muted}>→</span>
                </Link>
              ))}
            </div>
          )}

          {/* ⑩ カテゴリから探す */}
          <div>
            <h2 className={`text-sm font-bold mb-3 ${s.text}`}>
              📂 カテゴリから探す
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {sortedArticleCategories.length > 0
                ? sortedArticleCategories.map((cat) => (
                    <Link
                      key={cat.id}
                      href={`/dojo/articles?category=${cat.id}`}
                      className={`rounded-xl border p-4 relative overflow-hidden transition-colors ${s.card} ${
                        isDark
                          ? "hover:border-slate-600"
                          : "hover:border-gray-300"
                      }`}
                    >
                      <span className="text-3xl">{cat.icon}</span>
                      <div className={`font-bold mt-2 ${s.text}`}>
                        {cat.name}
                      </div>
                    </Link>
                  ))
                : ARTICLE_CATEGORY_GROUPS.map((group) => (
                    <Link
                      key={group.name}
                      href="/dojo/articles"
                      className={`rounded-xl border p-4 relative overflow-hidden transition-colors ${s.card} ${
                        isDark
                          ? "hover:border-slate-600"
                          : "hover:border-gray-300"
                      }`}
                    >
                      <span className="text-3xl">{group.icon}</span>
                      <div className={`font-bold mt-2 ${s.text}`}>
                        {group.name}
                      </div>
                      <div className={`text-xs mt-1 ${s.muted}`}>
                        {group.desc}
                      </div>
                    </Link>
                  ))}
            </div>
          </div>

          {/* ⑪ 新着記事 */}
          {articles.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className={`text-sm font-bold ${s.text}`}>🆕 新着記事</h2>
                <Link
                  href="/dojo/articles"
                  className={`text-[10px] ${s.accent}`}
                >
                  すべて見る →
                </Link>
              </div>
              <div className="space-y-2">
                {articles.slice(0, 3).map((a) => (
                  <ArticleRow key={a.id} article={a} isDark={isDark} s={s} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ━━━━━━━━ 共通セクション ━━━━━━━━ */}

      {/* ⑫ 全コース一覧（クラスター別） */}
      <div>
        <h2 className={`text-sm font-bold mb-3 ${s.text}`}>
          📚 全コース一覧
        </h2>
        {(showAllClusters ? CLUSTERS : CLUSTERS.slice(0, 5)).map((cl) => {
          const clCourses = allCourseStates.filter(
            (c) => c.clusterId === cl.id
          );
          const clCompleted = clCourses.filter(
            (c) => c.status === "complete"
          ).length;
          return (
            <div key={cl.id} className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-bold ${s.text}`}>
                  {cl.emoji} {cl.name}
                </span>
                <span className={`text-[10px] ${s.muted}`}>
                  {clCompleted}/{clCourses.length} コース完了
                </span>
              </div>
              <div className="space-y-1">
                {clCourses.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setSelectedCluster(cl.id);
                      setSelectedCourse(c.id);
                      setActiveTab("quiz");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-all ${
                      c.status === "complete"
                        ? isDark
                          ? "border-amber-500/30 bg-amber-500/10"
                          : "border-green-400/50 bg-green-50"
                        : isDark
                          ? "border-slate-700 hover:border-slate-500"
                          : "border-gray-200 hover:border-gray-400"
                    } ${c.status === "locked" ? "opacity-40" : ""}`}
                  >
                    <span>{c.emoji}</span>
                    <span className={`text-xs font-bold flex-1 ${s.text}`}>
                      {c.name}
                    </span>
                    <div className="w-16">
                      <div className={`h-1.5 rounded-full ${s.progBg}`}>
                        <div
                          className={`h-full rounded-full ${
                            c.status === "complete"
                              ? isDark
                                ? "bg-green-500"
                                : "bg-green-500"
                              : s.progFill
                          }`}
                          style={{ width: `${c.progress}%` }}
                        />
                      </div>
                    </div>
                    <span className={`text-[10px] w-8 text-right ${s.muted}`}>
                      {c.status === "locked" ? "🔒" : `${c.progress}%`}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
        {!showAllClusters && (
          <button
            onClick={() => setShowAllClusters(true)}
            className={`w-full py-2 text-xs font-bold ${s.accent} text-center`}
          >
            全{CLUSTERS.length}カテゴリを見る ▼
          </button>
        )}
      </div>

      {/* ⑬ 称号 */}
      <div className={`rounded-2xl border p-4 ${s.card}`}>
        <h2 className={`font-bold mb-3 ${s.text}`}>🏅 あなたの称号</h2>
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
              isDark ? "bg-slate-800" : "bg-gray-100"
            }`}
          >
            {currentTitle.emoji}
          </div>
          <div className="flex-1">
            <div className={`font-bold ${s.accent}`}>{currentTitle.name}</div>
            {nextTitle && (
              <>
                <div className={`text-[10px] ${s.muted}`}>
                  次: {nextTitle.emoji} {nextTitle.name}（
                  {nextTitle.requirement}）
                </div>
                <div className={`h-1.5 rounded-full mt-1.5 ${s.progBg}`}>
                  <div
                    className={`h-full rounded-full ${s.progFill}`}
                    style={{
                      width: `${Math.min(
                        100,
                        (totalCleared / nextTitle.minCourses) * 100
                      )}%`,
                    }}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// ⑤ ステージグリッド
// ============================================================

function StageGrid({
  isDark,
  s,
  stages,
  courseId,
}: {
  isDark: boolean;
  s: Record<string, string>;
  stages: StageState[];
  courseId: string;
}) {
  const [selectedId, setSelectedId] = useState<number | null>(
    stages.find((st) => st.status === "current")?.id ?? null
  );
  const sel = stages.find((st) => st.id === selectedId);

  // コース変更時にcurrentステージを選択
  useEffect(() => {
    const cur = stages.find((st) => st.status === "current");
    setSelectedId(cur?.id ?? null);
  }, [courseId]);

  return (
    <div>
      <div className={`text-xs font-bold mb-2 ${s.sub}`}>🎯 ステージ</div>
      <div className={`rounded-2xl border overflow-hidden ${s.card}`}>
        <div className="px-3 py-3">
          <div className="grid grid-cols-5 gap-2">
            {stages.map((stage) => {
              const cmp = stage.status === "complete";
              const cur = stage.status === "current";
              const lck = stage.status === "locked";
              const isSel = stage.id === selectedId;
              return (
                <button
                  key={stage.id}
                  onClick={() => !lck && setSelectedId(stage.id)}
                  className={`relative aspect-square rounded-xl border flex flex-col items-center justify-center transition-all ${
                    cmp ? s.nodeDone : cur ? s.nodeCur : s.nodeLock
                  } ${
                    isSel
                      ? `ring-2 ${
                          isDark ? "ring-amber-400" : "ring-green-500"
                        }`
                      : ""
                  } ${lck ? "opacity-40" : "cursor-pointer"}`}
                >
                  <span
                    className={`text-sm font-black ${
                      cmp ? s.accent : cur ? s.text : s.muted
                    }`}
                  >
                    {lck ? "🔒" : stage.id}
                  </span>
                  <div className="text-[8px] mt-0.5">
                    {cmp && "⭐".repeat(stage.stars)}
                    {cur && "🏇"}
                  </div>
                </button>
              );
            })}
          </div>

          {/* BOSS行 */}
          <div className="mt-2">
            {stages.filter((st) => st.status === "complete").length >=
            STAGE_COUNT ? (
              <Link
                href={`/dojo/stage/${courseId}/boss`}
                className={`w-full py-2.5 rounded-xl border-2 flex items-center justify-center gap-2 bg-gradient-to-r ${s.bossGrad} hover:opacity-90 transition-opacity`}
              >
                <span className="text-lg">👹</span>
                <span
                  className={`text-xs font-black ${
                    isDark ? "text-red-400" : "text-red-500"
                  }`}
                >
                  BOSS — 総まとめ検定（全{BOSS_QUESTIONS}問）
                </span>
                <span
                  className={`text-xs font-bold ${
                    isDark ? "text-red-400" : "text-red-600"
                  }`}
                >
                  挑戦 →
                </span>
              </Link>
            ) : (
              <div
                className={`w-full py-2.5 rounded-xl border-2 flex items-center justify-center gap-2 bg-gradient-to-r ${s.bossGrad} opacity-50`}
              >
                <span className="text-lg">👹</span>
                <span
                  className={`text-xs font-black ${
                    isDark ? "text-red-400" : "text-red-500"
                  }`}
                >
                  BOSS — 総まとめ検定（全{BOSS_QUESTIONS}問）
                </span>
                <span>🔒</span>
              </div>
            )}
          </div>
        </div>

        {/* 選択ステージ詳細 + CTA */}
        {sel && (
          <div
            className={`px-4 py-3 border-t ${
              isDark ? "border-slate-800" : "border-gray-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className={`text-[10px] font-bold ${s.muted}`}>
                  STAGE {sel.id}
                  {sel.status === "complete" && (
                    <span className="ml-1">{"⭐".repeat(sel.stars)}</span>
                  )}
                </div>
                <div className={`font-bold mt-0.5 ${s.text}`}>{sel.topic}</div>
                <div className={`text-[10px] ${s.muted}`}>
                  全{sel.questions}問 • 7問正解で★1 • 9問で★2 • 全問正解で★3
                </div>
              </div>
              {sel.status === "complete" ? (
                <Link
                  href={`/dojo/stage/${courseId}/${sel.id}`}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${s.btnSec}`}
                >
                  再挑戦
                </Link>
              ) : sel.status === "current" ? (
                <Link
                  href={`/dojo/stage/${courseId}/${sel.id}`}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${s.btn}`}
                >
                  挑戦 →
                </Link>
              ) : (
                <span className={`text-xs ${s.muted}`}>🔒</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// 共通: 記事行コンポーネント
// ============================================================

function ArticleRow({
  article,
  isDark,
  s,
}: {
  article: ArticleData;
  isDark: boolean;
  s: Record<string, string>;
}) {
  return (
    <Link
      href={`/dojo/articles/${article.id}`}
      className={`rounded-xl border p-3 flex items-center gap-3 transition-colors ${s.card} ${
        isDark ? "hover:bg-slate-800/70" : "hover:bg-gray-50"
      }`}
    >
      <div
        className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0 ${
          isDark ? "bg-slate-800" : "bg-gray-100"
        }`}
      >
        {article.emoji || article.categoryIcon || "📄"}
      </div>
      <div className="flex-1 min-w-0">
        <div className={`font-bold text-sm truncate ${s.text}`}>
          {article.title}
        </div>
        <div className={`text-[10px] ${s.muted} flex gap-2 mt-0.5`}>
          {article.readTime > 0 && <span>⏱ {article.readTime}分</span>}
          {article.hasQuiz && (
            <span className={`px-1 py-0.5 rounded ${s.quizTag}`}>
              🎯 クイズ付
            </span>
          )}
        </div>
      </div>
      <span className={s.muted}>→</span>
    </Link>
  );
}
