// src/app/(main)/dojo/DojoClient.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useTheme } from "@/contexts/ThemeContext";
import {
  COURSE_DB,
  STAGE_DEFINITIONS,
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
  const [courseId, setCourseId] = useState("tokyo_turf_1600");
  const [activeTab, setActiveTab] = useState<"quiz" | "articles">("quiz");
  const [selectedArticleCat, setSelectedArticleCat] = useState<string>("all");

  // 進捗データから各種状態を計算
  const courseStates = buildCourseStates(progressRows);
  const stages = buildStageStates(progressRows, courseId);
  const course = COURSE_DB[courseId];
  const currentCourseState = courseStates.find((c) => c.id === courseId);

  const completed = stages.filter((s) => s.status === "complete").length;
  const totalStars = progressRows.reduce((a, r) => a + r.stars, 0);
  const totalCleared = progressRows.filter((r) => r.stars > 0).length;
  const correctRate =
    progressRows.length > 0
      ? Math.round(
          (progressRows.reduce((a, r) => a + r.best_score, 0) /
            progressRows.reduce(
              (a, r) =>
                a +
                (STAGE_DEFINITIONS.find((s) => s.id === r.stage_id)
                  ?.questions ?? 5),
              0
            )) *
            100
        ) || 0
      : 0;

  const currentTitle = getCurrentTitle(totalCleared);
  const nextTitle = getNextTitle(totalCleared);

  // 記事フィルタ
  const filteredArticles =
    selectedArticleCat === "all"
      ? articles
      : articles.filter((a) => a.categoryId === selectedArticleCat);
  const sortedArticleCategories = [...articleCategories].sort(
    (a, b) => a.order - b.order
  );

  // テーマスタイル
  const s = {
    card: isDark ? "bg-slate-900 border-slate-800" : "bg-white border-gray-200",
    text: isDark ? "text-slate-100" : "text-gray-900",
    sub: isDark ? "text-slate-400" : "text-gray-500",
    muted: isDark ? "text-slate-500" : "text-gray-400",
    accent: isDark ? "text-amber-400" : "text-green-600",
    accentBg: isDark ? "bg-amber-500 text-slate-900" : "bg-green-600 text-white",
    btn: isDark
      ? "bg-amber-500 text-slate-900 hover:bg-amber-400"
      : "bg-green-600 text-white hover:bg-green-700",
    btnSec: isDark
      ? "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
      : "bg-green-50 text-green-700 hover:bg-green-100",
    chip: isDark ? "bg-slate-800 text-slate-400" : "bg-gray-100 text-gray-500",
    chipOn: isDark ? "bg-amber-500 text-slate-900" : "bg-green-600 text-white",
    progBg: isDark ? "bg-slate-700" : "bg-gray-200",
    progFill: isDark ? "bg-amber-500" : "bg-green-500",
    tabOn: isDark ? "bg-slate-800 shadow-sm" : "bg-white shadow-sm",
    nodeDone: isDark
      ? "bg-amber-500 text-slate-900 border-amber-400"
      : "bg-green-500 text-white border-green-400",
    nodeCur: isDark
      ? "bg-slate-800 text-amber-300 border-amber-500 shadow-md"
      : "bg-white text-green-700 border-green-500 shadow-md",
    nodeLock: isDark
      ? "bg-slate-800 text-slate-600 border-slate-700"
      : "bg-gray-100 text-gray-400 border-gray-200",
    trackDone: isDark ? "bg-amber-500" : "bg-green-500",
    trackLine: isDark ? "bg-slate-700" : "bg-gray-300",
    sectionBg: isDark
      ? "bg-amber-500/15 text-amber-400"
      : "bg-green-50 text-green-700",
    sectionCur: isDark
      ? "bg-amber-500/25 text-amber-300 ring-1 ring-amber-500/50"
      : "bg-green-200 text-green-800 ring-1 ring-green-400",
    sectionDim: isDark ? "bg-slate-800 text-slate-500" : "bg-gray-100 text-gray-400",
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
          <div className="mb-3">
            <h1 className={`text-lg font-black ${s.text}`}>🥋 競馬道場</h1>
            <p className={`text-xs mt-0.5 ${s.muted}`}>
              クイズと記事で馬券力を鍛えよう
            </p>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              { value: `⭐ ${totalStars}`, label: "獲得スター", isAccent: true },
              { value: `${completed}/10`, label: "ステージ", isAccent: false },
              { value: `${correctRate}%`, label: "正答率", isAccent: false },
              { value: String(articleReadCount), label: "読了記事", isAccent: false },
            ].map((item, i) => (
              <div key={i}>
                <div className={`text-lg font-black ${item.isAccent ? s.accent : s.text}`}>
                  {item.value}
                </div>
                <div className={`text-[10px] ${s.muted}`}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ━━━ ② タブ切替 ━━━ */}
      <div className={`flex rounded-xl p-1 ${isDark ? "bg-slate-800" : "bg-gray-100"}`}>
        {(
          [
            { id: "quiz", label: "🎯 クイズ" },
            { id: "articles", label: "📖 記事" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2.5 rounded-lg text-center text-sm transition-all ${
              activeTab === tab.id
                ? `${s.tabOn} font-bold ${s.text}`
                : s.muted
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ━━━━━━━━ クイズタブ ━━━━━━━━ */}
      {activeTab === "quiz" && (
        <>
          {/* ③ コース選択チップ */}
          <div
            className="flex gap-2 overflow-x-auto pb-1"
            style={{ scrollbarWidth: "none" }}
          >
            {courseStates.map((c) => (
              <button
                key={c.id}
                onClick={() => setCourseId(c.id)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                  courseId === c.id ? s.chipOn : s.chip
                } ${
                  c.status === "locked" && courseId !== c.id ? "opacity-50" : ""
                }`}
              >
                {c.emoji} {c.name}
              </button>
            ))}
          </div>

          {/* ④ トラックマップ */}
          <TrackMap
            isDark={isDark}
            s={s}
            course={course}
            stages={stages}
            completed={completed}
          />

          {/* ⑤ ステージグリッド + 詳細 + CTA */}
          <StageGrid isDark={isDark} s={s} stages={stages} courseId={courseId} />

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

          {/* ⑦ ステージ関連おすすめ記事 */}
          <StageRelatedArticles
            isDark={isDark}
            s={s}
            stages={stages}
            articles={articles}
            quizCategories={quizCategories}
          />
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
                        isDark ? "hover:border-slate-600" : "hover:border-gray-300"
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
                        isDark ? "hover:border-slate-600" : "hover:border-gray-300"
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

      {/* ⑫ 全コース一覧 */}
      <div>
        <h2 className={`text-sm font-bold mb-2 ${s.text}`}>🗾 コース一覧</h2>
        <div className="space-y-2">
          {courseStates.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setCourseId(c.id);
                setActiveTab("quiz");
              }}
              className={`w-full text-left rounded-xl border p-3 flex items-center gap-3 transition-all ${s.card} ${
                c.status === "locked" && c.id !== courseId ? "opacity-50" : ""
              } ${
                courseId === c.id
                  ? `ring-2 ${isDark ? "ring-amber-500" : "ring-green-500"}`
                  : ""
              }`}
            >
              <span className="text-2xl">{c.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className={`font-bold text-sm ${s.text}`}>{c.name}</div>
                <div className={`text-[10px] ${s.muted}`}>
                  {c.direction === "left" ? "↺左" : "↻右"} • 直線
                  {c.straightLength}m • {c.famousRaces[0]}
                </div>
                {c.status === "playing" && (
                  <div className={`h-1.5 rounded-full mt-1.5 w-full ${s.progBg}`}>
                    <div
                      className={`h-full rounded-full ${s.progFill}`}
                      style={{ width: `${c.progress}%` }}
                    />
                  </div>
                )}
              </div>
              {c.status === "locked" ? (
                <span>🔒</span>
              ) : (
                <span className={`text-[10px] font-bold ${s.accent}`}>
                  {courseId === c.id ? "選択中" : c.status === "complete" ? "✅" : "挑戦中"}
                </span>
              )}
            </button>
          ))}
        </div>
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
            <div className={`font-bold ${s.text}`}>{currentTitle.name}</div>
            {nextTitle && (
              <>
                <div className={`text-[10px] ${s.muted}`}>
                  次: {nextTitle.emoji} {nextTitle.name}（{nextTitle.requirement}）
                </div>
                <div className={`h-1.5 rounded-full mt-1.5 ${s.progBg}`}>
                  <div
                    className={`h-full rounded-full ${s.progFill}`}
                    style={{
                      width: `${Math.min(100, (totalCleared / nextTitle.minStages) * 100)}%`,
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
// ④ トラックマップ
// ============================================================

function TrackMap({
  isDark,
  s,
  course,
  stages,
  completed,
}: {
  isDark: boolean;
  s: Record<string, string>;
  course: (typeof COURSE_DB)[string];
  stages: StageState[];
  completed: number;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const progress = completed / STAGE_DEFINITIONS.length;
  const sections = course.sections;
  const currentSectionIdx =
    stages.find((st) => st.status === "current")?.section ?? 0;

  useEffect(() => {
    if (scrollRef.current) {
      const curIdx = stages.findIndex((st) => st.status === "current");
      scrollRef.current.scrollLeft = Math.max(0, curIdx * 52 - 80);
    }
  }, [stages]);

  // セクションごとにグループ化
  const groups: { sectionIdx: number; label: string; stages: StageState[] }[] = [];
  let secIdx = -1;
  stages.forEach((stage) => {
    if (stage.section !== secIdx) {
      secIdx = stage.section;
      groups.push({
        sectionIdx: stage.section,
        label: sections[stage.section] || `S${stage.section}`,
        stages: [],
      });
    }
    groups[groups.length - 1].stages.push(stage);
  });

  return (
    <div className={`rounded-2xl border overflow-hidden ${s.card}`}>
      {/* コース情報バー */}
      <div
        className={`px-4 py-2.5 flex items-center justify-between border-b ${
          isDark ? "border-slate-800" : "border-gray-200"
        }`}
      >
        <div className="flex items-center gap-2">
          <span className={`text-xs font-black px-2 py-0.5 rounded ${s.sectionBg}`}>
            COURSE {course.courseNumber}
          </span>
          <span className={`text-sm font-bold ${s.text}`}>
            {course.emoji} {course.name}
          </span>
        </div>
        <span className={`text-[10px] ${s.muted}`}>
          {course.direction === "left" ? "↺左" : "↻右"} • {course.features}
        </span>
      </div>

      {/* ステージトラック */}
      <div
        ref={scrollRef}
        className="overflow-x-auto px-3 pt-4 pb-3"
        style={{ scrollBehavior: "smooth", scrollbarWidth: "none" }}
      >
        <div className="flex items-start gap-0 min-w-min">
          {groups.map((group, gi) => (
            <div key={gi} className="flex items-start">
              <div className="flex flex-col items-center">
                <div
                  className={`text-[9px] font-bold px-2 py-0.5 rounded-full mb-2.5 whitespace-nowrap ${
                    group.sectionIdx < currentSectionIdx
                      ? s.sectionBg
                      : group.sectionIdx === currentSectionIdx
                        ? s.sectionCur
                        : s.sectionDim
                  }`}
                >
                  {group.label}
                </div>
                <div className="flex items-center gap-0">
                  {group.stages.map((stage, si) => {
                    const cmp = stage.status === "complete";
                    const cur = stage.status === "current";
                    const lck = stage.status === "locked";
                    return (
                      <div key={stage.id} className="flex items-center">
                        <div
                          className={`w-10 h-10 rounded-xl border-2 flex flex-col items-center justify-center transition-all ${
                            cmp ? s.nodeDone : cur ? s.nodeCur : s.nodeLock
                          } ${cur ? "scale-110" : lck ? "opacity-55" : ""}`}
                        >
                          {lck ? (
                            <span className="text-sm">🔒</span>
                          ) : (
                            <>
                              <span className="text-[10px] font-black leading-none">
                                {stage.id}
                              </span>
                              {cmp && (
                                <div className="flex mt-0.5">
                                  {[1, 2, 3].map((st) => (
                                    <span
                                      key={st}
                                      style={{ fontSize: 6 }}
                                      className={
                                        st <= stage.stars
                                          ? "text-yellow-300"
                                          : "opacity-30"
                                      }
                                    >
                                      ★
                                    </span>
                                  ))}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                        {si < group.stages.length - 1 && (
                          <div
                            className={`w-3 h-0.5 ${
                              cmp &&
                              group.stages[si + 1]?.status === "complete"
                                ? s.trackDone
                                : s.trackLine
                            } opacity-60`}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              {gi < groups.length - 1 && (
                <div
                  className="flex flex-col items-center justify-end"
                  style={{ paddingTop: 28 }}
                >
                  <div
                    className={`w-5 h-0.5 mx-0.5 ${
                      group.stages.every((st) => st.status === "complete")
                        ? s.trackDone
                        : s.trackLine
                    } opacity-40`}
                  />
                </div>
              )}
            </div>
          ))}
          {/* BOSS */}
          <div className="flex flex-col items-center">
            <div
              className={`text-[9px] font-black px-2 py-0.5 rounded-full mb-2.5 whitespace-nowrap ${
                isDark ? "bg-red-500/20 text-red-400" : "bg-red-100 text-red-600"
              }`}
            >
              🏁 GOAL
            </div>
            <div className="flex items-center">
              <div className={`w-5 h-0.5 mx-0.5 ${s.trackLine} opacity-40`} />
              <div
                className={`w-12 h-12 rounded-xl border-2 flex flex-col items-center justify-center bg-gradient-to-b ${s.bossGrad}`}
              >
                <span className="text-lg">👹</span>
                <span
                  className={`text-[6px] font-black ${
                    isDark ? "text-red-400" : "text-red-500"
                  }`}
                >
                  BOSS
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* プログレスバー */}
      <div
        className={`px-4 py-2.5 border-t ${
          isDark ? "border-slate-800" : "border-gray-200"
        }`}
      >
        <div className="flex items-center gap-2">
          <span className={`text-[9px] font-bold ${s.muted}`}>🚩</span>
          <div
            className={`flex-1 h-2.5 rounded-full ${s.progBg} relative overflow-hidden`}
          >
            {[20, 40, 60, 80].map((p) => (
              <div
                key={p}
                className={`absolute top-0 h-full w-px ${
                  isDark ? "bg-slate-600" : "bg-gray-300"
                }`}
                style={{ left: `${p}%` }}
              />
            ))}
            <div
              className={`h-full rounded-full ${s.progFill} transition-all duration-700 relative`}
              style={{ width: `${progress * 100}%` }}
            >
              <span className="absolute -right-1.5 -top-0.5 text-xs">🐎</span>
            </div>
          </div>
          <span className={`text-[9px] font-bold ${s.muted}`}>🏁</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// ⑤ ステージグリッド + 詳細 + CTA統合
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
  const [selectedId, setSelectedId] = useState(
    stages.find((st) => st.status === "current")?.id || 1
  );
  const sel = stages.find((st) => st.id === selectedId);

  return (
    <div className={`rounded-2xl border overflow-hidden ${s.card}`}>
      <div
        className={`px-4 py-2.5 border-b ${
          isDark ? "border-slate-800" : "border-gray-200"
        }`}
      >
        <h3 className={`text-sm font-bold ${s.text}`}>📋 ステージ一覧</h3>
      </div>

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
                className={`flex flex-col items-center justify-center py-2 rounded-xl border-2 transition-all ${
                  cmp ? s.nodeDone : cur ? s.nodeCur : s.nodeLock
                } ${
                  isSel
                    ? `ring-2 ${isDark ? "ring-amber-400" : "ring-green-500"}`
                    : ""
                } ${lck ? "opacity-50" : "cursor-pointer"}`}
              >
                {lck ? (
                  <span className="text-base">🔒</span>
                ) : (
                  <>
                    <span className="text-[11px] font-black">{stage.id}</span>
                    {cmp && (
                      <div className="flex">
                        {[1, 2, 3].map((st) => (
                          <span
                            key={st}
                            style={{ fontSize: 7 }}
                            className={st <= stage.stars ? "" : "opacity-25"}
                          >
                            ⭐
                          </span>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </div>

        {/* BOSS行 */}
        <div className="mt-2">
          {stages.filter(st => st.status === "complete").length >= STAGE_DEFINITIONS.length ? (
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
                BOSS — 総まとめ検定（全範囲から出題・全{BOSS_QUESTIONS}問）
              </span>
              <span className={`text-xs font-bold ${isDark ? "text-red-400" : "text-red-600"}`}>挑戦 →</span>
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
                BOSS — 総まとめ検定（全範囲から出題・全{BOSS_QUESTIONS}問）
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
  );
}

// ============================================================
// ⑦ ステージ関連おすすめ記事
// ============================================================

function StageRelatedArticles({
  isDark,
  s,
  stages,
  articles,
  quizCategories,
}: {
  isDark: boolean;
  s: Record<string, string>;
  stages: StageState[];
  articles: ArticleData[];
  quizCategories: QuizCategoryData[];
}) {
  const current = stages.find((st) => st.status === "current");
  if (!current || articles.length === 0) return null;

  // 現在ステージに関連する記事（hasQuiz=trueを優先表示）
  const related = articles.filter((a) => a.hasQuiz).slice(0, 2);
  if (related.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className={`text-sm font-bold ${s.text}`}>
          📖 ステージ{current.id}の予習に
        </h3>
        <Link href="/dojo/articles" className={`text-[10px] ${s.accent}`}>
          すべて見る →
        </Link>
      </div>
      <div className="space-y-2">
        {related.map((a) => (
          <ArticleRow key={a.id} article={a} isDark={isDark} s={s} />
        ))}
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
