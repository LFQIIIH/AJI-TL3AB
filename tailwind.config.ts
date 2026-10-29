import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Brand palette — light base, deep green chrome, lime highlights.
        canvas: {
          DEFAULT: "#F5F7F2", // main background
          deep: "#EAEFE4", // alternate section bands
        },
        surface: "#FFFFFF", // cards and input fields
        forest: {
          DEFAULT: "#12372A", // navigation and footer
          light: "#1D4A3A", // borders / hovers on forest
        },
        primary: {
          DEFAULT: "#1E8E5A", // primary buttons, accent text on light bg
          hover: "#187A4C",
          ink: "#FFFFFF", // text on primary
        },
        highlight: {
          DEFAULT: "#C7F36B", // highlights and active states
          ink: "#12372A", // text on highlight
        },
        ink: {
          DEFAULT: "#17212B", // main text
          muted: "#5A6672", // secondary text
        },
        line: {
          DEFAULT: "#DDE3D7", // borders, dividers, tracks
          strong: "#C3CCBD",
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
