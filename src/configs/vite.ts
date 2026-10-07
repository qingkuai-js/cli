import type { InlineConfig, Logger, PluginOption } from "vite";
import type { QingkuaiPluginFactory } from "#type-declarations";

import nodeFs from "node:fs";
import nodePath from "node:path";
import qingkuaiPluginDefault from "vite-plugin-qingkuai";

import { CWD, ViteCommand } from "../constants";
import { loadConfigFromFile } from "vite";
import { getDisplayPath } from "../utils/file";
import { resolveViteMode } from "../options/vite";
import { BuildConfigNotFound } from "../messages/error";
import { isArray, isString, isThenable, isUndefined } from "../utils/assert";

const QINGKUAI_PLUGIN_NAME = "qingkuai-compiler";
const qingkuaiPlugin = qingkuaiPluginDefault as unknown as QingkuaiPluginFactory;

const DEFAULT_CONFIG_EXTS: Readonly<string[]> = ["js", "mjs", "ts", "cjs", "mts", "cts"];

const configLoadLogger: Logger = {
    hasWarned: false,
    error: () => {},
    clearScreen: () => {},
    hasErrorLogged: () => false,
    info: msg => console.log(msg),
    warn: msg => console.warn(msg),
    warnOnce: msg => console.warn(msg),
};

// string: 待加载的配置文件路径；
// undefined: 表示当前目录不存在配置文件；
// false: --config 指定的配置文件不存在，已报告错误
export function resolveConfigFile(configFlag: unknown): string | undefined | false {
    if (!isString(configFlag)) {
        return findConfigFile();
    }

    const resolved = nodePath.resolve(CWD, configFlag);
    if (!nodeFs.statSync(resolved, { throwIfNoEntry: false })?.isFile()) {
        return (BuildConfigNotFound(getDisplayPath(resolved)), false);
    }
    return resolved;
}

function findConfigFile() {
    for (const ext of DEFAULT_CONFIG_EXTS) {
        const filePath = nodePath.resolve(CWD, `vite.config.${ext}`);
        if (nodeFs.existsSync(filePath)) {
            return filePath;
        }
    }
}

// 加载用户的 vite 配置文件
export async function loadUserViteConfig(
    configFile: string | undefined,
    command: ViteCommand,
): Promise<InlineConfig> {
    if (!configFile) {
        return {};
    }

    const loaded = await loadConfigFromFile(
        {
            isSsrBuild: false,
            mode: resolveViteMode(command),
            isPreview: command === ViteCommand.Preview,
            command: command === ViteCommand.Build ? "build" : "serve",
        },
        configFile,
        CWD,
        undefined,
        configLoadLogger,
    );
    return loaded ? loaded.config : {};
}

// 使用内置的 vite-plugin-qingkuai 插件包装用户的插件列表
export function withBuiltinQingkuaiPlugin(userConfig: InlineConfig): PluginOption[] {
    const survivors = filterQingkuaiPlugins(userConfig.plugins) ?? [];
    const list = (isArray(survivors) ? survivors : [survivors]) as PluginOption[];
    return [...list, qingkuaiPlugin()];
}

// 过滤同名插件（qingkuai）
function filterQingkuaiPlugins(candidate: PluginOption): unknown {
    if (isArray(candidate)) {
        return candidate
            .map(item => filterQingkuaiPlugins(item))
            .filter(item => {
                return !isUndefined(item);
            });
    }
    if (isThenable(candidate)) {
        return Promise.resolve(candidate).then(filterQingkuaiPlugins);
    }
    if (candidate && candidate.name === QINGKUAI_PLUGIN_NAME) {
        return undefined;
    }
    return candidate;
}
