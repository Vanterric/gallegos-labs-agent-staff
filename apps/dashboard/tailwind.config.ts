import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        nimbus: {
          bg: "#0a0e1a",
          "bg-secondary": "#111827",
          "bg-tertiary": "#1e293b",
          "surface-elevated": "#080c16",
          "text-primary": "#f1f5f9",
          "text-muted": "#94a3b8",
          "text-subtle": "#64748b",
          accent: "#3b82f6",
          "accent-cyan": "#06b6d4",
          border: "#1e293b",
          "border-accent": "rgba(59, 130, 246, 0.3)",
          success: "#10b981",
          warning: "#f59e0b",
          error: "#ef4444",
          violet: "#8b5cf6",
        },
      },
      fontFamily: {
        sans: [
          "Geist",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
        mono: ["Geist Mono", "ui-monospace", "monospace"],
      },
      borderRadius: {
        card: "12px",
        btn: "8px",
        input: "8px",
      },
    },
  },
  plugins: [],
};

export default config;
