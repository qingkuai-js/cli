import nodeFs from "node:fs";
import nodeOs from "node:os";
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

describe("check", () => {
    it("exits 0 for a clean project", async () => {
        workspace = createWorkspace("check-clean");
        const result = await spawnCli(["check", "src"], workspace);
        expect(result.code).toBe(0);
    });

    it("exits 1 on syntax errors with diagnostics pointing at the source location", async () => {
        workspace = createWorkspace("check-syntax-error");
        const result = await spawnCli(["check", "src"], workspace);
        expect(result.code).toBe(1);
        expect(result.output).toContain("src/Bad.qk(2,");
        expect(result.output).toContain("[Error]");
        expect(result.output).toContain("qk(1004)");
    });

    it("does not block type errors without --types (syntax checking only)", async () => {
        workspace = createWorkspace("check-type-error");
        const result = await spawnCli(["check", "src"], workspace);
        expect(result.code).toBe(0);
    });

    it("catches type errors with --types", async () => {
        workspace = createWorkspace("check-type-error");
        const result = await spawnCli(["check", "src", "--types"], workspace);
        expect(result.code).toBe(1);
        expect(result.output).toContain("not assignable");
        expect(result.output).toContain("ts(2322)");
    });

    it("falls back to tsconfig include entries when no positional files are given", async () => {
        workspace = createWorkspace("check-tsconfig-fallback");
        const result = await spawnCli(["check", "--types"], workspace);
        expect(result.code).toBe(0);
    });

    it("anchors tsconfig types resolution at the config directory, not the working directory", async () => {
        workspace = createWorkspace("check-tsconfig-fallback");
        const outsideCwd = nodeFs.mkdtempSync(nodePath.join(nodeOs.tmpdir(), "qk-cli-it-outside-"));
        try {
            const result = await spawnCli(
                ["check", "--types", "--project", nodePath.join(workspace, "tsconfig.json")],
                outsideCwd,
            );
            expect(result.code).toBe(0);
        } finally {
            disposeWorkspace(outsideCwd);
        }
    });

    it("resolves tsconfig ambient context for positional files without reporting context files", async () => {
        workspace = createWorkspace("check-tsconfig-context");
        const result = await spawnCli(["check", "--types", "src/main.ts"], workspace);
        expect(result.code).toBe(0);
        expect(result.output).not.toContain("ts(2322)");
    });

    it("reports context file errors once they fall inside the positional scope", async () => {
        workspace = createWorkspace("check-tsconfig-context");
        const result = await spawnCli(["check", "--types", "src"], workspace);
        expect(result.code).toBe(1);
        expect(result.output).toContain("ts(2322)");
    });

    it("exits 1 when no positional files are given and no tsconfig resolves files", async () => {
        workspace = createWorkspace("check-clean");
        const result = await spawnCli(["check"], workspace);
        expect(result.code).toBe(1);
        expect(result.output).toContain("no processable files");
    });
});
