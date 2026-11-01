import type { MockInstance } from "vitest";

import nodeFs from "node:fs";
import nodeOs from "node:os";
import nodePath from "node:path";

import { getQingkuaiConfig } from "../../../src/configs/qingkuai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let warn: MockInstance<typeof console.warn>;

const workspaces: string[] = [];

function createWorkspace(files: Record<string, string>) {
    const workspace = nodeFs.mkdtempSync(nodePath.join(nodeOs.tmpdir(), "qk-cli-config-"));
    workspaces.push(workspace);

    for (const [relative, content] of Object.entries(files)) {
        const filePath = nodePath.join(workspace, relative);
        nodeFs.mkdirSync(nodePath.dirname(filePath), { recursive: true });
        nodeFs.writeFileSync(filePath, content);
    }
    return workspace;
}

function configMessages() {
    return warn.mock.calls
        .map(call => String(call[0]))
        .filter(message => message.includes(".qingkuairc"));
}

beforeEach(() => {
    warn = vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
    warn.mockRestore();
    for (const workspace of workspaces.splice(0)) {
        nodeFs.rmSync(workspace, { recursive: true, force: true });
    }
});

describe("getQingkuaiConfig", () => {
    it("inherits the nearest parent config", () => {
        const workspace = createWorkspace({
            ".qingkuairc": JSON.stringify({ whitespace: "preserve" }),
            "src/App.qk": "",
        });

        expect(getQingkuaiConfig(nodePath.join(workspace, "src/App.qk")).whitespace).toBe(
            "preserve",
        );
    });

    it("prefers a closer config over a parent one", () => {
        const workspace = createWorkspace({
            ".qingkuairc": JSON.stringify({ whitespace: "preserve" }),
            "src/.qingkuairc": JSON.stringify({ whitespace: "collapse" }),
            "src/App.qk": "",
        });

        expect(getQingkuaiConfig(nodePath.join(workspace, "src/App.qk")).whitespace).toBe(
            "collapse",
        );
    });

    it("applies inherited configuration through extends", () => {
        const workspace = createWorkspace({
            ".qingkuairc": JSON.stringify({ extends: "./base.json", reactivityMode: "shallow" }),
            "base.json": JSON.stringify({ whitespace: "preserve" }),
            "src/App.qk": "",
        });

        const config = getQingkuaiConfig(nodePath.join(workspace, "src/App.qk"));
        expect(config.whitespace).toBe("preserve");
        expect(config.reactivityMode).toBe("shallow");
    });

    it("warns once about invalid JSON and falls back to defaults", () => {
        const workspace = createWorkspace({
            ".qingkuairc": "{ not json",
            "src/App.qk": "",
            "src/nested/Child.qk": "",
        });

        expect(getQingkuaiConfig(nodePath.join(workspace, "src/App.qk")).whitespace).toBe(
            "trim-collapse",
        );
        expect(getQingkuaiConfig(nodePath.join(workspace, "src/nested/Child.qk")).whitespace).toBe(
            "trim-collapse",
        );
        expect(configMessages()).toHaveLength(1);
        expect(configMessages()[0]).toContain("not valid JSON");
    });

    it("warns when the config is not a JSON object", () => {
        const workspace = createWorkspace({
            ".qingkuairc": "[]",
            "src/App.qk": "",
        });

        getQingkuaiConfig(nodePath.join(workspace, "src/App.qk"));

        expect(configMessages()).toHaveLength(1);
        expect(configMessages()[0]).toContain("must be a JSON object");
    });
});
