import reactHooks from "eslint-plugin-react-hooks";

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    files: ["api/src/**/*.js", "web/src/**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-console": "off",
    },
  },
  {
    // Scoped to just the two classic hooks rules, not the full `recommended`/`recommended-latest`
    // bundle — v7 folds in the newer React Compiler rule set (purity, immutability,
    // set-state-in-render, etc.), a much stricter, unreviewed-for-this-codebase set of checks.
    // These two are what the existing `eslint-disable-next-line react-hooks/exhaustive-deps`
    // comments in the codebase already assume exist.
    files: ["web/src/**/*.{js,jsx}"],
    plugins: { "react-hooks": reactHooks },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
];
