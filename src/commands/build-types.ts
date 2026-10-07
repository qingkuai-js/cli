import type { Command } from "#type-declarations";

import ts from "typescript";
import nodeFs from "node:fs";
import nodePath from "node:path";

import { cliOptions } from "../state";
import { getInputFiles } from "../runtime";
import { CWD, ExitCode } from "../constants";
import { isQingkuaiFileName } from "../utils/assert";
import { createTypescriptProgram } from "../core/program";
import { createDiagnosticCollector } from "../diagnostic";
import { CheckNoProcessableFiles } from "../messages/error";
import { getFileExtension, writeFileSync } from "../utils/file";
import { resolveTypescriptConfigOptions } from "../configs/typescript";
import { collectSemanticDiagnostics, collectSyntaxDiagnostics } from "./check";

export class BuildTypesCommand implements Command {
    execute(): ExitCode {
        const tsCompilerOptions = resolveTypescriptConfigOptions();
        const outputDir = cliOptions.out
            ? nodePath.resolve(CWD, String(cliOptions.out))
            : undefined;

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

        if (!inputFiles.size) {
            CheckNoProcessableFiles();
            return ExitCode.Failure;
        }

        // 有语法或类型错误时不产出声明
        const diagnosticCollector = createDiagnosticCollector();
        const emitOptions: ts.CompilerOptions = {
            ...tsCompilerOptions,
            noEmit: false,
            declaration: true,
            emitDeclarationOnly: true,
            ...(outputDir ? { outDir: outputDir } : {}),
        };
        const program = createTypescriptProgram(inputFiles, emitOptions);
        collectSyntaxDiagnostics(diagnosticCollector, inputFiles, tsCompilerOptions);
        collectSemanticDiagnostics(diagnosticCollector, program, inputFiles);
        if (diagnosticCollector.flush() !== ExitCode.Success) {
            return ExitCode.Failure;
        }
        for (const sourceFile of program.getSourceFiles()) {
            const filePath = sourceFile.fileName;
            if (!sourceFile.isDeclarationFile && inputFiles.has(filePath)) {
                program.emit(sourceFile, (emitFileName, content) => {
                    if (isQingkuaiFileName(filePath)) {
                        // .qk 的虚拟文件名以 .qk.ts 结尾，声明文件名要还原为 .d.ts
                        const ext = getFileExtension(emitFileName);
                        emitFileName = emitFileName.slice(0, -ext.length - 3) + ext;
                    }
                    nodeFs.mkdirSync(nodePath.dirname(emitFileName), {
                        recursive: true,
                    });
                    writeFileSync(emitFileName, content);
                });
            }
        }
        return ExitCode.Success;
    }
}
