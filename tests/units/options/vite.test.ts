import nodePath from "node:path";

import {
    resolveViteMode,
    mapCliToBuildOptions,
    mapCliToServerOptions,
} from "../../../src/options/vite";
import { cliOptions } from "../../../src/state";
import { beforeEach, describe, expect, it } from "vitest";
import { ViteCommand, ViteMode } from "../../../src/constants";

beforeEach(() => {
    for (const key of Object.keys(cliOptions)) {
        delete cliOptions[key];
    }
});

describe("resolveViteMode", () => {
    it("falls back to vite defaults per command without --mode", () => {
        expect(resolveViteMode(ViteCommand.Dev)).toBe(ViteMode.Development);
        expect(resolveViteMode(ViteCommand.Build)).toBe(ViteMode.Production);
        expect(resolveViteMode(ViteCommand.Preview)).toBe(ViteMode.Production);
    });

    it("prefers --mode and passes custom values through as-is", () => {
        cliOptions.mode = "staging";
        expect(resolveViteMode(ViteCommand.Dev)).toBe("staging");
        expect(resolveViteMode(ViteCommand.Build)).toBe("staging");
    });
});

describe("mapCliToServerOptions", () => {
    it("returns an empty fragment when no flags are given", () => {
        expect(mapCliToServerOptions()).toEqual({});
    });

    it("collects only the flags that were provided", () => {
        cliOptions.port = 3000;
        cliOptions.host = "localhost";
        expect(mapCliToServerOptions()).toEqual({ port: 3000, host: "localhost" });
    });

    it("skips mistyped and falsy values", () => {
        cliOptions.port = "3000";
        cliOptions.open = false;
        expect(mapCliToServerOptions()).toEqual({});
    });

    it("collects open=true", () => {
        cliOptions.open = true;
        expect(mapCliToServerOptions()).toEqual({ open: true });
    });
});

describe("mapCliToBuildOptions", () => {
    it("returns an empty fragment when no flags are given", () => {
        expect(mapCliToBuildOptions()).toEqual({});
    });

    it("collects sourcemap only when explicitly true", () => {
        cliOptions.sourcemap = false;
        expect(mapCliToBuildOptions()).toEqual({});
        cliOptions.sourcemap = true;
        expect(mapCliToBuildOptions()).toEqual({ sourcemap: true });
    });

    it("collects minify as a boolean", () => {
        cliOptions.minify = true;
        expect(mapCliToBuildOptions()).toEqual({ minify: true });
        cliOptions.minify = false;
        expect(mapCliToBuildOptions()).toEqual({ minify: false });
    });

    it("resolves out to an absolute path relative to CWD", () => {
        cliOptions.out = "custom-dist";
        const options = mapCliToBuildOptions();
        expect(options?.outDir).toBe(nodePath.resolve(process.cwd(), "custom-dist"));
    });
});
