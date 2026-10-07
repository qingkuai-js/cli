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
});
