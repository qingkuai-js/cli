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
        testTimeout: 40000,
        maxWorkers: process.env.CI ? 1 : undefined,
        globalSetup: ["./tests/global-teardown.ts"],
    },
});
