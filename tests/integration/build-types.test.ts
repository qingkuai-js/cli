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

describe("build-types", () => {
    it("emits declaration files for a clean project", async () => {
        workspace = createWorkspace("build-types-clean");
        const result = await spawnCli(["build-types", "src", "--out", "dist"], workspace);
        expect(result.code).toBe(0);

        const declaration = nodeFs.readFileSync(
            nodePath.join(workspace, "dist", "index.d.ts"),
            "utf-8",
        );
        expect(declaration).toContain("interface Point");
        expect(declaration).toContain("distance");
    });

    it("blocks emission on type errors (diagnostics gate before emit)", async () => {
        workspace = createWorkspace("build-types-type-error");
        const result = await spawnCli(["build-types", "src", "--out", "dist"], workspace);
        expect(result.code).toBe(1);
        expect(result.output).toContain("ts(2322)");
        expect(nodeFs.existsSync(nodePath.join(workspace, "dist"))).toBe(false);
    });

    it("exits 1 when there are no processable files", async () => {
        workspace = createWorkspace("format-mixed");
        const result = await spawnCli(["build-types"], workspace);
        expect(result.code).toBe(1);
        expect(result.output).toContain("no processable files");
    });

    it("emits declarations from the tsconfig include fallback when no positional files are given", async () => {
        workspace = createWorkspace("check-tsconfig-fallback");
        const result = await spawnCli(["build-types", "--out", "dist"], workspace);
        expect(result.code).toBe(0);
        const declaration = nodeFs.readFileSync(
            nodePath.join(workspace, "dist", "main.d.ts"),
            "utf-8",
        );
        expect(declaration).toContain("a: number");
    });

    it("emits declarations only for positional files when the program includes project context", async () => {
        workspace = createWorkspace("check-tsconfig-context");
        const result = await spawnCli(["build-types", "src/main.ts", "--out", "dist"], workspace);
        expect(result.code).toBe(0);
        expect(nodeFs.existsSync(nodePath.join(workspace, "dist", "main.d.ts"))).toBe(true);
        expect(nodeFs.existsSync(nodePath.join(workspace, "dist", "broken.d.ts"))).toBe(false);
        expect(nodeFs.existsSync(nodePath.join(workspace, "dist", "env.d.ts"))).toBe(false);
    });
});
