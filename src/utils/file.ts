import nodeFs from "node:fs";
import nodeUrl from "node:url";
import nodePath from "node:path";

import { CWD, UTF8 } from "../constants";

export function getDisplayPath(path: string) {
    if (!path.startsWith(CWD)) {
        return path;
    }

    const dir = nodePath.dirname(path);
    if (dir !== CWD) {
        return nodePath.relative(CWD, path);
    }
    return "./" + nodePath.basename(path);
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

export function walkDir(dir: string, callback: (filePath: string) => void): void {
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
                walkDir(fullPath, callback);
            }
            continue;
        }

        callback(fullPath);
    }
}
