import type { StrUnknown } from "#type-declarations";

import ts from "typescript";
import nodePath from "node:path";

import { CWD } from "../constants";
import { cliOptions } from "../state";
import { isString } from "../utils/assert";

export function mapCliToTypescriptOptions() {
    const rawOptions: StrUnknown = {};
    const optionMap: Record<string, keyof ts.CompilerOptions> = {
        strict: "strict",
        allowJs: "allowJs",
        out: "outDir",
        module: "module",
        target: "target",
        lib: "lib",
        skipLibCheck: "skipLibCheck",
        rootDir: "rootDir",
        rootDirs: "rootDirs",
        baseUrl: "baseUrl",
        paths: "paths",
        typePackages: "types",
        typeRoots: "typeRoots",
        customConditions: "customConditions",
        moduleResolution: "moduleResolution",
        jsx: "jsx",
        jsxFactory: "jsxFactory",
        jsxFragmentFactory: "jsxFragmentFactory",
        jsxImportSource: "jsxImportSource",
        resolvePackageJsonExports: "resolvePackageJsonExports",
        resolvePackageJsonImports: "resolvePackageJsonImports",
    };
    for (const [key, value] of Object.entries(cliOptions)) {
        if (optionMap[key]) {
            rawOptions[optionMap[key]] = value;
        }
    }
    if (isString(rawOptions.outDir) && rawOptions.outDir) {
        rawOptions.outDir = nodePath.resolve(CWD, rawOptions.outDir);
    }
    return ts.convertCompilerOptionsFromJson(rawOptions, CWD).options;
}
