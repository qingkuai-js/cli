import nodeFs from "node:fs";
import nodePath from "node:path";

import { CWD } from "./constants";
import { globCharsRE } from "./regular";
import { cliPositional } from "./state";
import { normalizePath } from "./utils/file";

export function getInputFiles(
    isFileProcessable?: (path: string) => boolean,
    fallbackFiles: readonly string[] = [],
) {
    const result = new Set<string>();

    // 无位置参数时回退到 tsconfig 的 include/files 解析结果
    if (!cliPositional.length) {
        for (const filePath of fallbackFiles) {
            addProcessable(filePath);
        }
        return result;
    }

    // TypeScript 报告的 SourceFile.fileName 一律是正斜杠，集合里存归一化后的路径
    function addProcessable(filePath: string) {
        const normalizedPath = normalizePath(filePath);
        if (!isFileProcessable || isFileProcessable(normalizedPath)) {
            result.add(normalizedPath);
        }
    }

    const includes: string[] = [];
    const excludes: string[] = [];
    for (const p of cliPositional) {
        if (!p.startsWith("!")) {
            includes.push(p);
        } else {
            excludes.push(p.slice(1));
        }
    }

    // 收集 include 匹配的文件
    for (const pattern of includes) {
        applyFilesForPattern(pattern, addProcessable);
    }

    // 移除 exclude 匹配的文件
    for (const pattern of excludes) {
        applyFilesForPattern(pattern, filePath => result.delete(normalizePath(filePath)));
    }

    return result;
}

export function walkDir(dir: string, callback: (filePath: string) => void): void {
    walkDirectory(nodePath.resolve(dir), callback, new Set());
}

// 链接照常跟随（monorepo 里目录常是指向别处的软链），但同一个真实目录只展开一次，链接指回祖先时不会无限递归
function walkDirectory(dir: string, callback: (filePath: string) => void, visited: Set<string>) {
    let realDir: string;
    try {
        realDir = nodeFs.realpathSync(dir);
    } catch {
        return;
    }
    if (visited.has(realDir)) {
        return;
    }
    visited.add(realDir);

    let entries: string[];
    try {
        entries = nodeFs.readdirSync(dir);
    } catch {
        return;
    }

    for (const entry of entries) {
        const fullPath = nodePath.resolve(dir, entry);
        let stat: nodeFs.Stats;
        try {
            stat = nodeFs.statSync(fullPath);
        } catch {
            continue;
        }
        if (stat.isDirectory()) {
            if (!entry.startsWith(".") && entry !== "node_modules") {
                walkDirectory(fullPath, callback, visited);
            }
            continue;
        }
        callback(fullPath);
    }
}

function applyFilesForPattern(pattern: string, action: (filePath: string) => void) {
    if (globCharsRE.test(pattern)) {
        const relatives = nodeFs.globSync(pattern, {
            cwd: CWD,
        });
        for (const relative of relatives) {
            action(nodePath.resolve(CWD, relative));
        }
        return;
    }

    const resolved = nodePath.resolve(CWD, pattern);
    if (!nodeFs.existsSync(resolved)) {
        return;
    }

    const stat = nodeFs.statSync(resolved);
    if (stat.isDirectory()) {
        walkDir(resolved, action);
    } else {
        action(resolved);
    }
}
