import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

const config = [
  { ignores: [".next/**", "node_modules/**", "next-env.d.ts"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Every image needs an alt: descriptive for meaningful images, alt="" for decorative ones.
      "jsx-a11y/alt-text": ["error", { elements: ["img", "object", "area", 'input[type="image"]'], img: ["Image"] }],
      "jsx-a11y/img-redundant-alt": "error",
    },
  },
];

export default config;
