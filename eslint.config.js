import js from "@eslint/js";
import globals from "globals";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";

export default [
  { ignores: ["dist/", "node_modules/", "coverage/"] },
  js.configs.recommended,
  {
    files: ["**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    settings: { react: { version: "18" } },
    plugins: { react, "react-hooks": reactHooks },
    rules: {
      ...react.configs.recommended.rules,
      ...react.configs["jsx-runtime"].rules,
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "off",      // deps are intentionally coarse (whole state object)
      "react/prop-types": "off",                 // no PropTypes in this codebase
      "react/no-unescaped-entities": "off",      // German quotes in copy
      "no-unused-vars": ["warn", { args: "none", varsIgnorePattern: "^_", ignoreRestSiblings: true }],
      "no-empty": ["error", { allowEmptyCatch: true }],
    },
  },
  { files: ["public/sw.js"], languageOptions: { globals: { ...globals.serviceworker } } },
  { files: ["tests/**", "vite.config.js", "eslint.config.js"], languageOptions: { globals: { ...globals.node } } },
];
