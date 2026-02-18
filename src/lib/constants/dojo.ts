// src/lib/constants/dojo.ts
// ============================================================
// 🥋 道場 — コース・ステージ・称号の定数定義
// ============================================================

// --- コースデータ ---
export type Course = {
  id: string;
  name: string;
  track: string;
  direction: 'left' | 'right';
  straightLength: number;
  elevation: number;
  corners: number[];
  features: string;
  famousRaces: string[];
  emoji: string;
  courseNumber: number;
  sections: string[];
};

export const COURSE_DB: Record<string, Course> = {
  tokyo_turf_1600: {
    id: 'tokyo_turf_1600',
    name: '東京芝1600m',
    track: '東京競馬場',
    direction: 'left',
    straightLength: 525.9,
    elevation: 2.7,
    corners: [3, 4],
    features: '直線525.9m（日本最長級）',
    famousRaces: ['安田記念', 'NHKマイルC'],
    emoji: '🏇',
    courseNumber: 1,
    sections: ['ゲートイン', 'スタート', '向正面', '3コーナー', '4コーナー', '最後の直線', 'GOAL'],
  },
  nakayama_turf_2000: {
    id: 'nakayama_turf_2000',
    name: '中山芝2000m',
    track: '中山競馬場',
    direction: 'right',
    straightLength: 310,
    elevation: 5.3,
    corners: [1, 2, 3, 4],
    features: '高低差5.3m（JRA最大）',
    famousRaces: ['皐月賞', 'ホープフルS'],
    emoji: '⛰️',
    courseNumber: 2,
    sections: ['ゲートイン', 'スタート', '1コーナー', '2コーナー', '向正面', '3コーナー', '4コーナー', 'GOAL'],
  },
  kyoto_turf_3000: {
    id: 'kyoto_turf_3000',
    name: '京都芝3000m',
    track: '京都競馬場',
    direction: 'right',
    straightLength: 403.7,
    elevation: 4.3,
    corners: [3, 4, 1, 2, 3, 4],
    features: '淀の坂4.3m・1周半',
    famousRaces: ['菊花賞', '天皇賞(春)'],
    emoji: '🏔️',
    courseNumber: 3,
    sections: ['ゲートイン', '3C①', '4C①', 'ホーム通過', '1C', '2C', '3C②', '4C②', 'GOAL'],
  },
  hanshin_turf_1600: {
    id: 'hanshin_turf_1600',
    name: '阪神芝1600m',
    track: '阪神競馬場',
    direction: 'right',
    straightLength: 473.6,
    elevation: 2.4,
    corners: [3, 4],
    features: 'ワンターン＋急坂1.8m',
    famousRaces: ['桜花賞', '阪神JF'],
    emoji: '🌸',
    courseNumber: 4,
    sections: ['ゲートイン', 'スタート', '向正面', '3コーナー', '4コーナー', '最後の直線', 'GOAL'],
  },
};

// --- ステージ定義（各コース共通構成） ---
export type StageDefinition = {
  id: number;
  section: number;
  topic: string;
  questions: number;
};

export const STAGE_DEFINITIONS: StageDefinition[] = [
  { id: 1, section: 0, topic: '競馬の基本ルール', questions: 5 },
  { id: 2, section: 1, topic: '馬券の種類を知る', questions: 5 },
  { id: 3, section: 2, topic: '単勝・複勝を学ぶ', questions: 5 },
  { id: 4, section: 2, topic: '馬連・ワイドを学ぶ', questions: 5 },
  { id: 5, section: 3, topic: '三連複・三連単', questions: 5 },
  { id: 6, section: 3, topic: 'オッズの読み方', questions: 5 },
  { id: 7, section: 4, topic: '競馬新聞の見方', questions: 5 },
  { id: 8, section: 4, topic: 'パドックの見方', questions: 5 },
  { id: 9, section: 5, topic: '馬場状態と天候', questions: 8 },
  { id: 10, section: 5, topic: '実践！予想を立てる', questions: 10 },
];

export const BOSS_QUESTIONS = 20;

// --- ステージ状態（ランタイム用） ---
export type StageStatus = 'complete' | 'current' | 'locked';

export type StageState = StageDefinition & {
  status: StageStatus;
  stars: number;
  bestScore: number;
};

// --- コース進捗の型（Supabaseから取得） ---
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

  return STAGE_DEFINITIONS.map((def) => {
    const progress = progressMap.get(def.id);
    const isCleared = progress && progress.stars > 0;

    let status: StageStatus;
    if (isCleared) {
      status = 'complete';
    } else if (!foundCurrent) {
      status = 'current';
      foundCurrent = true;
    } else {
      status = 'locked';
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
export type CourseStatus = 'playing' | 'locked' | 'complete';

export type CourseState = Course & {
  status: CourseStatus;
  progress: number; // 0-100
  completedStages: number;
};

// --- 進捗データからコース状態を計算 ---
export function buildCourseStates(
  progressRows: DojoProgressRow[]
): CourseState[] {
  return Object.values(COURSE_DB).map((course) => {
    const courseProgress = progressRows.filter(
      (r) => r.course_id === course.id && r.stars > 0
    );
    const completedStages = courseProgress.length;
    const progress = Math.round(
      (completedStages / STAGE_DEFINITIONS.length) * 100
    );

    // コース1は常にplaying、他はコースN-1完了後に解放
    let status: CourseStatus;
    if (course.courseNumber === 1) {
      status = completedStages >= STAGE_DEFINITIONS.length ? 'complete' : 'playing';
    } else {
      const prevCourse = Object.values(COURSE_DB).find(
        (c) => c.courseNumber === course.courseNumber - 1
      );
      const prevCompleted = prevCourse
        ? progressRows.filter(
            (r) => r.course_id === prevCourse.id && r.stars > 0
          ).length
        : 0;
      if (prevCompleted >= STAGE_DEFINITIONS.length) {
        status = completedStages >= STAGE_DEFINITIONS.length ? 'complete' : 'playing';
      } else {
        status = 'locked';
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
  minStages: number;
};

export const DOJO_TITLES: DojoTitle[] = [
  { name: '競馬入門者', emoji: '📰', requirement: '道場を始める', minStages: 0 },
  { name: '競馬見習い', emoji: '🔗', requirement: 'コース1クリア', minStages: 10 },
  { name: '馬券修行中', emoji: '🎫', requirement: 'コース2クリア', minStages: 20 },
  { name: '予想師見習い', emoji: '📊', requirement: 'コース3クリア', minStages: 30 },
  { name: '競馬道場 師範代', emoji: '🥋', requirement: '全コースクリア', minStages: 40 },
];

export function getCurrentTitle(totalClearedStages: number): DojoTitle {
  let title = DOJO_TITLES[0];
  for (const t of DOJO_TITLES) {
    if (totalClearedStages >= t.minStages) title = t;
  }
  return title;
}

export function getNextTitle(
  totalClearedStages: number
): DojoTitle | null {
  for (const t of DOJO_TITLES) {
    if (totalClearedStages < t.minStages) return t;
  }
  return null;
}

// --- 記事カテゴリグループ（道場TOP用） ---
export const ARTICLE_CATEGORY_GROUPS = [
  { icon: '📰', name: 'はじめの一歩', color: 'green', desc: '基礎・馬券・マナー' },
  { icon: '📊', name: '予想力UP', color: 'blue', desc: '分析・血統・データ' },
  { icon: '🏟️', name: '競馬場ガイド', color: 'orange', desc: 'コース・地方・海外' },
  { icon: '🎓', name: 'もっと楽しむ', color: 'purple', desc: '上級・歴史・ウマ娘' },
] as const;
