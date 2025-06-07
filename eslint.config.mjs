import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import prettierPlugin from "eslint-plugin-prettier";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
    plugins: {
      js,
      prettier: prettierPlugin,
    },
    extends: [
      "js/recommended",
      "plugin:prettier/recommended", // 💡 이 한 줄이 핵심
    ],
    rules: {
      "prettier/prettier": "error", // 💥 Prettier 기준 위반 시 ESLint 에러
    },
  },
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
    languageOptions: {
      globals: globals.browser,
    },
  },
  tseslint.configs.recommended,
]);