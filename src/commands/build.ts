import type { LibraryFormats } from "vite";
import type { Command, ViteBildConfig } from "#type-declarations";

import * as vite from "vite";

import nodeFs from "node:fs";
import nodePath from "node:path";

import {
    BuildFailed,
    BuildEntryNotFound,
    BuildEntryRequired,
    BuildMultipleEntries,
    BuildInvalidFormat,
} from "../messages/error";
import { cliOptions, cliPositional } from "../state";
import { BuildFormatIgnored } from "../messages/warn";
import { CWD, ExitCode, ViteCommand } from "../constants";
import { isArray, isString, isUndefined } from "../utils/assert";
import { mapCliToBuildOptions, resolveViteMode } from "../options/vite";
import { getDisplayPath, getFileExtension, readFileSync } from "../utils/file";
import { formatViteDiagnostics, formatUnknownViteError } from "../diagnostic/vite";
import { resolveConfigFile, loadUserViteConfig, withBuiltinQingkuaiPlugin } from "../configs/vite";

const DEFAULT_BUILD_FORMATS: Readonly<LibraryFormats[]> = ["es"];
const SUPPORTED_BUILD_FORMATS: Readonly<LibraryFormats[]> = ["es", "cjs", "umd", "iife"];

export class BuildCommand implements Command {
    async execute(): Promise<ExitCode> {
        const entryPath = resolveEntryPath();
        if (entryPath === false) {
            return ExitCode.Failure;
        }

        const formats = resolveBuildFormats();
        if (formats === false) {
            return ExitCode.Failure;
        }

        const configFile = resolveConfigFile(cliOptions.config);
        if (configFile === false) {
            return ExitCode.Failure;
        }

        try {
            const userConfig = await loadUserViteConfig(configFile, ViteCommand.Build);
            await vite.build({
                ...userConfig,
                root: CWD,
                configFile: false,
                mode: resolveViteMode(ViteCommand.Build),
                plugins: withBuiltinQingkuaiPlugin(userConfig),
                build: createBuildOptions(userConfig.build, entryPath, formats),
            });
        } catch (err) {
            return (reportBuildError(err), ExitCode.Failure);
        }
        return ExitCode.Success;
    }
}

// 优先渲染成与 check 命令一致的诊断格式；错误未携带位置信息时回退为原始消息
function reportBuildError(err: unknown) {
    const diagnostics = formatViteDiagnostics(err);
    if (diagnostics) {
        return console.error(diagnostics);
    }
    BuildFailed(formatUnknownViteError(err));
}

// 解析入口文件路径，返回 false 表示已报告错误；undefined 表示由 vite 默认行为处理入口
function resolveEntryPath() {
    if (cliPositional.length > 1) {
        return (BuildMultipleEntries(), false);
    }
    if (!isString(cliPositional[0])) {
        if (nodeFs.existsSync(nodePath.resolve(CWD, "index.html")) || hasViteConfigFile()) {
            return undefined;
        }
        return (BuildEntryRequired(), false);
    }

    const resolved = nodePath.resolve(CWD, cliPositional[0]);
    if (!nodeFs.statSync(resolved, { throwIfNoEntry: false })?.isFile()) {
        return (BuildEntryNotFound(getDisplayPath(resolved)), false);
    }
    return resolved;
}

function hasViteConfigFile() {
    return isString(resolveConfigFile(undefined));
}

// 解析 --format 参数，返回 false 表示已报告错误
function resolveBuildFormats() {
    if (isUndefined(cliOptions.format)) {
        return [...DEFAULT_BUILD_FORMATS];
    }

    const invalid: string[] = [];
    const formats = new Set<LibraryFormats>();
    const values = isArray(cliOptions.format) ? cliOptions.format : [cliOptions.format];
    for (const value of values) {
        if (isBuildFormat(value)) {
            formats.add(value);
        } else {
            invalid.push(String(value));
        }
    }
    if (formats.size === 0 || invalid.length > 0) {
        BuildInvalidFormat(invalid, SUPPORTED_BUILD_FORMATS);
        return false;
    }
    return Array.from(formats);
}

// 用户 build 配置为底、CLI 标志片段覆盖；存在非 html 入口时组装库模式参数
function createBuildOptions(
    userBuild: ViteBildConfig,
    entryPath: string | undefined,
    formats: LibraryFormats[],
) {
    const config: ViteBildConfig = {
        ...userBuild,
        ...mapCliToBuildOptions(),
    };

    // 存在入口文件且非 html 时，使用库模式打包
    if (isString(entryPath) && getFileExtension(entryPath) !== ".html") {
        const libName = resolveLibName(entryPath);
        config.lib = {
            formats,
            entry: entryPath,
            fileName: libName,
            cssFileName: libName,
            name: isString(cliOptions.name) && cliOptions.name ? cliOptions.name : libName,
        };
    }

    // --format/--name 仅对库模式生效，非库模式下提示但不中断构建
    else {
        const ignoredFormats: string[] = [];
        if (!isUndefined(cliOptions.format)) {
            ignoredFormats.push("--format");
        }
        if (isString(cliOptions.name)) {
            ignoredFormats.push("--name");
        }
        if (ignoredFormats.length > 0) {
            BuildFormatIgnored(ignoredFormats);
        }
        if (entryPath) {
            config.rolldownOptions = { input: entryPath };
        }
    }
    return config;
}

function resolveLibName(entryPath: string) {
    let name: string | undefined;
    try {
        const packageJson = JSON.parse(readFileSync(nodePath.resolve(CWD, "package.json")));
        if (isString(packageJson.name) && packageJson.name) {
            name = packageJson.name.split("/").pop();
        }
    } catch {
        // do nothing
    }
    return name || nodePath.basename(entryPath, nodePath.extname(entryPath));
}

function isBuildFormat(value: unknown): value is LibraryFormats {
    return isString(value) && (SUPPORTED_BUILD_FORMATS as readonly string[]).includes(value);
}
