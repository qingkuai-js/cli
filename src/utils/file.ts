import nodeFs from "node:fs";
import nodeUrl from "node:url";
import nodePath from "node:path";

import { NORMALIZED_CWD, UTF8 } from "../constants";

export function normalizePath(path: string) {
    return path.replaceAll("\\", "/");
}

// 展示用路径：在 CWD 下时取相对路径，统一正斜杠
export function getDisplayPath(path: string) {
    const normalizedPath = normalizePath(path);
    if (!normalizedPath.startsWith(NORMALIZED_CWD)) {
        return normalizedPath;
    }

    const dir = nodePath.dirname(normalizedPath);
    if (dir !== NORMALIZED_CWD) {
        return normalizePath(nodePath.relative(NORMALIZED_CWD, normalizedPath));
    }
    return "./" + nodePath.basename(normalizedPath);
}

export function getFileExtension(filePath: string): string {
    const lowerPath = filePath.toLowerCase();
    if (lowerPath.endsWith(".d.ts")) {
        return ".d.ts";
    }
    return nodePath.extname(filePath).toLowerCase();
}

export function readFileSync(path: string) {
    return nodeFs.readFileSync(path, UTF8);
}

export function writeFileSync(path: string, content: string) {
    nodeFs.writeFileSync(path, content, UTF8);
}

// 从模块 URL 所在位置向上逐级查找最近的 package.json，返回其所在目录
export function findPackageRoot(moduleUrl: string): string | false {
    let current = nodePath.dirname(nodeUrl.fileURLToPath(moduleUrl));
    while (true) {
        if (nodeFs.existsSync(nodePath.join(current, "package.json"))) {
            return current;
        }

        const parent = nodePath.dirname(current);
        if (parent === current) {
            return false;
        }
        current = parent;
    }
}
