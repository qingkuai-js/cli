import type { StrUnknown } from "#type-declarations";
import type { QingkuaiConfiguration } from "qingkuai-language-service";

import { cliOptions } from "../state";

export function mapCliToQingkuaiOptions() {
    const rawOptions: StrUnknown = {};
    const compileOptionKeys = new Set([
        "debug",
        "sourcemap",
        "whitespace",
        "reactivityMode",
        "allowConstReactive",
        "interpretiveComments",
        "preserveHtmlComments",
        "requireReactivityMark",
    ]);
    for (const [key, value] of Object.entries(cliOptions)) {
        if (compileOptionKeys.has(key)) {
            if (key !== "preserveHtmlComments") {
                rawOptions[key] = value;
            } else {
                rawOptions[key] = value ? "always" : "never";
            }
        }
    }
    return rawOptions as Partial<QingkuaiConfiguration>;
}
