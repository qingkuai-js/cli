import nodeFs from "node:fs";
import nodeOs from "node:os";
import nodeUrl from "node:url";
import nodePath from "node:path";
import nodeChildProcess from "node:child_process";

const WORKSPACE_PREFIX = "qk-cli-it-";

export interface CliResult {
    code: number | null;
    stdout: string;
    stderr: string;
    output: string;
}

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
        child.stdout?.on("data", chunk => (stdout += chunk));
        child.stderr?.on("data", chunk => (stderr += chunk));
        child.on("error", reject);
        child.on("exit", code => {
            resolve({ code, stdout, stderr, output: stdout + stderr });
        });
    });
}

export function disposeWorkspace(workspace: string) {
    nodeFs.rmSync(workspace, { recursive: true, force: true });
}

export interface ServerHandle {
    output: () => string;
    stop: () => Promise<void>;
}

// fixture 复制到独立临时工作区；软链 CLI 自带依赖，使编译产物中的 qingkuai 运行时 import 可解析
export function createWorkspace(fixture: string, links: string[] = ["qingkuai"]): string {
    const workspace = nodeFs.mkdtempSync(nodePath.join(nodeOs.tmpdir(), WORKSPACE_PREFIX));
    nodeFs.cpSync(nodePath.resolve(import.meta.dirname, "fixtures", fixture), workspace, {
        recursive: true,
    });

    const modulesDir = nodePath.join(workspace, "node_modules");
    nodeFs.mkdirSync(modulesDir, { recursive: true });
    for (const name of links) {
        nodeFs.symlinkSync(
            nodePath.join(REPO_ROOT, "node_modules", name),
            nodePath.join(modulesDir, name),
            "dir",
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
            const res = await fetch(url);
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
