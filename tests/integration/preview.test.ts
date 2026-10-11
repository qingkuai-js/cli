import { afterEach, describe, expect, it } from "vitest";

import { createWorkspace, disposeWorkspace, spawnCli, startServer } from "./helpers";

const PORT = 4620;

let workspace: string;
let stopServer: (() => Promise<void>) | undefined;

afterEach(async () => {
    if (stopServer) {
        await stopServer();
        stopServer = undefined;
    }
    if (workspace) {
        disposeWorkspace(workspace);
        workspace = undefined as unknown as string;
    }
});

describe("preview", () => {
    it("exits 1 with a build-first hint when the output directory is missing", async () => {
        workspace = createWorkspace("build-user-config");
        const result = await spawnCli(["preview"], workspace);
        expect(result.code).toBe(1);
        expect(result.output).toContain("Run 'qingkuai build' first.");
    });

    it("serves the built output after a build (reads the user-configured outDir)", async () => {
        workspace = createWorkspace("build-user-config");
        const build = await spawnCli(["build"], workspace);
        expect(build.code).toBe(0);

        const server = await startServer(
            ["preview", "--port", String(PORT)],
            workspace,
            `http://localhost:${PORT}/`,
        );
        stopServer = server.stop;

        const page = await fetch(`http://localhost:${PORT}/`);
        expect(page.status).toBe(200);
        expect(await page.text()).toContain("<!doctype html>");
    });
});
