import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      colors: {
        ink: "#09090b",
        slateMist: "#fafafa",
        tealCore: "#4f46e5",
        sand: "#f8f3e7",
        amberSoft: "#fbbf24"
      },
      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.06)",
        "card-hover": "0 4px 16px rgba(0,0,0,0.10)",
        glow: "0 0 0 3px rgba(79, 70, 229, 0.18)"
      },
      animation: {
        "slide-in": "slideIn 0.24s cubic-bezier(0.16, 1, 0.3, 1)",
        "fade-up": "fadeUp 0.18s ease-out"
      },
      keyframes: {
        slideIn: {
          "0%": { transform: "translateX(calc(100% + 24px))", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" }
        },
        fadeUp: {
          "0%": { transform: "translateY(6px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" }
        }
      }
    }
  },
  plugins: []
};

export default config;
