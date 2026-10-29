import type TS from "typescript";
import type { ResolveModuleNameLiteralsFunc } from "qingkuai-language-service";

import ts from "typescript";

import {
    confirmTypesForCompileResult,
    getOverrideResolveModuleLiterals,
} from "qingkuai-language-service/adapters";
import { ADAPTER_PATH } from "./adapters";
import { getQingkuaiFileInfo } from "./qingkuai";
import { getQingkuaiConfig } from "../configs/qingkuai";
import { createLogger } from "qingkuai-language-service";

const logger = createLogger({
    write: (msg: string) => process.stderr.write(`${msg}\n`),
});

export function createTypescriptProgram(
    inputFiles: Set<string>,
    compilerOptions: ts.CompilerOptions,
) {
    // eslint-disable-next-line prefer-const -- hoist declaration
    let program: TS.Program;

    const options: ts.CompilerOptions = {
        ...compilerOptions,
        allowNonTsExtensions: true,
    };
    const defaultHost = ts.createCompilerHost({
        ...compilerOptions,
        allowNonTsExtensions: true,
    });
    const inputFilesArr = Array.from(inputFiles);
    const qingkuaiFiles = inputFilesArr.filter(f => f.endsWith(".qk"));

    const originalResolveModuleNameLiterals: ResolveModuleNameLiteralsFunc = (
        moduleLiterals,
        containingFile,
    ) => {
        return moduleLiterals.map(literal => {
            return ts.resolveModuleName(literal.text, containingFile, options, defaultHost);
        });
    };

    const overrideResolveModuleNameLiterals = getOverrideResolveModuleLiterals(
        ts,
        ADAPTER_PATH,
        originalResolveModuleNameLiterals,
        path => {
            return getQingkuaiFileInfo(program, path);
        },
        path => {
            return {
                ...getQingkuaiConfig(path),
                hoverTipReactiveStatus: true,
            };
        },
    );

    const host: ts.CompilerHost = {
        ...defaultHost,
        getSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile) {
            if (fileName.endsWith(".qk")) {
                const fileInfo = getQingkuaiFileInfo(program, fileName);
                const scriptKind = fileInfo.isTS ? ts.ScriptKind.TS : ts.ScriptKind.JS;
                return ts.createSourceFile(
                    fileName,
                    fileInfo.code,
                    languageVersion,
                    true,
                    scriptKind,
                );
            }
            return defaultHost.getSourceFile(
                fileName,
                languageVersion,
                onError,
                shouldCreateNewSourceFile,
            );
        },
        resolveModuleNameLiterals: overrideResolveModuleNameLiterals,
    };

    // 首次创建 Program，用于确认 .qk 文件的类型
    program = ts.createProgram({
        host,
        options,
        rootNames: inputFilesArr,
    });

    // 为所有 .qk 文件确认类型（注入 Props/Refs/Slots 类型声明等），更新中间代码缓存
    for (const path of qingkuaiFiles) {
        const fileInfo = getQingkuaiFileInfo(program, path);
        confirmTypesForCompileResult(
            ts,
            logger,
            fileInfo,
            newContent => {
                fileInfo.code = newContent;
            },
            () => program,
        );
    }

    // 使用确认类型后的代码重新创建 Program
    return ts.createProgram({
        host,
        options,
        rootNames: inputFilesArr,
    });
}
