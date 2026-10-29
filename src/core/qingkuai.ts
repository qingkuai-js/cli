import type TS from "typescript";
import type { CompileIntermediateResult, CompileResult } from "qingkuai/compiler";

import ts from "typescript";

import { readFileSync } from "../utils/file";
import { getQingkuaiConfig } from "../configs/qingkuai";
import { util as lsUtils } from "qingkuai-language-service";
import { QingkuaiFileInfo } from "qingkuai-language-service/adapters";
import { ReactivityMode, WhitespaceMode, compile, compileIntermediate } from "qingkuai/compiler";

const REACTIVITY_MODES = {
    shallow: ReactivityMode.Shallow,
    reactive: ReactivityMode.Reactive,
};

const WHITESPACE_MODES = {
    preserve: WhitespaceMode.Preserve,
    trim: WhitespaceMode.Trim,
    collapse: WhitespaceMode.Collapse,
    "trim-collapse": WhitespaceMode.TrimCollapse,
};

const qingkuaiFileInfoCache: Record<string, QingkuaiFileInfo> = {};
const qingkuaiCompileResultCache: Record<string, CompileResult> = {};
const qingkuaiIntermidiateCompileResultCache: Record<string, CompileIntermediateResult> = {};

function getCompileOptions(path: string) {
    const config = getQingkuaiConfig(path);
    return {
        ...config,
        whitespace: config.whitespace && WHITESPACE_MODES[config.whitespace],
        reactivityMode: config.reactivityMode && REACTIVITY_MODES[config.reactivityMode],
    };
}

export function getQingkuaiCompileResult(path: string, isDebug: boolean) {
    if (qingkuaiCompileResultCache[path]) {
        return qingkuaiCompileResultCache[path];
    }
    return (qingkuaiCompileResultCache[path] = compile(readFileSync(path), {
        ...getCompileOptions(path),
        debug: isDebug,
        preserveHtmlComments: true,
    }));
}

export function getQingkuaiFileInfo(program: TS.Program, path: string) {
    if (qingkuaiFileInfoCache[path]) {
        return qingkuaiFileInfoCache[path];
    }

    const compileRes = getQingkuaiIntermidiateCompileResult(path);
    const fileInfo = new QingkuaiFileInfo(
        compileRes.code,
        compileRes.scriptDescriptor.isTS,
        1,
        "",
        ts.server.toNormalizedPath(path),
        compileRes.getTypeDelayInterIndexes,
        lsUtils.getIdentifierDescriptionsMap(compileRes),
        ts,
        compileRes.indexMap.itos,
        compileRes.indexMap.stoi,
        compileRes.positions,
        () => program.getSourceFile(path)!,
    );
    return (qingkuaiFileInfoCache[path] = fileInfo);
}

export function getQingkuaiIntermidiateCompileResult(path: string) {
    if (qingkuaiIntermidiateCompileResultCache[path]) {
        return qingkuaiIntermidiateCompileResultCache[path];
    }
    return (qingkuaiIntermidiateCompileResultCache[path] = compileIntermediate(
        readFileSync(path),
        getCompileOptions(path),
    ));
}
