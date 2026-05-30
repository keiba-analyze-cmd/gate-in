"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type State = {
  loading: boolean;
  rating: number | null;
  n: number;
  provisional: boolean;
  rank: number | null;
};

export default function RatingBlock({ userId }: { userId: string }) {
  const [s, setS] = useState<State>({
    loading: true,
    rating: null,
    n: 0,
    provisional: false,
    rank: null,
  });

  useEffect(() => {
    let active = true;
    (async () => {
      const supabase = await createClient();
      const { data: row } = await supabase
        .from("predictor_ratings")
        .select("rating, n, provisional")
        .eq("predictor_type", "user")
        .eq("predictor_id", userId)
        .maybeSingle();
      if (!active) return;
      if (!row) {
        setS({ loading: false, rating: null, n: 0, provisional: false, rank: null });
        return;
      }
      const { count } = await supabase
        .from("predictor_ratings")
        .select("*", { count: "exact", head: true })
        .gt("rating", row.rating);
      if (!active) return;
      setS({
        loading: false,
        rating: row.rating,
        n: row.n,
        provisional: row.provisional,
        rank: (count ?? 0) + 1,
      });
    })();
    return () => {
      active = false;
    };
  }, [userId]);

  const box: React.CSSProperties = {
    background: "var(--brand-soft)",
    border: "1px solid var(--line)",
    borderRadius: 16,
    padding: "14px 16px",
    fontFamily: "var(--font-rounded)",
  };

  if (s.loading) {
    return <div style={{ ...box, color: "var(--ink-3)", fontSize: 12 }}>レート読み込み中…</div>;
  }

  if (s.rating === null) {
    return (
      <div style={{ ...box, color: "var(--ink-2)", fontSize: 12 }}>
        🏟 実力レート ── まだ確定レースの予想がありません。
      </div>
    );
  }

  return (
    <div style={box}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 12, fontWeight: 800, color: "var(--brand-strong)" }}>🏟 実力レート</span>
        {s.rank != null && (
          <a
            href="/arena"
            style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-2)", textDecoration: "none" }}
          >
            アリーナ全体 {s.rank}位 →
          </a>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 4 }}>
        <span
          style={{
            fontFamily: "var(--font-mononum)",
            fontSize: 34,
            fontWeight: 800,
            lineHeight: 1,
            color: "var(--ink)",
          }}
        >
          {Math.round(s.rating)}
        </span>
        {s.provisional && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 800,
              padding: "2px 8px",
              borderRadius: 999,
              background: "var(--gate-gold-soft)",
              color: "var(--gate-gold-strong)",
            }}
          >
            暫定
          </span>
        )}
      </div>
      <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 6 }}>
        {s.n}予想 · 「市場（オッズ）に勝てたか」で測定（基準1500）
      </div>
    </div>
  );
}
