/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Syne'", "sans-serif"],
        body: ["'DM Sans'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      colors: {
        night: {
          900: "#080c14",
          800: "#0d1321",
          700: "#131c2e",
          600: "#1a2640",
          500: "#243352",
        },
        signal: {
          red:    "#ff3b3b",
          amber:  "#ffb800",
          green:  "#00d97e",
          blue:   "#3b82f6",
        }
      },
      animation: {
        "fade-up":   "fadeUp 0.5s ease forwards",
        "pulse-slow": "pulse 3s ease-in-out infinite",
        "spin-slow": "spin 3s linear infinite",
      },
      keyframes: {
        fadeUp: {
          "0%":   { opacity: 0, transform: "translateY(20px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        }
      }
    },
  },
  plugins: [],
}
