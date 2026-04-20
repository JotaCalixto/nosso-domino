import type { Config } from "tailwindcss";

export default {
  darkMode: ["selector", '[data-theme="dark"]'],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["Rajdhani", "sans-serif"],
        rajdhani: ["Rajdhani", "sans-serif"],
        body: ["Inter", "sans-serif"],
      },
      colors: {
        jota: {
          50: "#eff6ff",
          200: "#bfdbfe",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          DEFAULT: "#2563eb",
          700: "#1d4ed8",
          900: "#1e3a8a",
        },
        iza: {
          50: "#ffffff",
          100: "#f8fafc",
          200: "#e2e8f0",
          300: "#e2e8f0",
          400: "#cbd5e1",
          DEFAULT: "#f1f5f9",
          500: "#94a3b8",
          700: "#64748b",
        },
        gold: {
          300: "#fcd34d",
          400: "#fbbf24",
          DEFAULT: "#f59e0b",
          600: "#d97706",
        },
        surface: {
          1: "var(--bg-base)",
          2: "var(--bg-surface)",
          3: "var(--bg-raised)",
          base: "#08090f",
          card: "#0f1117",
          raised: "#171923",
          overlay: "#1e2130",
          felt: "#0d1117",
        },
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          muted: "var(--text-muted)",
        },
      },
      animation: {
        "pulse-ring": "pulse-ring 1.5s ease-in-out infinite",
        "glow-end": "glow-end 1s ease-in-out infinite alternate",
        shake: "shake 300ms ease",
        float: "float 3s ease-in-out infinite",
        "fade-in": "fade-in 400ms ease-out",
        "slide-up": "slide-up 400ms ease-out",
        "scale-in": "scale-in 500ms cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
      keyframes: {
        "pulse-ring": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(37,99,235,0.4)" },
          "50%": { boxShadow: "0 0 0 8px rgba(37,99,235,0)" },
        },
        "glow-end": {
          from: { boxShadow: "0 0 12px rgba(251,191,36,0.5)" },
          to: { boxShadow: "0 0 24px rgba(251,191,36,0.9), 0 0 48px rgba(251,191,36,0.4)" },
        },
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "20%": { transform: "translateX(-6px)" },
          "40%": { transform: "translateX(6px)" },
          "60%": { transform: "translateX(-4px)" },
          "80%": { transform: "translateX(4px)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-up": {
          from: { transform: "translateY(16px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        "scale-in": {
          from: { transform: "scale(0.8)", opacity: "0" },
          to: { transform: "scale(1)", opacity: "1" },
        },
      },
      boxShadow: {
        jota: "0 0 32px rgba(37,99,235,0.5), 0 4px 16px rgba(0,0,0,0.5)",
        iza: "0 0 32px rgba(241,245,249,0.3), 0 4px 16px rgba(0,0,0,0.5)",
        gold: "0 0 32px rgba(251,191,36,0.4), 0 4px 16px rgba(0,0,0,0.5)",
        premium: "0 8px 32px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.4)",
      },
    },
  },
  plugins: [],
} satisfies Config;
