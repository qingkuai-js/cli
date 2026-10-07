import nodePath from "node:path";

import { defineConfig } from "vitest/config";

export default defineConfig({
    resolve: {
        alias: {
            "#type-declarations": nodePath.resolve(import.meta.dirname, "src/types.ts"),
        },
    },
    test: {
        include: ["tests/units/**/*.test.ts", "tests/integration/**/*.test.ts"],
        globalSetup: ["./tests/global-teardown.ts"],
        testTimeout: 30000,
    },
});
