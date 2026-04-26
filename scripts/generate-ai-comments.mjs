#!/usr/bin/env node

/**
 * AI予想家セリフ一括生成スクリプト（改良版）
 *
 * 用途:
 *   ai_predictions テーブルの comment が空のレコードに対し、
 *   Claude API でキャラ口調のセリフを生成して更新する。
 *
 * 使い方:
 *   # .env に以下を設定
 *   ANTHROPIC_API_KEY=sk-...
 *   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ...
 *
 *   node scripts/generate-ai-comments.mjs
 *   node scripts/generate-ai-comments.mjs --predictor hayate   # 特定キャラのみ
 *   node scripts/generate-ai-comments.mjs --dry-run             # DB更新なし
 *   node scripts/generate-ai-comments.mjs --limit 50            # 件数制限
 */

import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

// ── 設定 ──
const CLAUDE_MODEL = "claude-sonnet-4-6";
const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";
const BATCH_SIZE = 10; // 一度にClaude APIに送る件数
const DELAY_MS = 1500; // API呼び出し間隔（レート制限対策）

// ── キャラ口調定義 ──
const CHARACTER_PROMPTS = {
  hayate: {
    name: "ハヤテ",
    system: `あなたはAI競馬予想家「ハヤテ」です。
性格: 冷静沈着、データ第一主義。感情を排した分析的な語り口。
口調: 「〜だ」「〜である」の断定調。短文。数字を多用。
例: 「IDM上位。スピード指数も安定している。ここは軸で間違いない。」
禁止: 感情的な表現、「！」の多用、馴れ馴れしい口調`,
  },
  kazan: {
    name: "カザン",
    system: `あなたはAI競馬予想家「カザン」です。
性格: 情熱的、穴狙い、ギャンブラー気質。興奮しやすい。
口調: 「〜だぜ！」「〜じゃねぇか！」の熱い口調。大胆な予想を好む。
例: 「人気ねぇけどこの馬、前走の上がり見たか？ 激走あるぜ！」
禁止: 弱気な発言、「無難」「堅実」など消極的な表現`,
  },
  hakusen: {
    name: "ハクセン",
    system: `あなたはAI競馬予想家「ハクセン」です。
性格: 博識、穏やか、教授のような語り口。血統への深い愛。
口調: 「〜ですね」「〜でしょう」の丁寧語。解説調。
例: 「父ディープインパクト×母父Storm Cat。東京芝2400mは血統的にベストマッチですね。」
禁止: 乱暴な言葉遣い、血統以外の根拠だけで語ること`,
  },
  hibari: {
    name: "ヒバリ",
    system: `あなたはAI競馬予想家「ヒバリ」です。
性格: 明るい、フレンドリー、現場主義。朝型でテキパキしている。
口調: 「〜だよ！」「〜かも！」の元気な口調。絵文字や感嘆符を適度に使う。
例: 「おはよ！今日の馬場は良馬場☀️ この馬、前回より-8kgでキレキレだよ！」
禁止: 暗い表現、長すぎる分析`,
  },
  gantetsu: {
    name: "ガンテツ",
    system: `あなたはAI競馬予想家「ガンテツ」です。
性格: 寡黙、重厚、自信家。◎を1頭だけ選ぶ軸馬特化型。
口調: 「…」「〜だ。」の短い文。多くを語らない。
例: 「…この馬だ。全指標が示している。迷う余地はない。」
禁止: 長文、複数の候補を挙げること、弱気な言い回し`,
  },
};

// ── メイン ──
async function main() {
  const args = parseArgs();

  // Supabase接続
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // コメント未生成の予想を取得
  let query = supabase
    .from("ai_predictions")
    .select(
      `
      id, predictor_id, horse_number, horse_name, confidence,
      races:race_id (name, grade, course_name, race_date, race_number)
    `
    )
    .or("comment.is.null,comment.eq.");

  if (args.predictor) {
    query = query.eq("predictor_id", args.predictor);
  }

  if (args.limit) {
    query = query.limit(args.limit);
  }

  const { data: predictions, error } = await query.order("created_at", {
    ascending: false,
  });

  if (error) {
    console.error("❌ DB取得エラー:", error.message);
    process.exit(1);
  }

  if (!predictions || predictions.length === 0) {
    console.log("✅ コメント未生成の予想はありません");
    return;
  }

  console.log(`📝 ${predictions.length}件のセリフを生成します...`);
  if (args.dryRun) console.log("🔍 ドライランモード（DB更新なし）\n");

  // バッチ処理
  let generated = 0;
  let failed = 0;

  for (let i = 0; i < predictions.length; i += BATCH_SIZE) {
    const batch = predictions.slice(i, i + BATCH_SIZE);

    for (const pred of batch) {
      const charConfig = CHARACTER_PROMPTS[pred.predictor_id];
      if (!charConfig) {
        console.log(`⏭️  不明なpredictor_id: ${pred.predictor_id}`);
        failed++;
        continue;
      }

      const race = pred.races;
      const raceName = race?.name || "不明なレース";
      const gradeStr = race?.grade ? `（${race.grade}）` : "";
      const courseName = race?.course_name || "";

      const userPrompt = `以下のレースの予想コメントを1文で書いてください（40〜80文字程度）。

レース: ${raceName}${gradeStr}
競馬場: ${courseName}
◎推奨馬: ${pred.horse_number}番 ${pred.horse_name}
自信度: ${pred.confidence || "中"}

コメントのみを返してください。前置きや説明は不要です。`;

      try {
        const comment = await callClaude(charConfig.system, userPrompt);

        if (comment && !args.dryRun) {
          const { error: updateError } = await supabase
            .from("ai_predictions")
            .update({ comment })
            .eq("id", pred.id);

          if (updateError) {
            console.error(`  ❌ DB更新失敗 [${pred.id}]:`, updateError.message);
            failed++;
            continue;
          }
        }

        console.log(
          `  ✅ [${charConfig.name}] ${raceName} → ${comment?.slice(0, 50)}...`
        );
        generated++;
      } catch (err) {
        console.error(
          `  ❌ API失敗 [${pred.id}]:`,
          err.message?.slice(0, 100)
        );
        failed++;
      }

      // レート制限対策
      await sleep(DELAY_MS);
    }

    console.log(
      `\n📊 進捗: ${Math.min(i + BATCH_SIZE, predictions.length)}/${predictions.length}`
    );
  }

  console.log(`\n🎉 完了！ 生成: ${generated}件 / 失敗: ${failed}件`);
}

// ── Claude API呼び出し ──
async function callClaude(systemPrompt, userPrompt) {
  const res = await fetch(CLAUDE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 200,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  const text = data.content
    ?.filter((c) => c.type === "text")
    .map((c) => c.text)
    .join("")
    .trim();

  // 余計な前置きを除去
  return text?.replace(/^(コメント[:：]\s*|「|」)/g, "").replace(/」$/g, "");
}

// ── ユーティリティ ──
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseArgs() {
  const args = process.argv.slice(2);
  const result = { predictor: null, dryRun: false, limit: null };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--predictor" && args[i + 1]) {
      result.predictor = args[i + 1];
      i++;
    } else if (args[i] === "--dry-run") {
      result.dryRun = true;
    } else if (args[i] === "--limit" && args[i + 1]) {
      result.limit = parseInt(args[i + 1]);
      i++;
    }
  }

  return result;
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
