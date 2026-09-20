import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#08090d",
          900: "#0d0f14",
          850: "#12141b",
          800: "#171a22",
          700: "#20242e",
          600: "#2b3040",
          500: "#3b4257",
        },
        brand: {
          400: "#8b7cff",
          500: "#6d5cf6",
          600: "#5444e0",
        },
        accent: {
          cyan: "#3ad6d6",
          amber: "#ffb454",
          rose: "#ff6b8a",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      boxShadow: {
        panel: "0 1px 0 rgba(255,255,255,0.04) inset, 0 10px 30px -12px rgba(0,0,0,0.8)",
      },
    },
  },
  plugins: [],
};

export default config;
