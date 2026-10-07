import type { ViteBuildError, DiagnosticEntry } from "#type-declarations";

import nodePath from "node:path";
import nodeUtil from "node:util";

import { CWD } from "../constants";
import { cliOptions } from "../state";
import { joinWithNewLine } from "../utils/sundry";
import { createDiagnosticFormatter } from "./index";
import { isNumber, isString } from "../utils/assert";
import { getDisplayPath } from "../utils/file";
import { viteErrorFrameRE, viteErrorFrameHeaderRE } from "../regular";

// 把 vite 构建抛出的错误渲染为与 check 命令一致的诊断格式；错误未携带可用位置时返回 undefined
export function formatViteDiagnostics(err: unknown) {
    const entries = collectViteDiagnosticEntries(err);
    if (entries.length === 0) {
        return;
    }

    const formatter = createDiagnosticFormatter({
        cwd: CWD,
        oneline: !!cliOptions.oneline,
    });
    const maxLineWidth = Math.max(
        ...entries.map(entry => {
            return entry.line.toString().length;
        }),
    );
    return joinWithNewLine(
        entries.map(entry => {
            return formatter.format(entry, maxLineWidth);
        }),
    );
}

// 无位置信息可渲染时的兜底格式：保留原始消息与文件/帧附注
export function formatUnknownViteError(err: unknown) {
    const extended = err as ViteBuildError;
    const candidates: unknown[] =
        Array.isArray(extended.errors) && extended.errors.length > 0 ? extended.errors : [err];
    return joinWithNewLine(
        candidates.map(candidate => {
            const item = candidate as ViteBuildError;
            if (!isString(item?.message)) {
                return String(candidate);
            }

            const parts = [nodeUtil.stripVTControlCharacters(item.message)];
            if (isString(item.id)) {
                parts.push(`File: ${getDisplayPath(item.id)}`);
            }
            if (isString(item.frame)) {
                parts.push(nodeUtil.stripVTControlCharacters(item.frame));
            }
            return parts.join("\n");
        }),
        2,
    );
}

function collectViteDiagnosticEntries(err: unknown): DiagnosticEntry[] {
    const entries: DiagnosticEntry[] = [];
    for (const candidate of getViteErrorCandidates(err)) {
        const entry = toViteDiagnosticEntry(candidate);
        if (entry) {
            entries.push(entry);
        }
    }
    return entries;
}

function getViteErrorCandidates(err: unknown): ViteBuildError[] {
    const extended = err as ViteBuildError | undefined;
    if (!extended) {
        return [];
    }
    if (Array.isArray(extended.errors) && extended.errors.length > 0) {
        return extended.errors as ViteBuildError[];
    }
    return [extended];
}

// 插件错误优先用具体插件名，比 rolldown 统一的 PLUGIN_ERROR 有信息量
function resolveViteErrorCode(err: ViteBuildError) {
    if (isString(err.plugin) && err.plugin) {
        return err.plugin;
    }
    if (!isString(err.code) || "PLUGIN_ERROR" === err.code) {
        return;
    }
    return err.code;
}

function resolveViteErrorPosition(err: ViteBuildError, text: string) {
    const loc = err.loc;
    if (loc && isNumber(loc.line) && isNumber(loc.column)) {
        const filePath = isString(err.id) ? err.id : loc.file;
        if (isString(filePath) && filePath && !filePath.includes("\0")) {
            return {
                filePath,
                line: loc.line,
                column: loc.column + 1,
            };
        }
    }

    const matched = text.match(viteErrorFrameHeaderRE);
    if (!matched) {
        return;
    }
    const [, framePath, frameLine, frameColumn] = matched;
    if (framePath.includes("\0") || framePath.startsWith("virtual:")) {
        return;
    }
    return {
        filePath: nodePath.resolve(CWD, framePath),
        line: Number(frameLine),
        column: Number(frameColumn),
    };
}

function toViteDiagnosticEntry(err: ViteBuildError): DiagnosticEntry | undefined {
    if (!isString(err.message)) {
        return;
    }

    const text = nodeUtil.stripVTControlCharacters(err.message);
    const position = resolveViteErrorPosition(err, text);
    if (!position) {
        return;
    }

    const message = resolveViteErrorMessage(text, err.code);
    if (message) {
        return {
            message,
            source: "vite",
            category: "error",
            line: position.line,
            endLine: position.line,
            column: position.column,
            endColumn: position.column + 1,
            filePath: position.filePath,
            code: resolveViteErrorCode(err),
        };
    }
}

function resolveViteErrorMessage(text: string, code: unknown) {
    const summary = text.split(viteErrorFrameRE)[0].trim();
    if (!isString(code)) {
        return summary;
    }

    const prefix = `[${code}] Error: `;
    return summary.startsWith(prefix) ? summary.slice(prefix.length) : summary;
}
