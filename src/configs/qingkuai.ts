import type { QingkuaiConfiguration } from "qingkuai-language-service";

import { ADAPTER_FS, ADAPTER_PATH } from "../core/adapters";
import { mapCliToQingkuaiOptions } from "../options/qingkuai";
import { createConfigResolver } from "qingkuai-language-service";

let cliQingkuaiOptions: Partial<QingkuaiConfiguration>;

const DEFAULT_QINGKUAI_CONFIG: Readonly<QingkuaiConfiguration> = {
    allowConstReactive: true,
    reactivityMode: "reactive",
    whitespace: "trim-collapse",
    interpretiveComments: true,
    resolveImportExtension: true,
    requireReactivityMark: false,
    preserveHtmlComments: "development",
};

const qingkuaiConfigResolver = createConfigResolver(
    ADAPTER_FS,
    ADAPTER_PATH,
    DEFAULT_QINGKUAI_CONFIG,
);

export function getQingkuaiConfig(filePath: string) {
    return {
        ...qingkuaiConfigResolver.resolve(filePath),
        ...(cliQingkuaiOptions ??= mapCliToQingkuaiOptions()),
    };
}
