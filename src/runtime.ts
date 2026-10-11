import nodeFs from "node:fs";
import nodePath from "node:path";

import { CWD } from "./constants";
import { globCharsRE } from "./regular";
import { cliPositional } from "./state";

export function getInputFiles(
    isFileProcessable?: (path: string) => boolean,
    fallbackFiles: readonly string[] = [],
) {
    const result = new Set<string>();

    // 无位置参数时回退到 tsconfig 的 include/files 解析结果
    if (!cliPositional.length) {
        for (const filePath of fallbackFiles) {
            if (!isFileProcessable || isFileProcessable(filePath)) {
                result.add(filePath);
            }
        }
        return result;
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
        applyFilesForPattern(pattern, filePath => {
            if (!isFileProcessable || isFileProcessable(filePath)) {
                result.add(filePath);
            }
        });
    }

    // 移除 exclude 匹配的文件
    for (const pattern of excludes) {
        applyFilesForPattern(pattern, filePath => result.delete(filePath));
    }

    return result;
}

export function walkDir(dir: string, callback: (filePath: string) => void): void {
    try {
        for (const entry of nodeFs.readdirSync(dir)) {
            const fullPath = nodePath.resolve(dir, entry);
            try {
                if (nodeFs.statSync(fullPath).isDirectory()) {
                    if (!entry.startsWith(".")) {
                        walkDir(fullPath, callback);
                    }
                    continue;
                }
                callback(fullPath);
            } catch {
                // do nothing
            }
        }
    } catch {
        // do nothing
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
