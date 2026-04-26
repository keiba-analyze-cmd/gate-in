/**
 * AIコラム取得API
 *
 * GET /api/ai-columns
 *   ?predictor_id=hayate          — 特定予想家のコラム
 *   ?column_type=preview          — プレビューのみ
 *   ?limit=10                     — 取得数
 *   ?latest=true                  — 各予想家の最新1件ずつ
 */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const predictorId = searchParams.get("predictor_id");
  const columnType = searchParams.get("column_type");
  const limit = parseInt(searchParams.get("limit") || "10", 10);
  const latest = searchParams.get("latest") === "true";

  try {
    if (latest) {
      // 各予想家の最新コラム1件ずつ取得（ビュー使用）
      const { data, error } = await supabase
        .from("latest_ai_columns")
        .select("*")
        .order("published_at", { ascending: false });

      if (error) throw error;
      return NextResponse.json(data);
    }

    let query = supabase
      .from("ai_columns")
      .select("*")
      .not("published_at", "is", null)
      .lte("published_at", new Date().toISOString())
      .order("published_at", { ascending: false })
      .limit(limit);

    if (predictorId) {
      query = query.eq("predictor_id", predictorId);
    }
    if (columnType) {
      query = query.eq("column_type", columnType);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
