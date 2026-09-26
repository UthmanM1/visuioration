"use client";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#F4F6F4", color: "#16191D", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0 }}>
        <div role="alert" style={{ textAlign: "center", maxWidth: 420, padding: 24 }}>
          <h1 style={{ fontSize: 24 }}>Visuioration could not load</h1>
          <p style={{ color: "#5E6873" }}>Something went wrong while loading the page.</p>
          <button onClick={reset} style={{ marginTop: 16, background: "#12656A", color: "white", border: 0, borderRadius: 8, padding: "10px 16px", fontSize: 14, cursor: "pointer" }}>Try again</button>
        </div>
      </body>
    </html>
  );
}
