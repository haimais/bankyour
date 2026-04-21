import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./context/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: "var(--color-primary)",
        primaryDark: "var(--color-primary-dark)",
        surface: "var(--color-surface)",
        slateText: "var(--color-text)",
        slateMuted: "var(--color-muted)",
        success: "var(--color-success)"
      },
      boxShadow: {
        soft: "0 10px 30px -12px rgba(37, 99, 235, 0.2)",
        card: "0 12px 24px -16px rgba(15, 23, 42, 0.25)"
      },
      backgroundImage: {
        "fintech-grid": "linear-gradient(rgba(37, 99, 235, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(37, 99, 235, 0.08) 1px, transparent 1px)"
      }
    }
  },
  plugins: []
};

export default config;
