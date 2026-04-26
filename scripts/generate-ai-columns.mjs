/**
 * AIコラム自動生成スクリプト
 *
 * 使い方:
 *   node generate-ai-columns.mjs preview --date 2026-04-27   # 前日プレビュー (4体)
 *   node generate-ai-columns.mjs review  --date 2026-04-26   # 振り返り (ヒバリ)
 *   node generate-ai-columns.mjs auto                        # 自動判定 (Cron用)
 *
 * スケジュール:
 *   金曜 → 土曜分プレビュー (ハヤテ, カザン, ハクセン, ガンテツ)
 *   土曜 → 日曜分プレビュー (ハヤテ, カザン, ハクセン, ガンテツ)
 *   月曜 → ヒバリ振り返り (前日曜分)
 *
 * 環境変数:
 *   ANTHROPIC_API_KEY
 *   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const CLAUDE_MODEL = 'claude-sonnet-4-6';

// ─── キャラクター設定 ───────────────────────────────────
const PREDICTORS = {
  hayate: {
    name: 'ハヤテ',
    type: 'データ分析型',
    color: '#1E40AF',
    previewPrompt: `あなたはAI予想家「ハヤテ」です。データ分析型の冷静な予想家で、IDMとスピード指数を軸にした分析が得意です。

口調: 知的で冷静。「〜だろう」「〜と見る」「データが示している」などの表現を使う。感情的にならず、数字に基づいた論理的な分析を展開する。一人称は「私」。

以下のレースデータを分析し、明日の注目レースについてプレビューコラム（300〜500字）を書いてください。
- IDM上位馬の信頼度
- 指数の傾向分析
- 狙い目のレース

最後に「明日の注目: 【レース名】の【馬名】」で締めてください。`,

    reviewPrompt: null, // ハヤテは振り返りなし
  },
  kazan: {
    name: 'カザン',
    type: '穴馬予測型',
    color: '#DC2626',
    previewPrompt: `あなたはAI予想家「カザン」です。穴馬予測型の大胆な予想家で、人気と実力の乖離を見抜くのが得意です。

口調: 挑発的で自信家。「…フッ」「見えているぞ」「この馬、来る」など短いフレーズを多用。回収率至上主義。一人称は「オレ」。

以下のレースデータから、人気と実力が乖離している穴馬候補を見つけ、プレビューコラム（300〜500字）を書いてください。
- IDM vs 人気順位の乖離分析
- 過小評価されている馬の根拠
- 狙い目の穴レース

最後に「明日の刺客: 【レース名】の【馬名】」で締めてください。`,

    reviewPrompt: null,
  },
  hakusen: {
    name: 'ハクセン',
    type: '血統分析型',
    color: '#059669',
    previewPrompt: `あなたはAI予想家「ハクセン」です。血統分析型の博学な予想家で、種牡馬×コース×距離の相性を重視します。

口調: 穏やかで知的。「この血統は〜」「父の産駒は〜」「血が騒ぐ」などの表現。血統の歴史やロマンを語る。一人称は「僕」。

以下のレース・血統データを分析し、プレビューコラム（300〜500字）を書いてください。
- 種牡馬のコース適性
- 母父との相性
- 血統的に面白い馬

最後に「血統が囁く一頭: 【レース名】の【馬名】」で締めてください。`,

    reviewPrompt: null,
  },
  gantetsu: {
    name: 'ガンテツ',
    type: '軸馬特化型',
    color: '#475569',
    previewPrompt: `あなたはAI予想家「ガンテツ」です。軸馬特化型の寡黙な予想家で、全ファクター統合で◎1頭だけを選ぶスタイルです。

口調: 寡黙で力強い。「この馬だ」「ブレるな」「信じろ」など短い言葉。余計なことは言わない。一人称は「俺」。

以下のレースデータから、最も信頼できる軸馬を1頭選び、プレビューコラム（200〜400字）を書いてください。
- 全指数の総合評価
- なぜこの馬が最も堅いか
- 短く力強い根拠

最後に「明日の鉄板: 【レース名】の【馬名】」で締めてください。`,

    reviewPrompt: null,
  },
  hibari: {
    name: 'ヒバリ',
    type: '当日データ型',
    color: '#D97706',
    previewPrompt: null, // ヒバリはプレビューなし（当日型）

    reviewPrompt: `あなたはAI予想家「ヒバリ」です。当日データ型の明るい予想家で、馬体重・オッズ変動・馬場状態を重視します。

口調: 元気で親しみやすい。「おはよ〜！」「これは面白い！」「やっぱりね〜」など。分かりやすさ重視。一人称は「あたし」。

以下の開催結果を振り返り、レビューコラム（300〜500字）を書いてください。
- 馬体重変動と結果の関係
- 当日のオッズ変動で見えたこと
- 馬場状態の影響分析
- 次回に活かせるポイント

最後に「今日のヒバリメモ📝: 【気づきを一言で】」で締めてください。`,
  },
};

const PREVIEW_IDS = ['hayate', 'kazan', 'hakusen', 'gantetsu'];
const REVIEW_IDS = ['hibari'];

// ─── レースデータ取得 ───────────────────────────────────
async function getRaceData(targetDate) {
  // gate-in.jpのracesテーブルからレース情報取得
  const { data: races, error: raceErr } = await supabase
    .from('races')
    .select('id, name, grade, course_name, race_date, race_number, distance, track_type')
    .eq('race_date', targetDate)
    .order('course_name')
    .order('race_number');

  if (raceErr) throw raceErr;

  // JRDBデータがあれば結合
  const raceData = [];
  for (const race of races || []) {
    // AI予想データ取得
    const { data: predictions } = await supabase
      .from('ai_predictions')
      .select('predictor_id, umaban, horse_name, confidence, comment')
      .eq('race_id', race.id);

    // JRDB指数データ取得（race_keyマッピングが必要）
    // race_keyが不明な場合はスキップ
    let jrdbEntries = [];
    const { data: entries } = await supabase
      .from('jrdb_race_entries')
      .select('umaban, horse_name, idm, composite_index, base_odds, base_popularity, ten_index, agari_index')
      .like('race_key', `%`) // TODO: race_keyマッピング
      .limit(0); // 暫定: マッピング実装後に有効化

    raceData.push({
      ...race,
      predictions: predictions || [],
      jrdb: entries || [],
    });
  }

  return raceData;
}

// ─── 結果データ取得（振り返り用）───────────────────────
async function getResultData(targetDate) {
  const { data: races } = await supabase
    .from('races')
    .select(`
      id, name, grade, course_name, race_date, race_number,
      race_results (
        id, finish_position, finish_time, race_entry_id
      )
    `)
    .eq('race_date', targetDate)
    .eq('status', 'finished')
    .order('course_name')
    .order('race_number');

  return races || [];
}

// ─── 血統データ取得（ハクセン用）─────────────────────────
async function getBloodlineData(targetDate) {
  const { data: races } = await supabase
    .from('races')
    .select('id, name, course_name, distance, track_type')
    .eq('race_date', targetDate);

  if (!races || races.length === 0) return [];

  // 各レースの出走馬の血統情報を取得
  const results = [];
  for (const race of races) {
    const { data: entries } = await supabase
      .from('race_entries')
      .select('horse_name, horse_number')
      .eq('race_id', race.id);

    // 馬名で血統テーブルを検索
    const horseNames = (entries || []).map(e => e.horse_name);
    const { data: horses } = await supabase
      .from('jrdb_horses')
      .select('horse_name, sire_name, dam_sire_name, sire_lineage_code')
      .in('horse_name', horseNames);

    // 種牡馬の成績データ
    const sireNames = [...new Set((horses || []).map(h => h.sire_name).filter(Boolean))];
    const { data: sireStats } = await supabase
      .from('sire_course_distance_stats')
      .select('*')
      .in('sire_name', sireNames);

    results.push({
      race,
      horses: horses || [],
      sireStats: sireStats || [],
    });
  }

  return results;
}

// ─── Claude APIでコラム生成 ─────────────────────────────
async function generateColumn(predictorId, prompt, contextData) {
  const predictor = PREDICTORS[predictorId];
  if (!predictor) throw new Error(`Unknown predictor: ${predictorId}`);

  const systemPrompt = predictorId === 'hibari'
    ? predictor.reviewPrompt
    : predictor.previewPrompt;

  const userMessage = `${systemPrompt}

## レースデータ
${JSON.stringify(contextData, null, 2)}

コラムのみ出力してください（メタ的な説明は不要）。`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 1024,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const text = data.content
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('\n');

  return text;
}

// ─── コラムをSupabaseに保存 ─────────────────────────────
async function saveColumn(predictorId, title, body, columnType, targetDate) {
  const { data, error } = await supabase
    .from('ai_columns')
    .upsert({
      predictor_id: predictorId,
      title,
      body,
      column_type: columnType,
      target_date: targetDate,
      published_at: new Date().toISOString(),
    }, {
      onConflict: 'predictor_id,target_date,column_type',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─── プレビュー生成 (4体) ───────────────────────────────
async function generatePreviews(targetDate) {
  console.log(`\n📝 プレビュー生成: ${targetDate}`);

  const raceData = await getRaceData(targetDate);
  if (raceData.length === 0) {
    console.log('  ⚠️  対象レースなし');
    return;
  }

  const bloodlineData = await getBloodlineData(targetDate);

  for (const pid of PREVIEW_IDS) {
    const predictor = PREDICTORS[pid];
    console.log(`  🤖 ${predictor.name} (${predictor.type})...`);

    try {
      const contextData = pid === 'hakusen'
        ? { races: raceData, bloodline: bloodlineData }
        : { races: raceData };

      const body = await generateColumn(pid, 'preview', contextData);

      // タイトル生成（本文の最終行から抽出 or デフォルト）
      const lastLine = body.split('\n').filter(l => l.trim()).pop() || '';
      const title = lastLine.includes('：')
        ? lastLine.split('：').pop().trim()
        : `${predictor.name}の${targetDate}プレビュー`;

      const saved = await saveColumn(pid, title, body, 'preview', targetDate);
      console.log(`  ✅ ${predictor.name}: ${title} (${body.length}字)`);
    } catch (err) {
      console.error(`  ❌ ${predictor.name}: ${err.message}`);
    }

    // レート制限回避
    await new Promise(r => setTimeout(r, 2000));
  }
}

// ─── 振り返り生成 (ヒバリ) ──────────────────────────────
async function generateReview(targetDate) {
  console.log(`\n📝 振り返り生成: ${targetDate}`);

  const resultData = await getResultData(targetDate);
  if (resultData.length === 0) {
    console.log('  ⚠️  結果データなし');
    return;
  }

  const pid = 'hibari';
  const predictor = PREDICTORS[pid];
  console.log(`  🤖 ${predictor.name} (振り返り)...`);

  try {
    const body = await generateColumn(pid, 'review', { results: resultData });

    const lastLine = body.split('\n').filter(l => l.trim()).pop() || '';
    const title = lastLine.includes('📝')
      ? lastLine.split('📝').pop().trim()
      : `ヒバリの${targetDate}振り返り`;

    const saved = await saveColumn(pid, title, body, 'review', targetDate);
    console.log(`  ✅ ${predictor.name}: ${title} (${body.length}字)`);
  } catch (err) {
    console.error(`  ❌ ${predictor.name}: ${err.message}`);
  }
}

// ─── 自動判定 (Cron用) ──────────────────────────────────
async function autoGenerate() {
  const now = new Date();
  const jstHour = (now.getUTCHours() + 9) % 24;
  const dayOfWeek = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' })).getDay();

  // 金曜 → 土曜分プレビュー
  if (dayOfWeek === 5) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    await generatePreviews(tomorrow.toISOString().slice(0, 10));
  }
  // 土曜 → 日曜分プレビュー
  else if (dayOfWeek === 6) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    await generatePreviews(tomorrow.toISOString().slice(0, 10));
  }
  // 月曜 → 日曜分振り返り(ヒバリ)
  else if (dayOfWeek === 1) {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    await generateReview(yesterday.toISOString().slice(0, 10));
  }
  else {
    console.log('📅 今日はコラム生成日ではありません');
  }
}

// ─── メイン ─────────────────────────────────────────────
async function main() {
  const command = process.argv[2] || 'auto';
  const getArg = (flag) => {
    const idx = process.argv.indexOf(flag);
    return idx >= 0 ? process.argv[idx + 1] : null;
  };

  const targetDate = getArg('--date');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🤖 AIコラム生成');
  console.log(`   コマンド: ${command}`);
  if (targetDate) console.log(`   対象日: ${targetDate}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  switch (command) {
    case 'preview':
      if (!targetDate) throw new Error('--date が必要です');
      await generatePreviews(targetDate);
      break;
    case 'review':
      if (!targetDate) throw new Error('--date が必要です');
      await generateReview(targetDate);
      break;
    case 'auto':
      await autoGenerate();
      break;
    default:
      console.log('使い方: node generate-ai-columns.mjs [preview|review|auto] [--date YYYY-MM-DD]');
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
