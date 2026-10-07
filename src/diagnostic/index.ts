import type { DiagnosticEntry, DiagnosticFormatterOptions } from "#type-declarations";

import nodeUtil from "node:util";

import { cliOptions } from "../state";
import { readFileSync } from "../utils/file";
import { isUndefined } from "../utils/assert";
import { formatTsDiagnostic } from "./typescript";
import { newLineRE, leadingWhitespaceRE } from "../regular";
import { CWD, ExitCode, TERMINAL_WIDTH } from "../constants";
import { getShownPath, joinWithNewLine } from "../utils/sundry";
import { red, yellow, gray, stylePath, wrapText } from "../utils/format";

export function createDiagnosticCollector() {
    let exitCode: ExitCode = ExitCode.Success;
    const entries: DiagnosticEntry[] = [];
    const diagnosticFormatter = createDiagnosticFormatter({
        cwd: CWD,
        oneline: !!cliOptions.oneline,
    });

    return {
        pushDiagnostic: (entry: DiagnosticEntry) => {
            if (entry.category === "error") {
                exitCode = ExitCode.Failure;
            }
            entries.push(entry);
        },
        flush: () => {
            if (entries.length > 0) {
                const maxLineWidth = Math.max(
                    ...entries.map(entry => {
                        return Math.max(entry.line ?? 0).toString().length;
                    }),
                );
                for (const entry of entries) {
                    console.error(diagnosticFormatter.format(entry, maxLineWidth));
                }
            }
            return exitCode;
        },
        pushTsDiagnosticAndFormat(...args: Parameters<typeof formatTsDiagnostic>) {
            const formatted = formatTsDiagnostic(...args);
            if (formatted) {
                this.pushDiagnostic(formatted);
            }
        },
    };
}

export function createDiagnosticFormatter(options: DiagnosticFormatterOptions = {}) {
    const oneline = !!options.oneline;
    const sourceCache = new Map<string, string[] | null>();

    const readSourceLines = (filePath: string) => {
        if (sourceCache.has(filePath)) {
            return sourceCache.get(filePath)!;
        }
        try {
            const ret = readFileSync(filePath).split(newLineRE);
            return (sourceCache.set(filePath, ret), ret);
        } catch {
            return (sourceCache.set(filePath, null), null);
        }
    };

    const format = (entry: DiagnosticEntry, maxLineWidth: number): string => {
        const withCode = !isUndefined(entry.code);
        const shownPath = getShownPath(entry.filePath);
        const messageColor = entry.category === "error" ? red : yellow;
        const catagoryLabel = entry.category === "error" ? "Error" : "Warning";
        const styledMessage = messageColor(`[${catagoryLabel}]: ${entry.message}`);
        const styledPath = stylePath(`${shownPath}(${entry.line},${entry.column})`);
        const fullMessage = `${styledMessage} ${withCode ? `${gray(`${entry.source}(${entry.code})`)}` : ""}`;

        if (oneline) {
            return styledPath + " - " + fullMessage;
        }

        const pipeText = gray("|");
        const gutterBlank = " ".repeat(maxLineWidth);
        const lines = readSourceLines(entry.filePath);
        const sourceLine = lines?.[entry.line - 1] ?? "";
        const displayLineContentRaw = " " + sourceLine.trimStart();
        const lineNumberText = entry.line.toString().padStart(maxLineWidth, " ");
        const markerStartIndex =
            entry.column - (sourceLine.match(leadingWhitespaceRE)?.[0].length ?? 0);
        const markerWidth = Math.max(
            (entry.endLine === entry.line ? entry.endColumn : sourceLine.length + 1) - entry.column,
            1,
        );

        const cropStartIndex = Math.max(markerStartIndex - 10, 0);
        const didCropLeft = cropStartIndex > 0;
        const markerEndIndex = markerStartIndex + markerWidth;
        const cropEndIndex = Math.min(markerEndIndex + 10, displayLineContentRaw.length);

        const displayLineContent =
            (cropStartIndex > 0 ? gray("…") : "") +
            displayLineContentRaw.slice(cropStartIndex, cropEndIndex) +
            (cropEndIndex < displayLineContentRaw.length ? gray("…") : "");
        const markerStartInDisplay = didCropLeft
            ? markerStartIndex - cropStartIndex + 1
            : markerStartIndex;
        const markerPadding = " ".repeat(Math.max(markerStartInDisplay, 0));
        const marker = `${markerPadding}${messageColor("^".repeat(markerWidth))}`;

        const messageIndent = markerPadding.length + 3 + catagoryLabel.length;
        const availableWidth = TERMINAL_WIDTH - (maxLineWidth + 3) - messageIndent;

        let messageLine: string;
        if (nodeUtil.stripVTControlCharacters(fullMessage).length <= availableWidth) {
            messageLine = `${gray(gutterBlank)} ${pipeText} ${markerPadding}${gray("└─")} ${fullMessage}`;
        } else {
            const wrapped = wrapText(fullMessage, availableWidth);
            const continuationPadding = " ".repeat(messageIndent);
            messageLine = joinWithNewLine(
                wrapped.map((line, i) => {
                    const padding = i === 0 ? markerPadding + gray("└─") : continuationPadding;
                    return `${gray(gutterBlank)} ${pipeText} ${padding}${line}`;
                }),
            );
        }

        return joinWithNewLine([
            `${gray(">")} ${styledPath}`,
            `${gray(gutterBlank)} ${pipeText}`,
            `${gray(lineNumberText)} ${pipeText} ${displayLineContent}`,
            `${gray(gutterBlank)} ${pipeText} ${marker}\n${messageLine}`,
            `${gray(gutterBlank)} ${pipeText}`,
        ]);
    };

    return { format };
}
