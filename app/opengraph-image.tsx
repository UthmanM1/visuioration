import { ImageResponse } from "next/og";

export const alt = "Visuioration: Turn complex data into clear decisions.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  const bars = [120, 160, 140, 210, 190, 260, 240, 320];
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#12181B", color: "white", padding: 72 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 44 }}>
            <div style={{ width: 12, height: 20, background: "#5FB3B6", borderRadius: 3 }} />
            <div style={{ width: 12, height: 32, background: "#FFFFFF", borderRadius: 3 }} />
            <div style={{ width: 12, height: 44, background: "#C98A1B", borderRadius: 3 }} />
          </div>
          <div style={{ fontSize: 36, fontWeight: 700 }}>Visuioration</div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column", maxWidth: 640 }}>
            <div style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.02, letterSpacing: -2 }}>Turn complex data into clear decisions.</div>
            <div style={{ fontSize: 26, color: "rgba(255,255,255,0.65)", marginTop: 24 }}>Visualizations, AI insights and reports in one workspace.</div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 12, height: 320 }}>
            {bars.map((h, i) => (
              <div key={i} style={{ width: 34, height: h, borderRadius: 6, background: i === bars.length - 1 ? "#C98A1B" : "#1F4A4E" }} />
            ))}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
