import { createAdminClient } from "@/lib/admin";
import { NextResponse } from "next/server";

export async function GET() {
  const timestamp = new Date().toISOString();
  const checks: Record<string, { status: string; latency_ms?: number; error?: string }> = {};
  try {
    const start = Date.now();
    const { error } = await createAdminClient().from("races").select("id", { count: "exact", head: true }).limit(1);
    const latency = Date.now() - start;
    checks.database = error ? { status: "error", error: error.message, latency_ms: latency } : { status: "ok", latency_ms: latency };
  } catch (e) { checks.database = { status: "error", error: String(e) }; }
  checks.app = { status: "ok" };
  const allOk = Object.values(checks).every((c) => c.status === "ok");
  return NextResponse.json({ status: allOk ? "ok" : "degraded", timestamp, checks }, { status: allOk ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
