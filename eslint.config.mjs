// Next 16 removed `next lint`; ESLint runs directly with the flat config.
// Same rules as the old .eslintrc.json.
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  ...nextVitals,
  {
    rules: {
      "no-console": ["warn", { allow: ["warn", "error"] }],
      eqeqeq: ["error", "always", { null: "ignore" }],
      "no-var": "error",
      "prefer-const": "error",
    },
  },
  // scripts/art: Node CommonJS art renderer, not part of the app bundle.
  globalIgnores([".next/", "node_modules/", "static-site/", "coverage/", ".claude/", "scripts/art/"]),
]);
