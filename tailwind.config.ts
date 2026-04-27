import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0f172a",
        slateMist: "#f8fafc",
        tealCore: "#0f766e",
        sand: "#f8f3e7",
        amberSoft: "#fbbf24"
      },
      boxShadow: {
        card: "0 12px 30px rgba(15, 23, 42, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
