import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title") ?? "ゲートイン！";
  const grade = searchParams.get("grade") ?? "";
  const course = searchParams.get("course") ?? "";
  const date = searchParams.get("date") ?? "";

  const gradeColors: Record<string, { bg: string; text: string }> = {
    G1: { bg: "#eab308", text: "#fff" },
    G2: { bg: "#dc2626", text: "#fff" },
    G3: { bg: "#16a34a", text: "#fff" },
  };
  const gc = gradeColors[grade] ?? { bg: "#6b7280", text: "#fff" };

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "linear-gradient(135deg, #16a34a 0%, #15803d 50%, #166534 100%)",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Background pattern */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0.1, display: "flex", fontSize: "120px" }}>
          🏇🏇🏇
        </div>

        {/* Grade badge */}
        {grade && (
          <div
            style={{
              background: gc.bg,
              color: gc.text,
              fontSize: "36px",
              fontWeight: 900,
              padding: "8px 32px",
              borderRadius: "12px",
              marginBottom: "16px",
            }}
          >
            {grade}
          </div>
        )}

        {/* Race name */}
        <div
          style={{
            color: "white",
            fontSize: title.length > 12 ? "56px" : "72px",
            fontWeight: 900,
            textAlign: "center",
            padding: "0 60px",
            lineHeight: 1.2,
          }}
        >
          {title}
        </div>

        {/* Course / Date */}
        {(course || date) && (
          <div style={{ color: "rgba(255,255,255,0.8)", fontSize: "28px", marginTop: "16px", fontWeight: 600 }}>
            {date && date} {course && course}
          </div>
        )}

        {/* CTA */}
        <div
          style={{
            marginTop: "32px",
            background: "white",
            color: "#16a34a",
            fontSize: "28px",
            fontWeight: 900,
            padding: "12px 48px",
            borderRadius: "999px",
          }}
        >
          みんなの予想で腕試し →
        </div>

        {/* Logo */}
        <div style={{ position: "absolute", bottom: "24px", right: "32px", display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "28px" }}>🏇</span>
          <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "22px", fontWeight: 900 }}>
            ゲートイン！
          </span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
