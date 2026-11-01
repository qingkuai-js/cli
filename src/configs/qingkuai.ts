import type { ConfigParsingMessage, QingkuaiConfiguration } from "qingkuai-language-service/config";

import { InvalidQingkuaiConfig } from "../messages/warn";
import { ADAPTER_FS, ADAPTER_PATH } from "../core/adapters";
import { mapCliToQingkuaiOptions } from "../options/qingkuai";
import { createConfigResolver } from "qingkuai-language-service/config";

let cliQingkuaiOptions: Partial<QingkuaiConfiguration>;

const reportedMessages = new Set<string>();

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
        ...qingkuaiConfigResolver.resolve(filePath, reportConfigMessage),
        ...(cliQingkuaiOptions ??= mapCliToQingkuaiOptions()),
    };
}

function reportConfigMessage(configPath: string, message: ConfigParsingMessage) {
    // 同一份配置会在每个组件目录下各解析一次，按配置文件路径与消息内容去重
    // A config file is resolved once per component directory, so dedupe by path and message
    const key = `${configPath}\0${message.value}`;
    if (reportedMessages.has(key)) {
        return;
    }

    reportedMessages.add(key);
    InvalidQingkuaiConfig(configPath, message.value);
}
