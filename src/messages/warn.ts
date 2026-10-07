import { gray, stylePath, warningLabel, yellow } from "../utils/format";

export function FormatWouldFormat(displayPath: string) {
    console.error(`${yellow("[Would Format]")}${gray(":")} ${stylePath(displayPath)}`);
}

export function BuildFormatIgnored(flags: string[]) {
    consoleWarnLabel(
        `Option${flags.length > 1 ? "s" : ""} ${flags.join(", ")} ${flags.length > 1 ? "are" : "is"} only supported for a library entry (a .js/.ts/.qk entry file), and will be ignored.`,
    );
}

export function UnsupportedQingkuaiVersion(version: string, range: string) {
    consoleWarnLabel(
        `The workspace "qingkuai" version (${version}) is outside the supported range (${range}). Mismatched language semantics may produce incorrect checks or output — please align the versions of qingkuai and @qingkuai/cli.`,
    );
}

function consoleWarnLabel(msg: string) {
    console.warn(warningLabel + ": " + msg);
}
