import { afterAll, beforeAll, describe, expect, it } from "vitest";

import nodeFs from "node:fs";
import nodeOs from "node:os";
import nodePath from "node:path";

import { cliOptions } from "../../../src/state";
import { formatUnknownViteError, formatViteDiagnostics } from "../../../src/diagnostic/vite";

// 渲染代码帧需要真实源文件，统一建在临时目录并在结束时清理
const tempFiles: string[] = [];

function makeTempSource(lines: string[]) {
    const filePath = nodePath.join(
        nodeFs.mkdtempSync(nodePath.join(nodeOs.tmpdir(), "qk-vite-diag-")),
        "source.ts",
    );
    nodeFs.writeFileSync(filePath, lines.join("\n"), "utf-8");
    tempFiles.push(filePath);
    return filePath;
}

beforeAll(() => {
    delete cliOptions.oneline;
});

afterAll(() => {
    for (const filePath of tempFiles) {
        nodeFs.rmSync(nodePath.dirname(filePath), { recursive: true, force: true });
    }
});

describe("formatViteDiagnostics", () => {
    it("object-form loc: position and file come from the error object, column +1 to 1-based", () => {
        const source = makeTempSource(["line one", "line two target"]);
        const output = formatViteDiagnostics({
            message: "Boom happened",
            id: source,
            plugin: "qingkuai-compiler",
            loc: { line: 2, column: 9 },
        });

        expect(output).toBeDefined();
        expect(output).toContain(nodePath.basename(source) + "(2,10)");
        expect(output).toContain("Boom happened");
        expect(output).toContain("vite(qingkuai-compiler)");
    });

    it("frame-header fallback: position parsed from the message frame header when loc is absent (column used as-is)", () => {
        const source = makeTempSource(["a", "b", "c target"]);
        const output = formatViteDiagnostics({
            message: `Some failure\n\n╭─[ ${source}:3:2 ]`,
        });

        expect(output).toBeDefined();
        expect(output).toContain("(3,2)");
        expect(output).toContain("Some failure");
    });

    it("produces no diagnostics for virtual module paths", () => {
        const output = formatViteDiagnostics({
            message: "virtual failure\n╭─[ virtual:mod:1:1 ]",
        });
        expect(output).toBeUndefined();
    });

    it("returns undefined when no position information exists", () => {
        expect(formatViteDiagnostics({ message: "no position here" })).toBeUndefined();
    });

    it("drops the PLUGIN_ERROR code in favor of the concrete plugin name", () => {
        const source = makeTempSource(["x"]);
        const pluginError = formatViteDiagnostics({
            message: "m1",
            id: source,
            code: "PLUGIN_ERROR",
            plugin: "qingkuai-compiler",
            loc: { line: 1, column: 0 },
        });
        expect(pluginError).toContain("vite(qingkuai-compiler)");

        const genericError = formatViteDiagnostics({
            message: "m2",
            id: source,
            code: "PARSE_ERROR",
            loc: { line: 1, column: 0 },
        });
        expect(genericError).toContain("vite(PARSE_ERROR)");
    });

    it("switches to single-line output with the oneline flag", () => {
        cliOptions.oneline = true;
        const source = makeTempSource(["only line"]);
        const output = formatViteDiagnostics({
            message: "one line please",
            id: source,
            loc: { line: 1, column: 0 },
        });
        expect(output).toBeDefined();
        expect(output).not.toContain("\n");
        delete cliOptions.oneline;
    });
});

describe("formatUnknownViteError", () => {
    it("renders message, File and frame notes for each entry of the errors array", () => {
        const source = makeTempSource(["x"]);
        const output = formatUnknownViteError({
            errors: [
                { message: "first failure", id: source, frame: "> 1 | frame text" },
                { message: "second failure" },
            ],
        });

        expect(output).toContain("first failure");
        expect(output).toContain("File: ");
        expect(output).toContain("frame text");
        expect(output).toContain("second failure");
    });

    it("falls back to String for entries without a message", () => {
        const output = formatUnknownViteError({ errors: [42] });
        expect(output).toContain("42");
    });
});
