import nodeFs from "node:fs";
import nodePath from "node:path";

import { afterEach, describe, expect, it } from "vitest";
import { createWorkspace, disposeWorkspace, spawnCli } from "./helpers";

let workspace: string;

afterEach(() => {
    if (workspace) {
        disposeWorkspace(workspace);
        workspace = undefined as unknown as string;
    }
});

describe("format", () => {
    it("detects unformatted files with --check and exits 1", async () => {
        workspace = createWorkspace("format-mixed");
        const result = await spawnCli(["format", "src", "--check"], workspace);
        expect(result.code).toBe(1);
        expect(result.output).toContain("Would Format");
    });

    it("writes formatted results to disk with --write and passes a re-check", async () => {
        workspace = createWorkspace("format-mixed");
        const write = await spawnCli(["format", "src", "--write"], workspace);
        expect(write.code).toBe(0);

        expect(nodeFs.readFileSync(nodePath.join(workspace, "src", "code.ts"), "utf-8")).toBe(
            "const a = 1;\n",
        );
        expect(
            nodeFs.readFileSync(nodePath.join(workspace, "src", "style.css"), "utf-8"),
        ).toContain("color: red;");

        const recheck = await spawnCli(["format", "src", "--check"], workspace);
        expect(recheck.code).toBe(0);
    });
});
