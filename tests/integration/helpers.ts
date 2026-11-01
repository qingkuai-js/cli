import type { CliResult, ServerHandle } from "../types";

import nodeFs from "node:fs";
import nodeOs from "node:os";
import nodeUrl from "node:url";
import nodePath from "node:path";
import nodeChildProcess from "node:child_process";

const CLI_TIMEOUT = 20000;
const WORKSPACE_PREFIX = "qk-cli-it-";

export const REPO_ROOT = nodePath.resolve(
    nodePath.dirname(nodeUrl.fileURLToPath(import.meta.url)),
    "..",
    "..",
);
export const CLI_ENTRY = nodePath.join(REPO_ROOT, "dist", "index.js");

export function spawnCli(args: string[], cwd: string): Promise<CliResult> {
    return new Promise((resolve, reject) => {
        let stdout = "";
        let stderr = "";
        const child = nodeChildProcess.spawn(process.execPath, [CLI_ENTRY, ...args], { cwd });

        // 卡住时杀掉子进程并把已产生输出带回，避免只剩一个没有线索的 30s 超时
        const timer = setTimeout(() => {
            child.kill();
            reject(
                new Error(
                    `CLI did not exit within ${CLI_TIMEOUT}ms: ${args.join(" ")}\n${stdout}${stderr}`,
                ),
            );
        }, CLI_TIMEOUT);

        child.stdout?.on("data", chunk => (stdout += chunk));
        child.stderr?.on("data", chunk => (stderr += chunk));
        child.on("error", error => {
            clearTimeout(timer);
            reject(error);
        });
        child.on("exit", code => {
            clearTimeout(timer);
            resolve({ code, stdout, stderr, output: stdout + stderr });
        });
    });
}

export function disposeWorkspace(workspace: string) {
    // Windows 上子进程释放句柄有延迟，直接删目录会偶发 EPERM
    nodeFs.rmSync(workspace, {
        recursive: true,
        force: true,
        maxRetries: 5,
        retryDelay: 100,
    });
}

// 目录软链；Windows 上使用 junction 以支持目录软链
export function linkDirectory(target: string, path: string) {
    nodeFs.symlinkSync(target, path, process.platform === "win32" ? "junction" : "dir");
}

// 临时工作区；用 native realpath 展开 Windows 的 8.3 短名（如 RUNNER~1）。
// JS 实现只解析链接、不展开短名，短名会让 vite 的 fs.allow 与 TypeScript 的路径规范化对不上
export function createTempWorkspace(prefix = WORKSPACE_PREFIX): string {
    return nodeFs.realpathSync.native(nodeFs.mkdtempSync(nodePath.join(nodeOs.tmpdir(), prefix)));
}

// fixture 复制到独立临时工作区；软链 CLI 自带依赖，使编译产物中的 qingkuai 运行时 import 可解析
export function createWorkspace(fixture: string, links: string[] = ["qingkuai"]): string {
    const workspace = createTempWorkspace();
    nodeFs.cpSync(nodePath.resolve(import.meta.dirname, "fixtures", fixture), workspace, {
        recursive: true,
    });

    const modulesDir = nodePath.join(workspace, "node_modules");
    nodeFs.mkdirSync(modulesDir, { recursive: true });
    for (const name of links) {
        linkDirectory(
            nodePath.join(REPO_ROOT, "node_modules", name),
            nodePath.join(modulesDir, name),
        );
    }
    return workspace;
}

// 起常驻服务并轮询就绪（进程退出或 URL 可达前不返回）；测试结束必须 stop，避免泄漏端口与进程
export async function startServer(args: string[], cwd: string, url: string): Promise<ServerHandle> {
    let stdout = "";
    let stderr = "";
    const child = nodeChildProcess.spawn(process.execPath, [CLI_ENTRY, ...args], {
        cwd,
        stdio: ["ignore", "pipe", "pipe"],
    });
    child.stdout?.on("data", chunk => (stdout += chunk));
    child.stderr?.on("data", chunk => (stderr += chunk));

    let ready = false;
    const deadline = Date.now() + 15000;
    while (Date.now() < deadline) {
        if (child.exitCode !== null) {
            break;
        }
        try {
            // 不消费响应体、也不关连接，undici 会把这条 socket 留在池子里，
            // 服务进程被杀后池里那条死连接的写入会冒成 unhandled 的 setTypeOfService 错误
            // An unconsumed body leaves the socket pooled; after the server process dies a
            // write on that dead socket surfaces as an unhandled setTypeOfService error
            const res = await fetch(url, { headers: { connection: "close" } });
            await res.body?.cancel();
            if (res.ok) {
                ready = true;
                break;
            }
        } catch {
            // 尚未监听，继续轮询
        }
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    if (!ready) {
        const output = stdout + stderr;
        child.kill("SIGTERM");
        throw new Error(`server not ready at ${url}\n${output}`);
    }

    return {
        output: () => stdout + stderr,
        stop: () => {
            return new Promise<void>(resolve => {
                if (child.exitCode !== null) {
                    return resolve();
                }
                child.once("exit", () => resolve());
                child.kill("SIGTERM");
            });
        },
    };
}
