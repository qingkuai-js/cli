import { defineConfig } from "eslint/config";

import js from "@eslint/js";
import tsEslint from "typescript-eslint";

export default defineConfig([
    {
        ignores: [
            "dist",
            "node_modules",
            "tmp",
            "types",
            ".tmp",
            ".tmp/**",
            "tests/units/readonly-props-repro.js",
            "tests/integration/fixtures/**",
        ],
    },
    js.configs.recommended,
    ...tsEslint.configs.recommended,

    // override
    {
        rules: {
            "@typescript-eslint/no-explicit-any": "off",
            curly: ["error", "all"],
        },
    },
]);
