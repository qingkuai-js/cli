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

describe("build", () => {
    it("respects the outDir from user config", async () => {
        workspace = createWorkspace("build-user-config");
        const result = await spawnCli(["build"], workspace);
        expect(result.code).toBe(0);
        expect(nodeFs.existsSync(nodePath.join(workspace, "custom-dist", "index.html"))).toBe(true);
        expect(nodeFs.existsSync(nodePath.join(workspace, "dist"))).toBe(false);
    });

    it("overrides the user-configured outDir with --out", async () => {
        workspace = createWorkspace("build-user-config");
        const result = await spawnCli(["build", "--out", "cli-dist"], workspace);
        expect(result.code).toBe(0);
        expect(nodeFs.existsSync(nodePath.join(workspace, "cli-dist", "index.html"))).toBe(true);
    });

    it("exits 1 on syntax errors with the error frame pointing at real source, not compiled output", async () => {
        workspace = createWorkspace("build-syntax-error");
        const result = await spawnCli(["build"], workspace);
        expect(result.code).toBe(1);
        expect(result.output).toContain("[Error]");
        expect(result.output).toContain("src/Bad.qk(2,");
        expect(result.output).toContain("vite(qingkuai-compiler)");
    });
});
