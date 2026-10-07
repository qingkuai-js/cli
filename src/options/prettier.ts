import type { Options as PrettierOptions } from "prettier";

import { cliOptions } from "../state";
import { isUndefined } from "../utils/assert";

export function mapCliToPrettierOptions(): PrettierOptions {
    const options: Record<string, unknown> = {};
    const qingkuaiOptions: Record<string, unknown> = {};
    const PRETTIER_OPTION_MAP: Record<string, keyof PrettierOptions> = {
        printWidth: "printWidth",
        tabWidth: "tabWidth",
        useTabs: "useTabs",
        semi: "semi",
        singleQuote: "singleQuote",
        trailingComma: "trailingComma",
        bracketSpacing: "bracketSpacing",
        arrowParens: "arrowParens",
        endOfLine: "endOfLine",
        quoteProps: "quoteProps",
        singleAttributePerLine: "singleAttributePerLine",
        proseWrap: "proseWrap",
        htmlWhitespaceSensitivity: "htmlWhitespaceSensitivity",
        insertPragma: "insertPragma",
        requirePragma: "requirePragma",
        embeddedLanguageFormatting: "embeddedLanguageFormatting",
    };
    const QINGKUAI_PRETTIER_OPTION_MAP: Record<string, string> = {
        selfCloseEmptySlot: "selfCloseEmptySlot",
        spaceAroundInterpolation: "spaceAroundInterpolation",
        componentTagFormat: "componentTagFormatPreference",
        componentAttributeFormat: "componentAttributeFormatPreference",
    };
    for (const [camelKey, optionKey] of Object.entries(PRETTIER_OPTION_MAP)) {
        if (!isUndefined(cliOptions[camelKey])) {
            options[optionKey] = cliOptions[camelKey];
        }
    }
    for (const [camelKey, optionKey] of Object.entries(QINGKUAI_PRETTIER_OPTION_MAP)) {
        if (!isUndefined(cliOptions[camelKey])) {
            qingkuaiOptions[optionKey] = cliOptions[camelKey];
        }
    }
    if (Object.keys(qingkuaiOptions).length > 0) {
        Object.assign(options, qingkuaiOptions);
    }
    return options;
}
