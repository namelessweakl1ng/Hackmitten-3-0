import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [...nextCoreWebVitals, ...nextTypescript, {
  rules: {
    // The codebase uses targeted `any` for Prisma JSON fields and form payloads.
    "@typescript-eslint/no-explicit-any": "off",
    // We allow intentionally-unused params (e.g., error catch arms).
    "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    "@typescript-eslint/no-non-null-assertion": "off",
    "@typescript-eslint/ban-ts-comment": "off",

    // React
    "react-hooks/exhaustive-deps": "off",
    "react/no-unescaped-entities": "off",
    "react/display-name": "off",
    "react/prop-types": "off",

    // Next.js — we use <img> in a few custom components for non-optimized assets.
    "@next/next/no-img-element": "off",
  },
}, {
  ignores: [
    "node_modules/**",
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "examples/**",
    "skills/**",
    "agent-ctx/**",
    "mini-services/**",
  ],
}];

export default eslintConfig;
