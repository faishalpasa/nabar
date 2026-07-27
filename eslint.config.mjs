/**
 * Diadaptasi dari reklub/admin-dashboard/eslint.config.js supaya gaya kode
 * konsisten antar project: double quote, tanpa semicolon, komponen arrow
 * function, import terurut dengan baris kosong antar grup.
 *
 * Tiga penyesuaian karena project ini Next.js, bukan Vite:
 *   1. Aturan eslint-config-next tetap dipakai (core-web-vitals + typescript) —
 *      itu yang menangkap masalah khas Next seperti <img> mentah.
 *   2. parserOptions.project hanya ./tsconfig.json (tidak ada tsconfig.app.json
 *      / tsconfig.test.json di sini).
 *   3. components/ui/** diabaikan: file bawaan shadcn yang di-regenerate lewat
 *      CLI, bukan kode yang kita rawat sendiri.
 *   4. Blok `plugins` hanya mendaftarkan prettier (lihat komentar di bawah).
 */
import js from "@eslint/js"
import tsparser from "@typescript-eslint/parser"
import { defineConfig, globalIgnores } from "eslint/config"
import nextVitals from "eslint-config-next/core-web-vitals"
import nextTs from "eslint-config-next/typescript"
import prettierPlugin from "eslint-plugin-prettier"
import globals from "globals"

export const BASE_CONFIG = js.configs.recommended

export const GLOBAL_SETTINGS = {
  languageOptions: {
    globals: {
      ...globals.browser,
      ...globals.es2021,
      ...globals.node,
    },
  },
}

export const TYPESCRIPT_CONFIG = {
  files: ["**/*.{ts,tsx}"],
  languageOptions: {
    parser: tsparser,
    parserOptions: {
      project: ["./tsconfig.json"],
      ecmaFeatures: {
        jsx: true,
      },
    },
  },
  // Hanya prettier yang didaftarkan di sini. react, react-hooks, jsx-a11y,
  // import, dan @typescript-eslint sudah didaftarkan eslint-config-next —
  // mendaftarkannya lagi memicu "Cannot redefine plugin". Aturannya tetap bisa
  // dipakai di blok ini karena plugin-nya terdaftar di array config yang sama.
  plugins: {
    prettier: prettierPlugin,
  },
  rules: {
    // TypeScript specific rules
    "no-redeclare": "off",
    "@typescript-eslint/no-redeclare": "off",
    "@typescript-eslint/no-unused-vars": [
      "error",
      {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
      },
    ],
    "@typescript-eslint/no-empty-function": "off",
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/ban-ts-comment": "warn",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/no-non-null-assertion": "warn",
    "@typescript-eslint/prefer-nullish-coalescing": "off",
    "@typescript-eslint/prefer-optional-chain": "error",
    "@typescript-eslint/no-floating-promises": "off",
    "@typescript-eslint/await-thenable": "error",
    "@typescript-eslint/no-misused-promises": "off",
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/explicit-member-accessibility": "off",

    // Import rules
    "import/extensions": "off",
    "import/no-anonymous-default-export": "off",
    "import/no-cycle": "warn",
    "import/no-extraneous-dependencies": "warn",
    "import/no-named-as-default": "off",
    "import/no-unresolved": "off",
    "import/order": [
      "error",
      {
        groups: [
          "builtin",
          "external",
          "internal",
          "parent",
          "sibling",
          "index",
        ],
        "newlines-between": "always",
        alphabetize: {
          order: "asc",
          caseInsensitive: true,
        },
      },
    ],
    "import/prefer-default-export": "off",
    "import/no-duplicates": "error",

    // React specific rules
    "react/display-name": "off",
    "react/require-default-props": "off",
    "react/function-component-definition": [
      "error",
      {
        namedComponents: "arrow-function",
        unnamedComponents: "arrow-function",
      },
    ],
    "react/jsx-filename-extension": [
      "error",
      {
        extensions: [".js", ".jsx", ".ts", ".tsx"],
      },
    ],
    "react/jsx-handler-names": "warn",
    "react/jsx-props-no-spreading": "off",
    "react/jsx-no-duplicate-props": [
      "error",
      {
        ignoreCase: false,
      },
    ],
    "react/react-in-jsx-scope": "off",
    "react/no-array-index-key": "off",
    "react/no-children-prop": "off",
    "react/prop-types": "off",
    "react/jsx-key": "error",
    "react/jsx-no-undef": "error",
    "react/no-danger": "warn",
    "react/no-deprecated": "warn",
    "react/no-direct-mutation-state": "error",
    "react/no-find-dom-node": "warn",
    "react/no-is-mounted": "error",
    "react/no-render-return-value": "error",
    "react/no-string-refs": "error",
    "react/no-unescaped-entities": "warn",
    "react/no-unknown-property": "warn",
    "react/self-closing-comp": "error",
    "react/sort-comp": "off",

    // React Hooks rules
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn",

    // Accessibility rules
    "jsx-a11y/alt-text": "error",
    "jsx-a11y/anchor-has-content": "error",
    "jsx-a11y/anchor-is-valid": "error",
    "jsx-a11y/aria-props": "error",
    "jsx-a11y/aria-proptypes": "error",
    "jsx-a11y/aria-unsupported-elements": "error",
    "jsx-a11y/role-has-required-aria-props": "error",
    "jsx-a11y/role-supports-aria-props": "error",

    // General rules
    "implicit-arrow-linebreak": "off",
    "linebreak-style": "off",
    "no-param-reassign": [
      "error",
      {
        ignorePropertyModificationsFor: [
          "acc",
          "accumulator",
          "e",
          "ctx",
          "context",
          "headers",
          "req",
          "request",
          "res",
          "response",
          "$scope",
          "staticContext",
          "state",
        ],
        props: true,
      },
    ],
    "no-restricted-exports": ["off", { restrictedNamedExports: ["default"] }],
    "no-useless-catch": "warn",
    "no-undef": "off",
    "no-underscore-dangle": "off",
    "no-unused-vars": "off",
    "no-use-before-define": "off",
    "no-console": "warn",
    "no-debugger": "error",
    "no-alert": "warn",
    "no-eval": "error",
    "no-implied-eval": "error",
    "no-new-func": "error",
    "no-var": "error",
    "prefer-const": "error",
    "prefer-arrow-callback": "error",
    "arrow-body-style": ["error", "as-needed"],

    // Prettier integration
    "prettier/prettier": [
      "warn",
      {
        endOfLine: "auto",
        semi: false,
      },
    ],
  },
  settings: {
    react: {
      version: "detect",
    },
    "import/resolver": {
      typescript: { project: ["./tsconfig.json"] },
      node: {
        extensions: [".js", ".jsx", ".ts", ".tsx"],
      },
    },
  },
}

export const IGNORE_PATTERNS = globalIgnores([
  "node_modules/**",
  ".next/**",
  "out/**",
  "build/**",
  "dist/**",
  "coverage/**",
  "next-env.d.ts",
  "*.config.js",
  "*.config.mjs",
  "*.config.ts",
  // Komponen bawaan shadcn — di-regenerate lewat CLI, jangan diformat ulang.
  "components/ui/**",
])

export const ESLINT_CONFIGS = defineConfig([
  BASE_CONFIG,
  GLOBAL_SETTINGS,
  ...nextVitals,
  ...nextTs,
  TYPESCRIPT_CONFIG,
  IGNORE_PATTERNS,
])

export default ESLINT_CONFIGS
