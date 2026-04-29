// src/app/api/cron/venue-conditions/route.ts
// 馬場状態自動取得Cron（30分ごと、土日のみ）
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function verifyCron(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${process.env.CRON_SECRET}`;
}

// JRAの馬場状態をスクレイピング
async function scrapeVenueConditions(): Promise<
  {
    course_name: string;
    turf_condition: string;
    dirt_condition: string;
    weather: string;
  }[]
> {
  const results: {
    course_name: string;
    turf_condition: string;
    dirt_condition: string;
    weather: string;
  }[] = [];

  try {
    // netkeiba のレース一覧ページから馬場状態を取得
    const today = new Date();
    const jst = new Date(today.getTime() + 9 * 60 * 60 * 1000);
    const dateStr = `${jst.getUTCFullYear()}${String(jst.getUTCMonth() + 1).padStart(2, "0")}${String(jst.getUTCDate()).padStart(2, "0")}`;

    const url = `https://race.netkeiba.com/top/race_list.html?kaisai_date=${dateStr}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!res.ok) {
      console.log(`netkeiba responded with ${res.status}`);
      return results;
    }

    const html = await res.text();

    // 馬場状態のパターンマッチ
    // netkeiba: "芝 : 良" / "ダート : 稍重" 等
    const venuePattern =
      /data-kaisai_id[^>]*>([^<]+)<[\s\S]*?馬場[\s\S]*?芝[^:]*:\s*(良|稍重|重|不良)[\s\S]*?ダ[ー]*ト[^:]*:\s*(良|稍重|重|不良)/g;

    // シンプルなパターン: 競馬場名と馬場状態を抽出
    const courseNames = ["東京", "中山", "京都", "阪神", "新潟", "福島", "小倉", "札幌", "函館", "中京"];

    for (const course of courseNames) {
      // 競馬場名がHTML内に存在するか確認
      if (!html.includes(course)) continue;

      // 馬場状態を検索
      const turfMatch = html.match(
        new RegExp(`${course}[\\s\\S]{0,500}芝[^\\n]*?(良|稍重|重|不良)`, "m")
      );
      const dirtMatch = html.match(
        new RegExp(`${course}[\\s\\S]{0,500}ダ[ー]*ト[^\\n]*?(良|稍重|重|不良)`, "m")
      );
      const weatherMatch = html.match(
        new RegExp(`${course}[\\s\\S]{0,300}(晴|曇|雨|小雨|雪)`, "m")
      );

      if (turfMatch || dirtMatch) {
        results.push({
          course_name: course,
          turf_condition: turfMatch?.[1] || "良",
          dirt_condition: dirtMatch?.[1] || "良",
          weather: weatherMatch?.[1] === "晴" ? "晴れ"
            : weatherMatch?.[1] === "曇" ? "曇り"
            : weatherMatch?.[1] === "雨" || weatherMatch?.[1] === "小雨" ? "雨"
            : "晴れ",
        });
      }
    }
  } catch (e) {
    console.error("Scraping error:", e);
  }

  return results;
}

export async function GET(request: NextRequest) {
  if (!verifyCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 今日の日付（JST）
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const today = `${jst.getUTCFullYear()}-${String(jst.getUTCMonth() + 1).padStart(2, "0")}-${String(jst.getUTCDate()).padStart(2, "0")}`;

  // 土日以外はスキップ
  const dayOfWeek = jst.getUTCDay();
  if (dayOfWeek !== 0 && dayOfWeek !== 6) {
    return NextResponse.json({
      message: "Not a race day, skipping",
      day: dayOfWeek,
    });
  }

  console.log(`🏇 馬場状態取得開始: ${today}`);

  const conditions = await scrapeVenueConditions();

  if (conditions.length === 0) {
    console.log("⚠️ 馬場状態を取得できませんでした");
    return NextResponse.json({
      message: "No conditions found",
      date: today,
    });
  }

  // Supabaseにupsert
  let updated = 0;
  let changed: string[] = [];

  for (const cond of conditions) {
    // 既存レコードを取得
    const { data: existing } = await supabase
      .from("venue_conditions")
      .select("turf_condition, dirt_condition")
      .eq("race_date", today)
      .eq("course_name", cond.course_name)
      .single();

    const { error } = await supabase
      .from("venue_conditions")
      .upsert(
        {
          race_date: today,
          course_name: cond.course_name,
          turf_condition: cond.turf_condition,
          dirt_condition: cond.dirt_condition,
          weather: cond.weather,
          source: "netkeiba",
        },
        { onConflict: "race_date,course_name" }
      );

    if (!error) {
      updated++;
      // 変更があった場合は記録
      if (
        existing &&
        (existing.turf_condition !== cond.turf_condition ||
          existing.dirt_condition !== cond.dirt_condition)
      ) {
        changed.push(
          `${cond.course_name}: 芝${existing.turf_condition}→${cond.turf_condition} ダ${existing.dirt_condition}→${cond.dirt_condition}`
        );
      }
    }
  }

  // 馬場変更があればSlack通知
  if (changed.length > 0) {
    const slackWebhook = process.env.SLACK_WEBHOOK_ALERTS;
    if (slackWebhook) {
      try {
        await fetch(slackWebhook, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: `🏇 馬場状態が変更されました\n${changed.join("\n")}`,
          }),
        });
      } catch {}
    }
  }

  console.log(
    `✅ ${updated}場の馬場状態を更新${changed.length > 0 ? ` (変更: ${changed.join(", ")})` : ""}`
  );

  return NextResponse.json({
    message: `Updated ${updated} venues`,
    date: today,
    conditions,
    changed,
  });
}
