import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Brand palette — dark base, one bold accent.
        night: {
          DEFAULT: "#0B0B0D", // page background
          900: "#0B0B0D",
          800: "#141418", // cards / raised surfaces
          700: "#1E1E24", // borders, inputs
          600: "#2A2A33",
        },
        chalk: {
          DEFAULT: "#F5F5F0", // primary text
          muted: "#A1A1AA", // secondary text
        },
        accent: {
          DEFAULT: "#C8FF00", // electric lime
          hover: "#B4E600",
          ink: "#0B0B0D", // text on accent
        },
      },
      fontFamily: {
        // CSS variables are injected by next/font in app/layout.tsx
        display: ["var(--font-display)", "Impact", "sans-serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      letterSpacing: {
        headline: "0.01em",
      },
    },
  },
  plugins: [],
};

export default config;
