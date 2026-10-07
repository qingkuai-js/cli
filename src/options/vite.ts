import type { ViteBildConfig, ViteServerOptionsFragment } from "#type-declarations";

import nodePath from "node:path";

import { cliOptions } from "../state";
import { CWD, ViteCommand, ViteMode } from "../constants";
import { isNumber, isString, isUndefined } from "../utils/assert";

// 解析生效的 vite mode：--mode 标志优先，否则按命令取 vite 的默认值
export function resolveViteMode(command: ViteCommand): string {
    if (isString(cliOptions.mode) && cliOptions.mode) {
        return cliOptions.mode;
    }
    return command === ViteCommand.Dev ? ViteMode.Development : ViteMode.Production;
}

// 只含 CLI 传入了的标志的片段，由命令侧以用户配置为底合并覆盖；
export function mapCliToServerOptions(): ViteServerOptionsFragment {
    const config: ViteServerOptionsFragment = {};
    if (isNumber(cliOptions.port)) {
        config.port = cliOptions.port;
    }
    if (isString(cliOptions.host) && cliOptions.host) {
        config.host = cliOptions.host;
    }
    if (cliOptions.open === true) {
        config.open = true;
    }
    return config;
}

// 只含 CLI 传入了的标志的片段，由命令侧以用户配置为底合并覆盖
export function mapCliToBuildOptions(): ViteBildConfig {
    const config: ViteBildConfig = {};
    if (cliOptions.sourcemap === true) {
        config.sourcemap = true;
    }
    if (!isUndefined(cliOptions.minify)) {
        config.minify = cliOptions.minify === true;
    }
    if (isString(cliOptions.out) && cliOptions.out) {
        config.outDir = nodePath.resolve(CWD, cliOptions.out);
    }
    return config;
}
