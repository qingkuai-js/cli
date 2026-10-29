import type { ASTPosition } from "qingkuai/compiler";
import type { DiagnosticEntry } from "#type-declarations";

import ts from "typescript";

import { isString, isUndefined } from "../utils/assert";

export function formatTsDiagnostic(
    filePath: string,
    diagnostic: ts.Diagnostic,
    getPos?: (index: number) => ASTPosition | undefined,
) {
    if (!diagnostic.file || isUndefined(diagnostic.start) || isUndefined(diagnostic.length)) {
        return;
    }

    const start = diagnostic.start;
    const end = diagnostic.start + diagnostic.length;
    const res: DiagnosticEntry = {
        filePath,
        source: "ts",
        line: 0,
        column: 0,
        endLine: 0,
        endColumn: 0,
        code: diagnostic.code ?? 0,
        message: getTsDiagnosticMsg(diagnostic),
        category: diagnostic.category === ts.DiagnosticCategory.Error ? "error" : "warning",
    };

    // 索引无法映射回源码时（例如诊断落在注入的类型声明上）退回到编译后代码的位置
    if (getPos) {
        const [pos, endPos] = [getPos(start), getPos(end)];
        if (pos && endPos) {
            [res.line, res.column] = [pos.line, pos.column + 1];
            [res.endLine, res.endColumn] = [endPos.line, endPos.column + 1];
            return res;
        }
    }

    const pos = diagnostic.file.getLineAndCharacterOfPosition(start);
    const endPos = diagnostic.file.getLineAndCharacterOfPosition(end);
    [res.line, res.column] = [pos.line + 1, pos.character + 1];
    [res.endLine, res.endColumn] = [endPos.line + 1, endPos.character + 1];
    return res;
}

export function getTsDiagnosticMsg(diagnostic: ts.Diagnostic) {
    if (isString(diagnostic.messageText)) {
        return diagnostic.messageText;
    }
    return diagnostic.messageText.messageText;
}
