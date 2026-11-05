import { ImageResponse } from "next/og";

export const alt = "Demoze — anonymous salaries and job reviews in Ethiopia";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Lightweight text-only Open Graph image, generated at build time. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: "#0b0b12",
          color: "#f5f3ff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", fontSize: 120, fontWeight: 800 }}>
          demoz
          <span
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 110,
              height: 110,
              marginLeft: 4,
              borderRadius: "55px 55px 55px 12px",
              background: "#7c3aed",
              color: "white",
              fontSize: 90,
            }}
          >
            e
          </span>
        </div>
        <div style={{ marginTop: 30, fontSize: 48, color: "#a78bfa" }}>
          Anonymous salaries & job reviews in Ethiopia
        </div>
        <div style={{ marginTop: 16, fontSize: 32, color: "#d4d4d8" }}>
          Real pay in ETB · No accounts · Verified payslips
        </div>
      </div>
    ),
    size,
  );
}
