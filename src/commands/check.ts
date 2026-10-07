import type TS from "typescript";
import type { Command } from "#type-declarations";

import ts from "typescript";

import { cliOptions } from "../state";
import { ExitCode } from "../constants";
import { getInputFiles } from "../runtime";
import { readFileSync } from "../utils/file";
import { getFileExtension } from "../utils/file";
import { isQingkuaiFileName } from "../utils/assert";
import { createTypescriptProgram } from "../core/program";
import { createDiagnosticCollector } from "../diagnostic";
import { CheckNoProcessableFiles } from "../messages/error";
import { resolveTypescriptConfigOptions } from "../configs/typescript";
import { correctDiagnosticLoc } from "qingkuai-language-service/adapters";
import { getQingkuaiFileInfo, getQingkuaiIntermidiateCompileResult } from "../core/qingkuai";

export class CheckCommand implements Command {
    execute(): ExitCode {
        const tsCompilerOptions = resolveTypescriptConfigOptions();
        const inputFiles = getInputFiles(path => {
            switch (getFileExtension(path)) {
                case ".qk":
                case ".ts":
                case ".mts":
                case ".cts":
                case ".tsx":
                case ".d.ts": {
                    return true;
                }
                case ".js":
                case ".mjs":
                case ".cjs":
                case ".jsx": {
                    return !!tsCompilerOptions.allowJs;
                }
                default: {
                    return false;
                }
            }
        });

        const diagnosticCollector = createDiagnosticCollector();
        if (!inputFiles.size) {
            return (CheckNoProcessableFiles(), ExitCode.Failure);
        }
        collectSyntaxDiagnostics(diagnosticCollector, inputFiles, tsCompilerOptions);

        if (cliOptions.types) {
            collectSemanticDiagnostics(
                diagnosticCollector,
                createTypescriptProgram(inputFiles, tsCompilerOptions),
                inputFiles,
            );
        }
        return diagnosticCollector.flush();
    }
}

// 编译/语法诊断：.qk 经编译器收集模板错误与解析诊断，其余文件走 ts.createSourceFile
export function collectSyntaxDiagnostics(
    diagnosticCollector: ReturnType<typeof createDiagnosticCollector>,
    inputFiles: Set<string>,
    tsCompilerOptions: TS.CompilerOptions,
) {
    for (const filePath of inputFiles) {
        const extension = getFileExtension(filePath);
        if (extension === ".qk") {
            const result = getQingkuaiIntermidiateCompileResult(filePath);
            for (const { type, value } of result.messages) {
                diagnosticCollector.pushDiagnostic({
                    filePath,
                    source: "qk",
                    code: value.code,
                    category: type,
                    message: value.message,
                    line: value.loc.start.line,
                    endLine: value.loc.end.line,
                    column: value.loc.start.column + 1,
                    endColumn: value.loc.end.column + 1,
                });
            }
            for (const diagnostic of result.parseDiagnostics) {
                diagnosticCollector.pushTsDiagnosticAndFormat(
                    filePath,
                    diagnostic,
                    index => result.positions[index],
                );
            }
        }

        // 非 .qk 文件：使用 ts.createSourceFile 做语法检查
        else {
            const source = readFileSync(filePath);
            const sourceFile = ts.createSourceFile(filePath, source, tsCompilerOptions.target!);

            // @ts-expect-error: access private property
            for (const diagnostic of sourceFile.parseDiagnostics as TS.Diagnostic[]) {
                diagnosticCollector.pushTsDiagnosticAndFormat(filePath, diagnostic);
            }
        }
    }
}

// TS Program 全量诊断：全局 + 逐文件语义；.qk 文件经 correctDiagnosticLoc 映射回源码位置。
// program 由调用方传入，便于诊断与发射复用同一个 Program（类型分析只做一遍）
export function collectSemanticDiagnostics(
    diagnosticCollector: ReturnType<typeof createDiagnosticCollector>,
    program: TS.Program,
    inputFiles: Set<string>,
) {
    // 全局诊断（如缺少全局类型、配置错误等）
    for (const diagnostic of program.getGlobalDiagnostics()) {
        diagnosticCollector.pushTsDiagnosticAndFormat(diagnostic.file?.fileName ?? "", diagnostic);
    }

    for (const sourceFile of program.getSourceFiles()) {
        if (sourceFile.isDeclarationFile && program.getCompilerOptions().skipDefaultLibCheck) {
            continue;
        }

        const filePath = sourceFile.fileName;
        if (!inputFiles.has(filePath)) {
            continue;
        }

        const rawDiagnostics = [...program.getSemanticDiagnostics(sourceFile)];
        if (rawDiagnostics.length === 0) {
            continue;
        }

        // .qk 文件：通过 correctDiagnosticLoc 将诊断位置从编译后代码转换回源码位置
        if (isQingkuaiFileName(filePath)) {
            const fileInfo = getQingkuaiFileInfo(program, filePath);
            const corrected = correctDiagnosticLoc(
                ts,
                fileInfo,
                rawDiagnostics,
                () => program,
                () => sourceFile,
                path => getQingkuaiFileInfo(program, path),
            );

            for (const diagnostic of corrected) {
                diagnosticCollector.pushTsDiagnosticAndFormat(filePath, diagnostic, index => {
                    return fileInfo.getPositionByIndex(index);
                });
            }
        }

        // 非 .qk 文件直接使用 formatTsDiagnostic
        else {
            for (const diagnostic of rawDiagnostics) {
                diagnosticCollector.pushTsDiagnosticAndFormat(filePath, diagnostic);
            }
        }
    }
}
