import { afterEach, describe, expect, it } from "vitest";

import nodeFs from "node:fs";
import nodeOs from "node:os";
import nodePath from "node:path";
import nodeChildProcess from "node:child_process";

import { CLI_ENTRY, REPO_ROOT, disposeWorkspace, spawnCli } from "./helpers";

// 生成物直接过 check + build 形成闭环：模板正确性验证。
function linkRuntime(dir: string) {
    const modulesDir = nodePath.join(dir, "node_modules");
    nodeFs.mkdirSync(modulesDir, { recursive: true });
    nodeFs.symlinkSync(
        nodePath.join(REPO_ROOT, "node_modules", "qingkuai"),
        nodePath.join(modulesDir, "qingkuai"),
        "dir",
    );
    nodeFs.mkdirSync(nodePath.join(modulesDir, "@qingkuai"));
    nodeFs.symlinkSync(REPO_ROOT, nodePath.join(modulesDir, "@qingkuai", "cli"), "dir");
}

let workspace: string;

afterEach(() => {
    if (workspace) {
        disposeWorkspace(workspace);
        workspace = undefined as unknown as string;
    }
});

describe("init", () => {
    it("js template (default): file tree, CLI scripts, version injection, title replacement, dotfile restoration", async () => {
        workspace = nodeFs.mkdtempSync(nodePath.join(nodeOs.tmpdir(), "qk-cli-it-"));
        const result = await spawnCli(["init", "my-app"], workspace);
        expect(result.code).toBe(0);

        const appDir = nodePath.join(workspace, "my-app");
        for (const file of [
            "index.html",
            "package.json",
            ".gitignore",
            ".qingkuairc",
            "src/main.js",
            "src/App.qk",
            "src/components/Hello.qk",
        ]) {
            expect(nodeFs.existsSync(nodePath.join(appDir, file))).toBe(true);
        }
        expect(nodeFs.existsSync(nodePath.join(appDir, "_gitignore"))).toBe(false);
        expect(nodeFs.existsSync(nodePath.join(appDir, "vite.config.js"))).toBe(false);

        const html = nodeFs.readFileSync(nodePath.join(appDir, "index.html"), "utf-8");
        expect(html).toContain("<title>my-app</title>");

        const pkg = JSON.parse(nodeFs.readFileSync(nodePath.join(appDir, "package.json"), "utf-8"));
        expect(pkg.name).toBe("my-app");
        expect(pkg.scripts).toEqual({
            dev: "qingkuai dev",
            build: "qingkuai build",
            preview: "qingkuai preview",
            check: "qingkuai check src",
            format: "qingkuai format src --write",
        });
        const cliVersion = JSON.parse(
            nodeFs.readFileSync(nodePath.join(REPO_ROOT, "package.json"), "utf-8"),
        ).version;
        expect(pkg.dependencies).toEqual({ qingkuai: expect.stringMatching(/^~?\d/) });
        expect(pkg.devDependencies).toEqual({ "@qingkuai/cli": cliVersion });
    });

    it("ts template: --ts emits main.ts and tsconfig.json", async () => {
        workspace = nodeFs.mkdtempSync(nodePath.join(nodeOs.tmpdir(), "qk-cli-it-"));
        const result = await spawnCli(["init", "my-ts-app", "--ts"], workspace);
        expect(result.code).toBe(0);

        const appDir = nodePath.join(workspace, "my-ts-app");
        expect(nodeFs.existsSync(nodePath.join(appDir, "src/main.ts"))).toBe(true);
        expect(nodeFs.existsSync(nodePath.join(appDir, "tsconfig.json"))).toBe(true);
        expect(nodeFs.existsSync(nodePath.join(appDir, "src/main.js"))).toBe(false);
        expect(nodeFs.existsSync(nodePath.join(appDir, "vite.config.ts"))).toBe(false);

        // ts 模板的 check 脚本带类型检查
        const pkg = JSON.parse(nodeFs.readFileSync(nodePath.join(appDir, "package.json"), "utf-8"));
        expect(pkg.scripts.check).toBe("qingkuai check src --types");
    });

    it("rejects non-empty directory unless --force is given", async () => {
        workspace = nodeFs.mkdtempSync(nodePath.join(nodeOs.tmpdir(), "qk-cli-it-"));
        const appDir = nodePath.join(workspace, "app");
        nodeFs.mkdirSync(appDir);
        nodeFs.writeFileSync(nodePath.join(appDir, "keep.txt"), "keep", "utf-8");

        const rejected = await spawnCli(["init", "app"], workspace);
        expect(rejected.code).toBe(1);
        expect(rejected.output).toContain("--force");
        expect(nodeFs.existsSync(nodePath.join(appDir, "package.json"))).toBe(false);

        const forced = await spawnCli(["init", "app", "--force"], workspace);
        expect(forced.code).toBe(0);
        expect(nodeFs.existsSync(nodePath.join(appDir, "package.json"))).toBe(true);
        expect(nodeFs.existsSync(nodePath.join(appDir, "keep.txt"))).toBe(false);
    });

    it("closed loop: check and build must pass on the generated ts project", async () => {
        workspace = nodeFs.mkdtempSync(nodePath.join(nodeOs.tmpdir(), "qk-cli-it-"));
        const init = await spawnCli(["init", "loop-app", "--ts"], workspace);
        expect(init.code).toBe(0);

        const appDir = nodePath.join(workspace, "loop-app");
        linkRuntime(appDir);

        // 按模板 check 脚本的真实形态（含 --types）走类型检查全链路
        const checked = await spawnCli(["check", "src", "--types"], appDir);
        expect(checked.code).toBe(0);

        // build 产物经 vite 全链路（含 qingkuai 插件编译）
        const built = nodeChildProcess.spawnSync(process.execPath, [CLI_ENTRY, "build"], {
            cwd: appDir,
            encoding: "utf-8",
        });
        expect(built.status).toBe(0);
        expect(nodeFs.existsSync(nodePath.join(appDir, "dist", "index.html"))).toBe(true);
    });
});
