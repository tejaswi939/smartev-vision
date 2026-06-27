import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: "#0a0a0f",
        surface: "#12121a",
        neon: "#00d4ff",
        violet: "#a855f7",
        teal: "#06d6a0",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["'Space Grotesk'", "sans-serif"],
      },
      boxShadow: { glow: "0 0 24px rgba(0,212,255,0.35)" },
    },
  },
  plugins: [],
} satisfies Config;
