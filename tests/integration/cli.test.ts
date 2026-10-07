import nodeOs from "node:os";

import { spawnCli } from "./helpers";
import { describe, expect, it } from "vitest";

describe("dispatch", () => {
    it("--version exits 0 and prints a version", async () => {
        const result = await spawnCli(["--version"], nodeOs.tmpdir());
        expect(result.code).toBe(0);
        expect(result.stdout).toMatch(/\d+\.\d+\.\d+/);
    });

    it("--help lists all commands", async () => {
        const result = await spawnCli(["--help"], nodeOs.tmpdir());
        expect(result.code).toBe(0);
        for (const command of ["check", "dev", "build", "preview", "build-types", "format"]) {
            expect(result.stdout).toContain(command);
        }
    });

    it("unknown command exits 1 with an error", async () => {
        const result = await spawnCli(["definitely-not-a-command"], nodeOs.tmpdir());
        expect(result.code).toBe(1);
        expect(result.output).toContain("[Error]");
        expect(result.output).toContain("Command is required");
    });
});
