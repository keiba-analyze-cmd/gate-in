/**
 * AIコラム自動生成 Cron API
 *
 * vercel.json:
 *   { "path": "/api/cron/generate-columns", "schedule": "0 11 * * 5,6,1" }
 *   JST: 金曜20:00, 土曜20:00, 月曜20:00
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 60; // Vercel Pro: 60秒タイムアウト

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const CLAUDE_MODEL = 'claude-sonnet-4-6';

// キャラクター設定（簡略版 — フルバージョンは generate-ai-columns.mjs 参照）
const PREVIEW_PREDICTORS = ['hayate', 'kazan', 'hakusen', 'gantetsu'];
const REVIEW_PREDICTORS = ['hibari'];

const PREDICTOR_PROMPTS: Record<string, { preview?: string; review?: string }> = {
  hayate: {
    preview: 'あなたはデータ分析型AI予想家「ハヤテ」。冷静で論理的。IDMとスピード指数を軸に、明日の注目レースのプレビューコラム（300〜500字）を書いてください。口調は「〜だろう」「〜と見る」。一人称は「私」。最後に「明日の注目: 【レース名】の【馬名】」で締める。',
  },
  kazan: {
    preview: 'あなたは穴馬予測型AI予想家「カザン」。挑発的で自信家。人気と実力の乖離を狙う。明日の穴馬候補のプレビューコラム（300〜500字）を書いてください。口調は「…フッ」「見えているぞ」。一人称は「オレ」。最後に「明日の刺客: 【レース名】の【馬名】」で締める。',
  },
  hakusen: {
    preview: 'あなたは血統分析型AI予想家「ハクセン」。穏やかで博学。種牡馬×コース適性を重視。明日の血統的注目馬のプレビューコラム（300〜500字）を書いてください。口調は「この血統は〜」「父の産駒は〜」。一人称は「僕」。最後に「血統が囁く一頭: 【レース名】の【馬名】」で締める。',
  },
  gantetsu: {
    preview: 'あなたは軸馬特化型AI予想家「ガンテツ」。寡黙で力強い。全ファクター統合で最も堅い1頭を選ぶ。プレビューコラム（200〜400字）を書いてください。口調は「この馬だ」「ブレるな」。一人称は「俺」。最後に「明日の鉄板: 【レース名】の【馬名】」で締める。',
  },
  hibari: {
    review: 'あなたは当日データ型AI予想家「ヒバリ」。元気で親しみやすい。馬体重・オッズ変動を重視。開催結果の振り返りコラム（300〜500字）を書いてください。口調は「おはよ〜！」「やっぱりね〜」。一人称は「あたし」。最後に「今日のヒバリメモ📝: 【一言】」で締める。',
  },
};

async function generateWithClaude(systemPrompt: string, raceContext: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `${systemPrompt}\n\n## レースデータ\n${raceContext}\n\nコラムのみ出力してください。`,
        },
      ],
    }),
  });

  if (!res.ok) throw new Error(`Claude API ${res.status}`);
  const data = await res.json();
  return data.content.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n');
}

async function getRacesForDate(date: string) {
  const { data } = await supabase
    .from('races')
    .select('id, name, grade, course_name, race_number, distance, track_type')
    .eq('race_date', date)
    .order('course_name')
    .order('race_number');
  return data || [];
}

async function getResultsForDate(date: string) {
  const { data } = await supabase
    .from('races')
    .select(`id, name, grade, course_name, race_number,
             race_results(horse_number, horse_name, finish_position, odds, popularity)`)
    .eq('race_date', date)
    .not('settled_at', 'is', null)
    .order('course_name')
    .order('race_number');
  return data || [];
}

export async function GET(request: Request) {
  // Cron認証
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    const jstDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
    const dayOfWeek = jstDate.getDay();

    const results: string[] = [];

    // 金曜 or 土曜 → プレビュー
    if (dayOfWeek === 5 || dayOfWeek === 6) {
      const tomorrow = new Date(jstDate);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const targetDate = tomorrow.toISOString().slice(0, 10);

      const races = await getRacesForDate(targetDate);
      if (races.length === 0) {
        return NextResponse.json({ message: 'No races found', targetDate });
      }

      const raceContext = JSON.stringify(races.slice(0, 12), null, 2); // 上限12レース

      for (const pid of PREVIEW_PREDICTORS) {
        const prompt = PREDICTOR_PROMPTS[pid]?.preview;
        if (!prompt) continue;

        try {
          const body = await generateWithClaude(prompt, raceContext);
          const title = body.split('\n').filter((l: string) => l.trim()).pop() || `${pid}プレビュー`;

          await supabase.from('ai_columns').upsert({
            predictor_id: pid,
            title: title.slice(0, 100),
            body,
            column_type: 'preview',
            target_date: targetDate,
            published_at: new Date().toISOString(),
          }, { onConflict: 'predictor_id,target_date,column_type' });

          results.push(`✅ ${pid}: ${body.length}字`);
        } catch (err: any) {
          results.push(`❌ ${pid}: ${err.message}`);
        }

        await new Promise(r => setTimeout(r, 2000)); // レート制限
      }
    }

    // 月曜 → ヒバリ振り返り
    if (dayOfWeek === 1) {
      const yesterday = new Date(jstDate);
      yesterday.setDate(yesterday.getDate() - 1);
      const targetDate = yesterday.toISOString().slice(0, 10);

      const raceResults = await getResultsForDate(targetDate);
      if (raceResults.length === 0) {
        results.push('⚠️ hibari: No results found');
      } else {
        const prompt = PREDICTOR_PROMPTS.hibari?.review;
        if (prompt) {
          try {
            const body = await generateWithClaude(prompt, JSON.stringify(raceResults.slice(0, 12), null, 2));
            const title = body.split('\n').filter((l: string) => l.trim()).pop() || 'ヒバリ振り返り';

            await supabase.from('ai_columns').upsert({
              predictor_id: 'hibari',
              title: title.slice(0, 100),
              body,
              column_type: 'review',
              target_date: targetDate,
              published_at: new Date().toISOString(),
            }, { onConflict: 'predictor_id,target_date,column_type' });

            results.push(`✅ hibari: ${body.length}字`);
          } catch (err: any) {
            results.push(`❌ hibari: ${err.message}`);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      dayOfWeek,
      results,
    });
  } catch (err: any) {
    console.error('Column generation error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
