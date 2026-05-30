import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const AI_META: Record<string, { name: string; color: string; initial: string }> = {
  hayate: { name: "ハヤテ", color: "var(--c-hayate)", initial: "ハ" },
  kazan: { name: "カザン", color: "var(--c-kazan)", initial: "カ" },
  hakusen: { name: "ハクセン", color: "var(--c-hakusen)", initial: "ハ" },
  hibari: { name: "ヒバリ", color: "var(--c-hibari)", initial: "ヒ" },
  gantetsu: { name: "ガンテツ", color: "var(--c-gantetsu)", initial: "ガ" },
};

type RatingRow = {
  predictor_type: "user" | "ai";
  predictor_id: string;
  rating: number;
  n: number;
  provisional: boolean;
};

export default async function ArenaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const currentUserId = user?.id ?? "";

  const { data: ratingData } = await supabase
    .from("predictor_ratings")
    .select("predictor_type, predictor_id, rating, n, provisional")
    .order("rating", { ascending: false })
    .limit(100);
  const rows = (ratingData ?? []) as RatingRow[];

  // ユーザーの表示情報（名前・アバター）をまとめて取得
  const userIds = rows.filter((r) => r.predictor_type === "user").map((r) => r.predictor_id);
  const profileMap = new Map<
    string,
    { display_name: string | null; avatar_url: string | null; avatar_emoji: string | null }
  >();
  if (userIds.length) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url, avatar_emoji")
      .in("id", userIds);
    for (const p of (profiles ?? []) as any[]) {
      profileMap.set(p.id, {
        display_name: p.display_name,
        avatar_url: p.avatar_url,
        avatar_emoji: p.avatar_emoji,
      });
    }
  }

  return (
    <div
      className="max-w-2xl mx-auto px-1 pb-10"
      style={{ fontFamily: "var(--font-rounded)", color: "var(--ink)" }}
    >
      {/* ヘッダー */}
      <div className="mb-3 px-1">
        <h1 className="text-xl font-black flex items-center gap-2">🏟 アリーナ</h1>
        <p className="text-sm mt-1 leading-relaxed" style={{ color: "var(--ink-2)" }}>
          実力レーティング ── 「当てたか」ではなく「市場（オッズ）に勝てたか」で、人もAIも同じ物差しで測定。
        </p>
      </div>

      {/* リーダーボード */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
      >
        {rows.length === 0 && (
          <div className="p-8 text-center text-sm" style={{ color: "var(--ink-2)" }}>
            まだレートがありません。
          </div>
        )}

        {rows.map((r, i) => {
          const isUser = r.predictor_type === "user";
          const ai = !isUser ? AI_META[r.predictor_id] : undefined;
          const profile = isUser ? profileMap.get(r.predictor_id) : undefined;
          const name = isUser ? profile?.display_name || "名無しの予想家" : ai?.name || r.predictor_id;
          const isMe = isUser && r.predictor_id === currentUserId;
          const rank = i + 1;
          const rankColor = rank === 1 ? "var(--gate-gold-strong)" : "var(--ink-2)";
          const avatarColor = isUser ? "var(--brand)" : ai?.color ?? "var(--c-gantetsu)";

          return (
            <div
              key={`${r.predictor_type}:${r.predictor_id}`}
              className="flex items-center gap-3 px-3 py-3"
              style={{
                borderTop: i === 0 ? "none" : "1px solid var(--line)",
                background: isMe ? "var(--brand-soft)" : "transparent",
              }}
            >
              {/* 順位 */}
              <div
                className="w-6 text-center font-black"
                style={{ color: rankColor, fontFamily: "var(--font-mononum)" }}
              >
                {rank}
              </div>

              {/* アバター */}
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white shrink-0 overflow-hidden"
                style={{ background: avatarColor, fontSize: 13 }}
              >
                {isUser && profile?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : isUser && profile?.avatar_emoji ? (
                  <span>{profile.avatar_emoji}</span>
                ) : (
                  <span>{isUser ? name?.[0] ?? "?" : ai?.initial ?? "?"}</span>
                )}
              </div>

              {/* 名前・予想数 */}
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm flex items-center gap-1.5">
                  <span className="truncate">{name}</span>
                  {!isUser && (
                    <span
                      className="text-[10px] font-extrabold px-1.5 py-0.5 rounded shrink-0"
                      style={{
                        background: "var(--surface-2)",
                        color: "var(--ink-2)",
                        border: "1px solid var(--line)",
                      }}
                    >
                      AI
                    </span>
                  )}
                  {isMe && (
                    <span
                      className="text-[10px] font-extrabold px-1.5 py-0.5 rounded shrink-0"
                      style={{ background: "var(--brand)", color: "#fff" }}
                    >
                      YOU
                    </span>
                  )}
                </div>
                <div className="text-[11px] mt-0.5" style={{ color: "var(--ink-3)" }}>
                  {r.n} 予想
                </div>
              </div>

              {/* レート */}
              <div className="text-right shrink-0">
                <div className="text-lg font-black leading-none" style={{ fontFamily: "var(--font-mononum)" }}>
                  {Math.round(r.rating)}
                </div>
                {r.provisional && (
                  <div
                    className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full inline-block mt-1"
                    style={{ background: "var(--gate-gold-soft)", color: "var(--gate-gold-strong)" }}
                  >
                    暫定
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[11px] mt-3 px-1 leading-relaxed" style={{ color: "var(--ink-3)" }}>
        基準 1500。30予想までは「暫定」。レートは確定レースごとに自動更新されます。
      </p>
    </div>
  );
}
