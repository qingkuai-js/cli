import type TS from "typescript";

import type { ResolvedTypescriptConfig } from "../types";

import ts from "typescript";
import nodeFs from "node:fs";
import nodePath from "node:path";

import { CWD } from "../constants";
import { cliOptions } from "../state";
import { isString } from "../utils/assert";
import { getShownPath } from "../utils/sundry";
import { ProjectConfigParseFailed } from "../messages/error";
import { getTsDiagnosticMsg } from "../diagnostic/typescript";
import { mapCliToTypescriptOptions } from "../options/typescript";

const DEFAULT_TS_COMPILER_OPTIONS: Readonly<TS.CompilerOptions> = {
    strict: true,
    allowNonTsExtensions: true,
    allowArbitraryExtensions: true,
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ESNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
};

export function resolveTypescriptConfig(): ResolvedTypescriptConfig {
    let configFilePath: string | undefined;
    const cliCompilerOptions = mapCliToTypescriptOptions();
    if (!isString(cliOptions.project)) {
        configFilePath = findProjectConfig(CWD);
    } else {
        configFilePath = nodePath.resolve(CWD, cliOptions.project);
    }
    if (configFilePath && nodeFs.existsSync(configFilePath)) {
        const configFile = ts.readConfigFile(configFilePath, ts.sys.readFile);
        if (configFile.error) {
            ProjectConfigParseFailed(
                getShownPath(configFilePath),
                getTsDiagnosticMsg(configFile.error),
            );
        } else {
            const parseHost: ts.ParseConfigHost = {
                fileExists: path => {
                    return ts.sys.fileExists(path);
                },
                readFile: path => {
                    return ts.sys.readFile(path);
                },
                readDirectory(...args) {
                    args[1] = [...args[1], ".qk"];
                    return ts.sys.readDirectory(...args);
                },
                get useCaseSensitiveFileNames() {
                    return ts.sys.useCaseSensitiveFileNames;
                },
            };
            const parsed = ts.parseJsonConfigFileContent(
                configFile.config,
                parseHost,
                nodePath.dirname(configFilePath),
            );
            return {
                compilerOptions: {
                    // configFilePath 让 createProgram 将 types 的默认解析锚定到 tsconfig 所在目录（tsc 语义），缺失时会退回进程 cwd；
                    // parsed.options 带有显式 undefined 的同名键，必须放在最后覆盖
                    ...parsed.options,
                    ...cliCompilerOptions,
                    configFilePath,
                },
                fileNames: parsed.fileNames,
            };
        }
    }
    return {
        compilerOptions: {
            ...DEFAULT_TS_COMPILER_OPTIONS,
            ...cliCompilerOptions,
        },
        fileNames: [],
    };
}

function findProjectConfig(dir: string) {
    while (true) {
        const tsconfig = nodePath.resolve(dir, "tsconfig.json");
        if (nodeFs.existsSync(tsconfig)) {
            return tsconfig;
        }

        const jsconfig = nodePath.resolve(dir, "jsconfig.json");
        if (nodeFs.existsSync(jsconfig)) {
            return jsconfig;
        }
        if (!dir || dir === "/") {
            return;
        }
        dir = nodePath.dirname(dir);
    }
}
