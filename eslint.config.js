// ESLint flat config for @zakadi/node. The client never logs, so tokens cannot leak
// through it (spec/02-api.md 2.11): no-console is an error in every file.
import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores(["dist/"]),
  {
    files: ["**/*.{js,ts}"],
    extends: [js.configs.recommended],
    languageOptions: { globals: globals.nodeBuiltin },
    rules: { "no-console": "error" },
  },
  {
    files: ["**/*.ts"],
    extends: [tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
]);
