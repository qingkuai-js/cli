import { afterEach, describe, expect, it } from "vitest";
import { createWorkspace, disposeWorkspace, startServer } from "./helpers";

const PORT = 4610;

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

describe("dev", () => {
    it("starts the server, serves the page and compiles .qk modules", async () => {
        workspace = createWorkspace("build-user-config");
        const server = await startServer(
            ["dev", "--port", String(PORT)],
            workspace,
            `http://localhost:${PORT}/`,
        );
        stopServer = server.stop;

        const page = await fetch(`http://localhost:${PORT}/`);
        expect(page.status).toBe(200);
        expect(await page.text()).toContain("<!doctype html>");

        // .qk 必须返回编译产物而非原始模板
        const module = await fetch(`http://localhost:${PORT}/src/App.qk?import`);
        expect(module.status).toBe(200);
        expect(await module.text()).toContain("createFragmentGetter");
    });
});
