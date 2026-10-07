import nodeFs from "node:fs";
import nodeOs from "node:os";
import nodePath from "node:path";

const STALE_MS = 60 * 60 * 1000;
const WORKSPACE_PREFIX = "qk-cli-it-";

// 集成测试工作区建在系统临时目录（见 integration/helpers.ts），
// 正常由用例自行清理；这里兜底清扫崩溃或中断遗留的过期目录（1 小时以上）
export default function globalTeardown() {
    for (const entry of nodeFs.readdirSync(nodeOs.tmpdir())) {
        if (!entry.startsWith(WORKSPACE_PREFIX)) {
            continue;
        }

        const fullPath = nodePath.join(nodeOs.tmpdir(), entry);
        try {
            if (Date.now() - nodeFs.statSync(fullPath).mtimeMs > STALE_MS) {
                nodeFs.rmSync(fullPath, {
                    force: true,
                    recursive: true,
                });
            }
        } catch {
            // do nothing
        }
    }
}
