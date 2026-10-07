import type { HelpOption } from "#type-declarations";

import { COMMANDS } from "./commands";
import { isUndefined } from "./utils/assert";
import { TERMINAL_WIDTH } from "./constants";
import { joinWithNewLine } from "./utils/sundry";
import { gray, styleParam, wrapText } from "./utils/format";

const ROOT_FLAGS: HelpOption[] = [
    {
        long: "help",
        short: "h",
        type: "boolean",
        description: "Show help",
    },
    {
        long: "version",
        short: "v",
        type: "boolean",
        description: "Show version information",
    },
];

export function showRootHelp(version: string) {
    const entries = Object.entries(COMMANDS);
    const maxNameLen = Math.max(...entries.map(([name]) => name.length));
    const commandLines = entries.map(([name, entry]) => {
        return `    ${styleParam(name.padEnd(maxNameLen))}  ${entry.description}`;
    });
    const msg = joinWithNewLine(
        [
            `qingkuai: the command line tools for qingkuai - Version: ${version}`,
            joinWithNewLine(["USAGE", "  qingkuai <command> [options] [files...]"]),
            joinWithNewLine(["COMMANDS", joinWithNewLine(commandLines)]),
            joinWithNewLine(["FLAGS", renderOptionGroup("FLAGS", ROOT_FLAGS)]),
            joinWithNewLine([
                "EXAMPLES",
                joinWithNewLine([
                    "  qingkuai init qingkuai-app",
                    "  qingkuai check App.qk",
                    "  qingkuai check App.qk Hello.qk --types",
                    "  qingkuai dev --port 5173 --open",
                    "  qingkuai build App.qk --out dist --minify",
                    "  qingkuai preview --port 4173 --open",
                    "  qingkuai build-types --out dist/types",
                    "  qingkuai format --write src/**/*{.js,.ts,.html,.css,.qk}",
                ]),
            ]),
        ],
        2,
    );
    console.log(msg);
}

export function showCommandHelp(commandName: string) {
    const entry = COMMANDS[commandName];
    const description = entry?.description ?? "";
    const allOptions = entry?.options ?? [];
    const flags = allOptions.filter(o => {
        return o.type === "boolean" && isUndefined(o.default);
    });
    const opts = allOptions.filter(o => {
        return o.type !== "boolean" || !isUndefined(o.default);
    });
    const sections: string[] = [
        `qingkuai ${commandName} — ${description}\n`,
        joinWithNewLine(["USAGE", `  qingkuai ${commandName} [FLAGS] [OPTIONS] [files...]\n`]),
    ];
    if (flags.length > 0) {
        sections.push(joinWithNewLine(["FLAGS", renderOptionGroup("FLAGS", flags)]), "\n");
    }
    if (opts.length > 0) {
        sections.push(joinWithNewLine(["OPTIONS", renderOptionGroup("OPTIONS", opts)]), "\n");
    }
    if (entry?.examples && entry.examples.length > 0) {
        sections.push(joinWithNewLine(["EXAMPLES", entry.examples.join("\n")]), "\n");
    }
    console.log(joinWithNewLine(sections));
}

function renderOptionGroup(title: string, options: HelpOption[]): string {
    const labels = options.map(option => {
        let label = `--${option.long}`;
        if (option.short) {
            label += `, -${option.short}`;
        }
        if (option.valueName) {
            label += ` <${option.valueName}>`;
        }
        return label;
    });

    const maxFlagLen = labels.reduce((max, label) => {
        return Math.max(max, label.length);
    }, 0);

    const isFlags = title === "FLAGS";
    const descCol = 4 + maxFlagLen + 2;

    const lines = options.map((option, index) => {
        const parts: string[] = [];

        // 主行：选项名 + 描述
        const paddedFlag = styleParam(labels[index].padEnd(maxFlagLen));
        parts.push(`    ${paddedFlag}  ${option.description}`);

        // Flags 不展示类型和默认值
        if (!isFlags) {
            const prefix = " ".repeat(descCol);
            if (option.type) {
                parts.push(`${prefix}${gray("type:")} ${option.type}`);
            }
            if (option.default !== undefined) {
                parts.push(`${prefix}${gray("default:")} ${option.default}`);
            }
            if (option.oneOf && option.oneOf.length > 0) {
                const valueText = option.oneOf.join(", ");
                const indent = descCol + 8; // 对齐到 "one of: " 后
                const termWidth = TERMINAL_WIDTH;
                if (valueText.length + indent <= termWidth) {
                    parts.push(`${prefix}${gray("one of:")} ${valueText}`);
                } else {
                    const availWidth = termWidth - indent;
                    const wrapped = wrapText(valueText, availWidth);
                    const lines = wrapped.map((line, i) =>
                        i === 0 ? `${prefix}${gray("one of:")} ${line}` : " ".repeat(indent) + line,
                    );
                    parts.push(joinWithNewLine(lines));
                }
            }
        }
        return joinWithNewLine(parts);
    });

    return joinWithNewLine(lines, 2 - +isFlags);
}
