import type { Command, HelpOption } from "#type-declarations";

import nodePath from "node:path";
import nodeModule from "node:module";

import { COMMANDS } from "./commands";
import { ExitCode } from "./constants";
import { findPackageRoot, readFileSync } from "./utils/file";
import { cannotFindPackageRE } from "./regular";
import { cliOptions, cliPositional } from "./state";
import { showCommandHelp, showRootHelp } from "./help";
import { UnsupportedQingkuaiVersion } from "./messages/warn";
import { isSupportedVersion, kebab2Camel } from "./utils/sundry";
import { MissingCommand, MissingDependencies, UnexpectedError } from "./messages/error";

function main() {
    let commandName: string | undefined;
    const commandTokens: string[] = [];
    const argv = process.argv.slice(2);

    if (argv.length === 0) {
        MissingCommand();
        process.exit(ExitCode.Failure);
    }

    if (argv.length === 1) {
        switch (argv[0]) {
            case "-h":
            case "--help": {
                return showRootHelp(resolveVersion());
            }
            case "-v":
            case "--version": {
                console.log("Version", resolveVersion());
                return;
            }
        }
    }

    for (const item of argv) {
        if (!commandName && COMMANDS[item]) {
            commandName = item;
        } else {
            commandTokens.push(item);
        }
    }
    if (!commandName) {
        MissingCommand();
        process.exit(ExitCode.Failure);
    }

    if (hasHelpFlag(commandTokens)) {
        return showCommandHelp(commandName);
    }

    runCommand(commandName, commandTokens).then(
        code => {
            process.exit(code);
        },
        err => {
            UnexpectedError(err);
            process.exit(ExitCode.Failure);
        },
    );
}

function resolveVersion() {
    return readOwnManifest().version ?? "unknown";
}

async function runCommand(commandName: string, tokens: string[]) {
    let command: Command;
    try {
        command = await COMMANDS[commandName].load();
    } catch (err) {
        const missing = resolveMissingDependency(err);
        if (missing) {
            MissingDependencies([missing]);
        } else {
            UnexpectedError(err);
        }
        process.exit(ExitCode.Failure);
    }

    checkQingkuaiVersion();
    parseArgs(tokens, COMMANDS[commandName].options);
    return command.execute();
}

function resolveMissingDependency(err: unknown): string | undefined {
    if ((err as { code?: string })?.code !== "ERR_MODULE_NOT_FOUND") {
        return;
    }

    const matched = cannotFindPackageRE.exec(String((err as Error)?.message ?? err));
    return matched?.[1];
}

// 语言语义由用户工作区中唯一的 qingkuai 副本决定；超出声明范围时
// 显式警告（peer 范围已在安装期拦截，这里覆盖 yarn berry 等宽松场景）
function checkQingkuaiVersion() {
    try {
        const require = nodeModule.createRequire(import.meta.url);
        const range = readOwnManifest().peerDependencies?.qingkuai;
        const qingkuaiVersion = JSON.parse(
            readFileSync(require.resolve("qingkuai/package.json")),
        ).version;
        if (!range || !qingkuaiVersion) {
            return;
        }
        if (!isSupportedVersion(qingkuaiVersion, range)) {
            UnsupportedQingkuaiVersion(qingkuaiVersion, range);
        }
    } catch {
        // 内部依赖缺失或 package.json 不可读时交由命令自身的加载/执行报错
    }
}

function parseArgs(tokens: string[], options: HelpOption[]) {
    const findOption = (name: string) => {
        return options.find(option => {
            return option.long === name || option.short === name;
        });
    };

    for (let index = 0, isPositional = true; index < tokens.length; index++) {
        let token = tokens[index];
        if (isPositional) {
            if (token[0] === "-") {
                isPositional = false;
            } else {
                cliPositional.push(token);
                continue;
            }
        }
        if (token[0] === "-" && token[1] && token[1] !== "-") {
            const option = findOption(token.slice(1));
            token = "--" + (option ? option.long : token.slice(1));
        }
        if (token === "--") {
            continue;
        }
        if (!token.startsWith("--")) {
            cliPositional.push(token);
            continue;
        }

        const equalsIndex = token.indexOf("=");
        const flagName = token.slice(2, equalsIndex === -1 ? void 0 : equalsIndex);
        const option = findOption(flagName);
        const camelKey = kebab2Camel(flagName);
        if (equalsIndex !== -1) {
            const valueStr = token.slice(equalsIndex + 1);
            cliOptions[camelKey] = coerceValue(valueStr, option);
            continue;
        }

        const takesValue = option !== undefined && (option.type !== "boolean" || !option.noValue);
        if (takesValue && index + 1 < tokens.length && !tokens[index + 1].startsWith("-")) {
            const nextToken = tokens[++index];
            cliOptions[camelKey] = coerceValue(nextToken, option);
            continue;
        }
        cliOptions[camelKey] = true;
    }
}

function coerceValue(valueStr: string, option?: HelpOption) {
    if (option?.multiple) {
        const values = valueStr.split(",");
        return values.map(item => item.trim()).filter(Boolean);
    }
    if (valueStr === "true") {
        return true;
    }
    if (valueStr === "false") {
        return false;
    }

    const numeric = Number(valueStr);
    if (valueStr && !Number.isNaN(numeric)) {
        return numeric;
    }
    return valueStr;
}

function hasHelpFlag(argv: string[]) {
    return argv.some(token => {
        return token === "--help" || token === "-h";
    });
}

function readOwnManifest() {
    const packageRoot = findPackageRoot(import.meta.url);
    if (packageRoot === false) {
        throw new Error("CLI package.json not found");
    }
    return JSON.parse(readFileSync(nodePath.join(packageRoot, "package.json")));
}

main();
