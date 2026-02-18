// src/lib/constants/dojo.ts
// ============================================================
// 🥋 道場 — 50コース × 10ステージの定数定義
// ============================================================

// --- クラスター（大カテゴリ）---
export type Cluster = {
  id: string;
  name: string;
  emoji: string;
  description: string;
  color: string; // Tailwind color key
  order: number;
};

export const CLUSTERS: Cluster[] = [
  { id: "beginner", name: "初心者入門", emoji: "🔰", description: "競馬の基礎を学ぼう", color: "green", order: 1 },
  { id: "ticket", name: "馬券・予想理論", emoji: "🎫", description: "馬券の種類と予想法", color: "blue", order: 2 },
  { id: "blood", name: "血統", emoji: "🧬", description: "血統の基礎から応用まで", color: "purple", order: 3 },
  { id: "course", name: "コース攻略", emoji: "🏟️", description: "コース特性を理解する", color: "orange", order: 4 },
  { id: "jockey", name: "騎手", emoji: "🏇", description: "騎手の特徴と戦略", color: "red", order: 5 },
  { id: "training", name: "調教・厩舎", emoji: "🏋️", description: "調教の見方と厩舎研究", color: "teal", order: 6 },
  { id: "history", name: "名馬・歴史", emoji: "👑", description: "名馬と競馬の歴史", color: "yellow", order: 7 },
  { id: "venue", name: "競馬場ガイド", emoji: "🎪", description: "競馬場の楽しみ方", color: "pink", order: 8 },
  { id: "roi", name: "馬券術・回収率", emoji: "💰", description: "回収率を上げる馬券術", color: "emerald", order: 9 },
  { id: "data", name: "データ分析", emoji: "📊", description: "データで競馬を攻略", color: "cyan", order: 10 },
  { id: "local", name: "地方競馬", emoji: "🐴", description: "地方競馬の魅力", color: "amber", order: 11 },
  { id: "overseas", name: "海外競馬", emoji: "🌍", description: "世界の競馬を知る", color: "indigo", order: 12 },
  { id: "pog", name: "POG・一口馬主", emoji: "📋", description: "馬主体験を楽しむ", color: "lime", order: 13 },
  { id: "media", name: "競馬メディア活用", emoji: "📰", description: "情報収集のプロになる", color: "slate", order: 14 },
  { id: "umamusume", name: "ウマ娘→リアル競馬", emoji: "🎮", description: "ウマ娘から実際の競馬へ", color: "fuchsia", order: 15 },
];

export const CLUSTER_MAP = Object.fromEntries(
  CLUSTERS.map((c) => [c.id, c])
);

// --- コースデータ ---
export type Course = {
  id: string;
  clusterId: string;
  name: string;
  description: string;
  emoji: string;
  courseNumber: number; // クラスター内の順序
  difficulty: 1 | 2 | 3; // 1=入門 2=中級 3=上級
};

export const COURSES: Course[] = [
  // ─── 初心者入門（3コース）───
  { id: "beginner_first", clusterId: "beginner", name: "はじめての競馬", description: "ルール・マナー・基礎知識", emoji: "🔰", courseNumber: 1, difficulty: 1 },
  { id: "beginner_watching", clusterId: "beginner", name: "競馬観戦入門", description: "パドック・レース・返し馬の見方", emoji: "👀", courseNumber: 2, difficulty: 1 },
  { id: "beginner_betting", clusterId: "beginner", name: "はじめての馬券", description: "馬券の買い方・オッズ・的中", emoji: "🎯", courseNumber: 3, difficulty: 1 },

  // ─── 馬券・予想理論（5コース）───
  { id: "ticket_basics", clusterId: "ticket", name: "馬券の基礎", description: "単勝・複勝・枠連を学ぶ", emoji: "🎫", courseNumber: 1, difficulty: 1 },
  { id: "ticket_types", clusterId: "ticket", name: "馬券種別マスター", description: "馬連・ワイド・三連複・三連単", emoji: "🎰", courseNumber: 2, difficulty: 2 },
  { id: "ticket_odds", clusterId: "ticket", name: "オッズの読み方", description: "オッズの仕組みと活用法", emoji: "📈", courseNumber: 3, difficulty: 2 },
  { id: "ticket_strategy", clusterId: "ticket", name: "予想の組み立て方", description: "軸馬・相手馬・買い目の作り方", emoji: "🧩", courseNumber: 4, difficulty: 2 },
  { id: "ticket_advanced", clusterId: "ticket", name: "上級予想理論", description: "期待値・回収率・資金配分", emoji: "🎓", courseNumber: 5, difficulty: 3 },

  // ─── 血統（4コース）───
  { id: "blood_basics", clusterId: "blood", name: "血統入門", description: "父系・母系の基本を学ぶ", emoji: "🧬", courseNumber: 1, difficulty: 1 },
  { id: "blood_sire", clusterId: "blood", name: "種牡馬研究", description: "主要種牡馬の特徴と産駒傾向", emoji: "🐎", courseNumber: 2, difficulty: 2 },
  { id: "blood_broodmare", clusterId: "blood", name: "母系研究", description: "母父・牝系・ファミリーライン", emoji: "🌸", courseNumber: 3, difficulty: 2 },
  { id: "blood_advanced", clusterId: "blood", name: "血統上級", description: "ニックス・配合理論・海外血統", emoji: "🔬", courseNumber: 4, difficulty: 3 },

  // ─── コース攻略（5コース）───
  { id: "course_tokyo", clusterId: "course", name: "東京競馬場攻略", description: "府中の長い直線を制する", emoji: "🏟️", courseNumber: 1, difficulty: 2 },
  { id: "course_nakayama", clusterId: "course", name: "中山競馬場攻略", description: "急坂と小回りの攻略法", emoji: "⛰️", courseNumber: 2, difficulty: 2 },
  { id: "course_kyoto", clusterId: "course", name: "京都競馬場攻略", description: "淀の坂と名レースの舞台", emoji: "⛩️", courseNumber: 3, difficulty: 2 },
  { id: "course_hanshin", clusterId: "course", name: "阪神競馬場攻略", description: "内回り外回りを使い分ける", emoji: "🌊", courseNumber: 4, difficulty: 2 },
  { id: "course_local", clusterId: "course", name: "ローカル競馬場", description: "新潟・中京・小倉・札幌・函館", emoji: "🗾", courseNumber: 5, difficulty: 2 },

  // ─── 騎手（3コース）───
  { id: "jockey_basics", clusterId: "jockey", name: "騎手の基礎知識", description: "騎手の役割と影響力", emoji: "🏇", courseNumber: 1, difficulty: 1 },
  { id: "jockey_data", clusterId: "jockey", name: "騎手データ分析", description: "リーディング・コース別成績", emoji: "📊", courseNumber: 2, difficulty: 2 },
  { id: "jockey_strategy", clusterId: "jockey", name: "騎乗戦略", description: "逃げ・先行・差し・追込の戦術", emoji: "♟️", courseNumber: 3, difficulty: 3 },

  // ─── 調教・厩舎（3コース）───
  { id: "training_basics", clusterId: "training", name: "調教の見方", description: "調教タイムの基本", emoji: "🏋️", courseNumber: 1, difficulty: 1 },
  { id: "training_analysis", clusterId: "training", name: "調教分析", description: "坂路・ウッド・CWの違い", emoji: "📹", courseNumber: 2, difficulty: 2 },
  { id: "stable_guide", clusterId: "training", name: "厩舎研究", description: "有力厩舎と仕上げパターン", emoji: "🏠", courseNumber: 3, difficulty: 2 },

  // ─── 名馬・歴史（4コース）───
  { id: "history_classics", clusterId: "history", name: "クラシック名勝負", description: "三冠レースの歴史", emoji: "🏆", courseNumber: 1, difficulty: 1 },
  { id: "history_champions", clusterId: "history", name: "伝説の名馬たち", description: "記憶に残る名馬の物語", emoji: "👑", courseNumber: 2, difficulty: 1 },
  { id: "history_records", clusterId: "history", name: "競馬の記録", description: "レコードと偉業の数々", emoji: "📜", courseNumber: 3, difficulty: 2 },
  { id: "history_modern", clusterId: "history", name: "現代競馬史", description: "2000年代以降の名勝負", emoji: "🎬", courseNumber: 4, difficulty: 2 },

  // ─── 競馬場ガイド（5コース）───
  { id: "venue_kanto", clusterId: "venue", name: "関東の競馬場", description: "東京・中山・大井・川崎", emoji: "🗼", courseNumber: 1, difficulty: 1 },
  { id: "venue_kansai", clusterId: "venue", name: "関西の競馬場", description: "阪神・京都・園田・姫路", emoji: "🏯", courseNumber: 2, difficulty: 1 },
  { id: "venue_local_east", clusterId: "venue", name: "東日本ローカル", description: "新潟・札幌・函館・門別・盛岡", emoji: "🌾", courseNumber: 3, difficulty: 1 },
  { id: "venue_local_west", clusterId: "venue", name: "西日本ローカル", description: "小倉・中京・高知・佐賀・笠松", emoji: "🌅", courseNumber: 4, difficulty: 1 },
  { id: "venue_facilities", clusterId: "venue", name: "競馬場の楽しみ方", description: "グルメ・施設・イベント", emoji: "🍜", courseNumber: 5, difficulty: 1 },

  // ─── 馬券術・回収率（3コース）───
  { id: "roi_basics", clusterId: "roi", name: "回収率の基本", description: "プラス収支の考え方", emoji: "💰", courseNumber: 1, difficulty: 2 },
  { id: "roi_methods", clusterId: "roi", name: "馬券術実践", description: "点数・資金配分・買い方の工夫", emoji: "🔧", courseNumber: 2, difficulty: 2 },
  { id: "roi_advanced", clusterId: "roi", name: "上級馬券術", description: "期待値・控除率・長期戦略", emoji: "🎯", courseNumber: 3, difficulty: 3 },

  // ─── データ分析（3コース）───
  { id: "data_basics", clusterId: "data", name: "データ分析入門", description: "スピード指数・レーティング", emoji: "📊", courseNumber: 1, difficulty: 2 },
  { id: "data_pace", clusterId: "data", name: "ペース分析", description: "ラップタイム・展開予想", emoji: "⏱️", courseNumber: 2, difficulty: 2 },
  { id: "data_tools", clusterId: "data", name: "分析ツール活用", description: "競馬ソフト・データベース", emoji: "💻", courseNumber: 3, difficulty: 3 },

  // ─── 地方競馬（3コース）───
  { id: "local_intro", clusterId: "local", name: "地方競馬入門", description: "中央との違いと楽しみ方", emoji: "🐴", courseNumber: 1, difficulty: 1 },
  { id: "local_races", clusterId: "local", name: "地方の重賞レース", description: "ダートグレード・交流重賞", emoji: "🏅", courseNumber: 2, difficulty: 2 },
  { id: "local_betting", clusterId: "local", name: "地方競馬の馬券術", description: "SPAT4・楽天競馬・オッズの特徴", emoji: "🎰", courseNumber: 3, difficulty: 2 },

  // ─── 海外競馬（2コース）───
  { id: "overseas_basics", clusterId: "overseas", name: "海外競馬入門", description: "世界の競馬を知ろう", emoji: "🌍", courseNumber: 1, difficulty: 2 },
  { id: "overseas_major", clusterId: "overseas", name: "世界のビッグレース", description: "凱旋門賞・ブリーダーズC・香港", emoji: "✈️", courseNumber: 2, difficulty: 2 },

  // ─── POG・一口馬主（2コース）───
  { id: "pog_basics", clusterId: "pog", name: "POG入門", description: "ペーパーオーナーゲームの楽しみ方", emoji: "📋", courseNumber: 1, difficulty: 1 },
  { id: "pog_advanced", clusterId: "pog", name: "一口馬主ガイド", description: "クラブ法人・出資の実際", emoji: "🤝", courseNumber: 2, difficulty: 2 },

  // ─── 競馬メディア活用（2コース）───
  { id: "media_newspaper", clusterId: "media", name: "競馬新聞の読み方", description: "紙面・印・予想家の活用", emoji: "📰", courseNumber: 1, difficulty: 1 },
  { id: "media_digital", clusterId: "media", name: "デジタルメディア", description: "ネット・アプリ・SNS活用", emoji: "📱", courseNumber: 2, difficulty: 1 },

  // ─── ウマ娘→リアル競馬（3コース）───
  { id: "umamusume_intro", clusterId: "umamusume", name: "ウマ娘と実際の競馬", description: "ゲームとリアルの接点", emoji: "🎮", courseNumber: 1, difficulty: 1 },
  { id: "umamusume_real", clusterId: "umamusume", name: "元ネタの名馬たち", description: "ウマ娘のモデルになった名馬", emoji: "⭐", courseNumber: 2, difficulty: 1 },
  { id: "umamusume_advanced", clusterId: "umamusume", name: "ウマ娘から本格派へ", description: "ゲームの知識を実戦に活かす", emoji: "🚀", courseNumber: 3, difficulty: 2 },
];

export const COURSE_MAP = Object.fromEntries(
  COURSES.map((c) => [c.id, c])
);

// --- ステージ定義（各コース共通10ステージ構成）---
export type StageDefinition = {
  id: number;
  topic: string;
  questions: number;
};

// ステージのデフォルト構成（コースごとにtopicはDBから取得）
export const DEFAULT_STAGES: StageDefinition[] = [
  { id: 1, topic: "基礎知識①", questions: 10 },
  { id: 2, topic: "基礎知識②", questions: 10 },
  { id: 3, topic: "理解を深める①", questions: 10 },
  { id: 4, topic: "理解を深める②", questions: 10 },
  { id: 5, topic: "実践応用①", questions: 10 },
  { id: 6, topic: "実践応用②", questions: 10 },
  { id: 7, topic: "発展学習①", questions: 10 },
  { id: 8, topic: "発展学習②", questions: 10 },
  { id: 9, topic: "総合演習", questions: 10 },
  { id: 10, topic: "最終チェック", questions: 10 },
];

export const STAGE_COUNT = 10;
export const BOSS_QUESTIONS = 20;

// --- ステージ状態（ランタイム用）---
export type StageStatus = "complete" | "current" | "locked";

export type StageState = StageDefinition & {
  status: StageStatus;
  stars: number;
  bestScore: number;
};

// --- コース進捗の型（Supabase）---
export type DojoProgressRow = {
  course_id: string;
  stage_id: number;
  stars: number;
  best_score: number;
  attempts: number;
  cleared_at: string | null;
};

// --- 進捗データからステージ状態を計算 ---
export function buildStageStates(
  progressRows: DojoProgressRow[],
  courseId: string
): StageState[] {
  const progressMap = new Map(
    progressRows
      .filter((r) => r.course_id === courseId)
      .map((r) => [r.stage_id, r])
  );

  let foundCurrent = false;

  return DEFAULT_STAGES.map((def) => {
    const progress = progressMap.get(def.id);
    const isCleared = progress && progress.stars > 0;

    let status: StageStatus;
    if (isCleared) {
      status = "complete";
    } else if (!foundCurrent) {
      status = "current";
      foundCurrent = true;
    } else {
      status = "locked";
    }

    return {
      ...def,
      status,
      stars: progress?.stars ?? 0,
      bestScore: progress?.best_score ?? 0,
    };
  });
}

// --- コース状態の型 ---
export type CourseStatus = "playing" | "locked" | "complete";

export type CourseState = Course & {
  status: CourseStatus;
  progress: number; // 0-100
  completedStages: number;
};

// --- クラスター内でのコース状態を計算 ---
export function buildCourseStates(
  progressRows: DojoProgressRow[],
  clusterId?: string
): CourseState[] {
  const targetCourses = clusterId
    ? COURSES.filter((c) => c.clusterId === clusterId)
    : COURSES;

  return targetCourses.map((course) => {
    const courseProgress = progressRows.filter(
      (r) => r.course_id === course.id && r.stars > 0
    );
    const completedStages = courseProgress.length;
    const progress = Math.round((completedStages / STAGE_COUNT) * 100);

    // クラスター内の最初のコースは常に解放
    // 2番目以降は前コース完了後に解放
    let status: CourseStatus;
    if (course.courseNumber === 1) {
      status = completedStages >= STAGE_COUNT ? "complete" : "playing";
    } else {
      const prevCourse = targetCourses.find(
        (c) =>
          c.clusterId === course.clusterId &&
          c.courseNumber === course.courseNumber - 1
      );
      const prevCompleted = prevCourse
        ? progressRows.filter(
            (r) => r.course_id === prevCourse.id && r.stars > 0
          ).length
        : 0;
      if (prevCompleted >= STAGE_COUNT) {
        status =
          completedStages >= STAGE_COUNT ? "complete" : "playing";
      } else {
        status = "locked";
      }
    }

    return { ...course, status, progress, completedStages };
  });
}

// --- 称号 ---
export type DojoTitle = {
  name: string;
  emoji: string;
  requirement: string;
  minCourses: number;
};

export const DOJO_TITLES: DojoTitle[] = [
  { name: "競馬入門者", emoji: "📰", requirement: "道場を始める", minCourses: 0 },
  { name: "競馬見習い", emoji: "🔗", requirement: "3コースクリア", minCourses: 3 },
  { name: "馬券修行中", emoji: "🎫", requirement: "10コースクリア", minCourses: 10 },
  { name: "予想師見習い", emoji: "📊", requirement: "20コースクリア", minCourses: 20 },
  { name: "競馬通", emoji: "🎖️", requirement: "30コースクリア", minCourses: 30 },
  { name: "競馬マスター", emoji: "🏅", requirement: "40コースクリア", minCourses: 40 },
  { name: "競馬道場 師範代", emoji: "🥋", requirement: "全50コースクリア", minCourses: 50 },
];

export function getCurrentTitle(
  totalClearedCourses: number
): DojoTitle {
  let title = DOJO_TITLES[0];
  for (const t of DOJO_TITLES) {
    if (totalClearedCourses >= t.minCourses) title = t;
  }
  return title;
}

export function getNextTitle(
  totalClearedCourses: number
): DojoTitle | null {
  for (const t of DOJO_TITLES) {
    if (totalClearedCourses < t.minCourses) return t;
  }
  return null;
}

// --- 記事カテゴリグループ（道場TOP用） ---
export const ARTICLE_CATEGORY_GROUPS = [
  { icon: "📰", name: "はじめの一歩", color: "green", desc: "基礎・馬券・マナー" },
  { icon: "📊", name: "予想力UP", color: "blue", desc: "分析・血統・データ" },
  { icon: "🏟️", name: "競馬場ガイド", color: "orange", desc: "コース・地方・海外" },
  { icon: "🎓", name: "もっと楽しむ", color: "purple", desc: "上級・歴史・ウマ娘" },
] as const;
