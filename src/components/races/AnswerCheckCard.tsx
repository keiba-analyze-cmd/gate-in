"use client";

import { useEffect, useState } from "react";

type AIPick = {
  predictor_id: string;
  predictor_name: string;
  predictor_color?: string;
  umaban: number;
  horse_name: string;
};

type HorseRef = { umaban: number; name: string } | null;

type Props = {
  raceId: string;
  myWin: HorseRef;
  myOdds?: number | null;
  result1st: HorseRef;
  myScore?: number | null;
  isFinished: boolean;
};

export default function AnswerCheckCard({
  raceId,
  myWin,
  myOdds,
  result1st,
  myScore,
  isFinished,
}: Props) {
  const [aiPicks, setAiPicks] = useState<AIPick[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch(`/api/races/${raceId}/ai-predictions`);
        const data = await res.json();
        if (!active) return;
        if (!data.locked && !data.error) setAiPicks(data.predictions ?? []);
      } catch {
        /* noop */
      }
      if (active) setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [raceId]);

  if (!loading && aiPicks.length === 0 && !myWin) return null;

  const isHit = (umaban: number) =>
    isFinished && result1st != null && umaban === result1st.umaban;
  const matchesMe = (umaban: number) => myWin != null && umaban === myWin.umaban;

  const chip = (text: string, bg: string, color: string, weight = 800) => (
    <span
      style={{ fontSize: 10, fontWeight: weight, padding: "2px 7px", borderRadius: 999, background: bg, color }}
    >
      {text}
    </span>
  );

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: 16,
        fontFamily: "var(--font-rounded)",
        color: "var(--ink)",
        overflow: "hidden",
      }}
    >
      {/* ヘッダー */}
      <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)" }}>
        <div style={{ fontSize: 14, fontWeight: 800 }}>🎯 答え合わせ</div>
        <div style={{ fontSize: 11, color: "var(--ink-2)", marginTop: 2 }}>
          あなたの◎ と AI予想家の◎を同じ土俵で
        </div>
      </div>

      {/* 1着（確定後） */}
      {isFinished && result1st && (
        <div
          style={{
            padding: "10px 16px",
            background: "var(--gate-gold-soft)",
            borderBottom: "1px solid var(--line)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ fontSize: 11, fontWeight: 800, color: "var(--gate-gold-strong)" }}>🏁 1着</span>
          <span style={{ fontFamily: "var(--font-mononum)", fontWeight: 800, fontSize: 14 }}>{result1st.umaban}</span>
          <span style={{ fontSize: 13, fontWeight: 700 }}>{result1st.name}</span>
        </div>
      )}

      {/* あなたの◎ */}
      {myWin && (
        <div
          style={{
            padding: "11px 16px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            borderBottom: "1px solid var(--line)",
            background: "var(--brand-soft)",
          }}
        >
          <span style={{ width: 58, fontSize: 11, fontWeight: 800, color: "var(--brand-strong)", flexShrink: 0 }}>
            あなた ◎
          </span>
          <span style={{ fontFamily: "var(--font-mononum)", fontWeight: 800, fontSize: 14 }}>{myWin.umaban}</span>
          <span style={{ flex: 1, fontWeight: 700, fontSize: 13, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {myWin.name}
          </span>
          {isFinished &&
            (isHit(myWin.umaban)
              ? chip("的中", "var(--brand)", "#fff")
              : chip("外し", "var(--surface-2)", "var(--ink-3)", 700))}
        </div>
      )}

      {/* AIの◎ */}
      {aiPicks.map((p) => (
        <div
          key={p.predictor_id}
          style={{
            padding: "10px 16px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            borderBottom: "1px solid var(--line)",
          }}
        >
          <span style={{ width: 58, display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
            <span
              style={{ width: 8, height: 8, borderRadius: 999, background: p.predictor_color || "var(--ink-3)", flexShrink: 0 }}
            />
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {p.predictor_name}
            </span>
          </span>
          <span style={{ fontFamily: "var(--font-mononum)", fontWeight: 800, fontSize: 14 }}>{p.umaban}</span>
          <span style={{ flex: 1, fontWeight: 700, fontSize: 13, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {p.horse_name}
          </span>
          <span style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
            {matchesMe(p.umaban) && chip("一致", "var(--brand-soft)", "var(--brand-strong)")}
            {isFinished && isHit(p.umaban) && chip("的中", "var(--brand)", "#fff")}
          </span>
        </div>
      ))}

      {/* レート行（投票者のみ） */}
      {myWin && (
        <div style={{ padding: "12px 16px", background: "var(--surface-2)" }}>
          {!isFinished ? (
            <div style={{ fontSize: 11, color: "var(--ink-2)", lineHeight: 1.7 }}>
              結果が出ると、この予想が
              <strong style={{ color: "var(--ink)" }}>「市場（オッズ）に勝てたか」</strong>
              で実力レートが動きます。◎的中×高オッズほどプラス。
              {myOdds != null && (
                <span style={{ display: "block", marginTop: 4 }}>
                  あなたの◎オッズ{" "}
                  <span style={{ fontFamily: "var(--font-mononum)", fontWeight: 800, color: "var(--ink)" }}>{myOdds}</span> 倍。
                </span>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <div style={{ fontSize: 12 }}>
                <span style={{ color: "var(--ink-2)", fontWeight: 700 }}>市場との勝負：</span>{" "}
                {myScore == null ? (
                  <span style={{ color: "var(--ink-3)" }}>集計中</span>
                ) : myScore > 0 ? (
                  <span style={{ color: "var(--brand-strong)", fontWeight: 800 }}>
                    勝ち <span style={{ fontFamily: "var(--font-mononum)" }}>+{myScore.toFixed(2)}</span>
                  </span>
                ) : (
                  <span style={{ color: "var(--danger)", fontWeight: 800 }}>
                    届かず <span style={{ fontFamily: "var(--font-mononum)" }}>{myScore.toFixed(2)}</span>
                  </span>
                )}
              </div>
              <a href="/arena" style={{ fontSize: 12, fontWeight: 800, color: "var(--brand-strong)", textDecoration: "none" }}>
                アリーナで実力レートを見る →
              </a>
            </div>
          )}
        </div>
      )}

      {loading && aiPicks.length === 0 && (
        <div style={{ padding: "12px 16px", fontSize: 11, color: "var(--ink-3)" }}>AIの◎を読み込み中…</div>
      )}
    </div>
  );
}
