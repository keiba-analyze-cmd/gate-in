import { createAdminClient, requireAdmin } from "@/lib/admin";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try { await requireAdmin(); } catch (res) { return res as Response; }
  const { searchParams } = new URL(request.url);
  const filter = searchParams.get("filter") ?? "all";
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = 30;
  const offset = (page - 1) * limit;
  const adminClient = createAdminClient();

  let query = adminClient.from("comments")
    .select("id, user_id, race_id, body, sentiment, is_deleted, is_hidden, edited_at, created_at, profiles(display_name, avatar_url, avatar_emoji), races(name, grade)", { count: "exact" })
    .order("created_at", { ascending: false }).range(offset, offset + limit - 1);

  if (filter === "reported") {
    const { data: rIds } = await adminClient.from("comment_reports").select("comment_id").eq("status", "pending");
    const ids = rIds?.map((r) => r.comment_id) ?? [];
    if (ids.length === 0) return NextResponse.json({ comments: [], total: 0, reports: {} });
    query = query.in("id", ids);
  } else if (filter === "hidden") { query = query.eq("is_hidden", true); }
  else if (filter === "deleted") { query = query.eq("is_deleted", true); }

  const { data: comments, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const cIds = comments?.map((c) => c.id) ?? [];
  let reportMap: Record<string, any[]> = {};
  if (cIds.length > 0) {
    const { data: reports } = await adminClient.from("comment_reports")
      .select("comment_id, reason, detail, status, created_at").in("comment_id", cIds).order("created_at", { ascending: false });
    (reports ?? []).forEach((r) => { if (!reportMap[r.comment_id]) reportMap[r.comment_id] = []; reportMap[r.comment_id].push(r); });
  }
  return NextResponse.json({ comments: comments ?? [], total: count ?? 0, reports: reportMap });
}

export async function PATCH(request: Request) {
  try { await requireAdmin(); } catch (res) { return res as Response; }
  const { comment_id, action, admin_note } = await request.json();
  if (!comment_id || !action) return NextResponse.json({ error: "パラメータ不足" }, { status: 400 });
  const ac = createAdminClient();
  if (action === "hide") await ac.from("comments").update({ is_hidden: true }).eq("id", comment_id);
  else if (action === "unhide") await ac.from("comments").update({ is_hidden: false }).eq("id", comment_id);
  else if (action === "delete") await ac.from("comments").update({ is_deleted: true, body: "（管理者により削除されました）" }).eq("id", comment_id);
  else if (action === "resolve_reports") await ac.from("comment_reports").update({ status: "resolved", admin_note: admin_note ?? null, resolved_at: new Date().toISOString() }).eq("comment_id", comment_id).eq("status", "pending");
  else if (action === "dismiss_reports") await ac.from("comment_reports").update({ status: "dismissed", admin_note: admin_note ?? null, resolved_at: new Date().toISOString() }).eq("comment_id", comment_id).eq("status", "pending");
  else return NextResponse.json({ error: "不正なアクション" }, { status: 400 });
  return NextResponse.json({ success: true });
}
