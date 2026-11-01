import nodeFs from "node:fs";
import nodeOs from "node:os";
import nodePath from "node:path";

import { walkDir } from "../../../src/runtime";
import { afterEach, describe, expect, it } from "vitest";

const workspaces: string[] = [];

function createWorkspace(files: string[]) {
    const workspace = nodeFs.mkdtempSync(nodePath.join(nodeOs.tmpdir(), "qk-cli-walk-"));
    workspaces.push(workspace);
    for (const relative of files) {
        const filePath = nodePath.join(workspace, relative);
        nodeFs.mkdirSync(nodePath.dirname(filePath), { recursive: true });
        nodeFs.writeFileSync(filePath, "");
    }
    return workspace;
}

function collect(dir: string) {
    const files: string[] = [];
    walkDir(dir, filePath => files.push(filePath));
    return files.sort();
}

afterEach(() => {
    for (const workspace of workspaces.splice(0)) {
        nodeFs.rmSync(workspace, { recursive: true, force: true });
    }
});

describe("walkDir", () => {
    it("collects files recursively and skips dot directories and node_modules", () => {
        const workspace = createWorkspace([
            "src/App.qk",
            "src/components/Hello.qk",
            "src/.cache/built.qk",
            "src/node_modules/dep/index.js",
        ]);

        expect(collect(nodePath.join(workspace, "src"))).toEqual(
            [
                nodePath.join(workspace, "src/App.qk"),
                nodePath.join(workspace, "src/components/Hello.qk"),
            ].sort(),
        );
    });

    // monorepo 里目录常是指向别处的软链，跟随它们才能扫到真实文件
    // Directories are often symlinks to elsewhere in a monorepo, following them is needed
    it("follows a linked directory", () => {
        const workspace = createWorkspace(["shared/widgets/Button.qk"]);
        const srcDir = nodePath.join(workspace, "src");
        nodeFs.mkdirSync(srcDir, { recursive: true });
        nodeFs.symlinkSync(
            nodePath.join(workspace, "shared"),
            nodePath.join(srcDir, "linked"),
            process.platform === "win32" ? "junction" : "dir",
        );

        expect(collect(srcDir)).toEqual([nodePath.join(srcDir, "linked/widgets/Button.qk")]);
    });

    // 链接指回祖先时必须停下，否则遍历会无限递归
    // A link pointing back to an ancestor must stop the traversal instead of recursing forever
    it("stops when a link points back to an ancestor", () => {
        const workspace = createWorkspace(["src/App.qk"]);
        const srcDir = nodePath.join(workspace, "src");
        nodeFs.symlinkSync(
            workspace,
            nodePath.join(srcDir, "loop"),
            process.platform === "win32" ? "junction" : "dir",
        );

        expect(collect(srcDir)).toEqual([nodePath.join(srcDir, "App.qk")]);
    });
});
