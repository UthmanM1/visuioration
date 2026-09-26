import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F4F6F4",
        surface: "#FFFFFF",
        ink: { DEFAULT: "#16191D", soft: "#3A4048", muted: "#5E6873", faint: "#8A939C" },
        line: { DEFAULT: "#DDE2DE", strong: "#C6CDC8" },
        petrol: { 50: "#EAF3F2", 100: "#D2E6E4", 200: "#A7CECA", 500: "#1B7A7F", 600: "#12656A", 700: "#0E5256", 900: "#0A3336" },
        amber: { 100: "#F8EBCF", 500: "#C98A1B", 700: "#8F5F0C" },
        dusk: { 100: "#E3E9F3", 500: "#4D6A9C", 700: "#34507F" },
        sage: { 100: "#E5EFE7", 500: "#6F9A7B", 700: "#4C7358" },
        rust: { 100: "#F6E1DB", 500: "#B5452F", 700: "#8C3322" },
        night: { DEFAULT: "#12181B", 2: "#1A2327", 3: "#243035", line: "#2E3B41" },
      },
      fontFamily: {
        sans: ["'Instrument Sans'", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        display: ["'Bricolage Grotesque'", "'Instrument Sans'", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem" }],
      },
      borderRadius: { panel: "14px", control: "8px" },
      boxShadow: {
        panel: "0 1px 0 rgba(22,25,29,0.04), 0 1px 2px rgba(22,25,29,0.04)",
        lift: "0 12px 32px -12px rgba(14,82,86,0.28)",
        overlay: "0 24px 64px -16px rgba(18,24,27,0.35)",
      },
      keyframes: {
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "rise": { from: { opacity: "0", transform: "translateY(6px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        "slide-in": { from: { transform: "translateX(-100%)" }, to: { transform: "translateX(0)" } },
        "slide-left": { from: { transform: "translateX(100%)" }, to: { transform: "translateX(0)" } },
        "slide-up": { from: { transform: "translateY(100%)" }, to: { transform: "translateY(0)" } },
        "pulse-dot": { "0%,80%,100%": { opacity: "0.25" }, "40%": { opacity: "1" } },
        shimmer: { from: { backgroundPosition: "-200% 0" }, to: { backgroundPosition: "200% 0" } },
      },
      animation: {
        "fade-in": "fade-in 160ms ease-out",
        rise: "rise 220ms ease-out",
        "slide-in": "slide-in 220ms ease-out",
        "slide-left": "slide-left 220ms ease-out",
        "slide-up": "slide-up 220ms ease-out",
        "pulse-dot": "pulse-dot 1.2s infinite ease-in-out",
        shimmer: "shimmer 1.6s linear infinite",
      },
    },
  },
  plugins: [],
};
export default config;
