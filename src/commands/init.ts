import type { Command, InitTarget, InitTemplate } from "#type-declarations";

import nodeFs from "node:fs";
import nodePath from "node:path";

import { isString } from "../utils/assert";
import { cliOptions, cliPositional } from "../state";
import { CWD, DEFAULT_PROJECT_NAME, ExitCode } from "../constants";
import { findPackageRoot, getDisplayPath, readFileSync, writeFileSync } from "../utils/file";
import { InitDirectoryNotEmpty, InitMultipleNames, InitTemplateMissing } from "../messages/error";

export class InitCommand implements Command {
    async execute(): Promise<ExitCode> {
        const template = resolveTemplate(cliOptions.ts === true ? "ts" : "js");
        if (template === false) {
            return ExitCode.Failure;
        }

        const target = resolveTarget();
        if (target === false) {
            return ExitCode.Failure;
        }

        const manifest = readManifest(template.packageRoot);
        nodeFs.cpSync(template.root, target.dir, {
            recursive: true,
        });
        restoreDotFiles(target.dir);
        rewriteTitle(target.dir, target.name);
        writeAdaptedManifest(target.dir, target.name, manifest);
        console.log(`✨ Project initialized at ${getDisplayPath(target.dir)}`);

        if (!target.isCurrent) {
            console.log(`  cd ${target.name}`);
        }
        console.log("  npm install");
        console.log("  npm run dev");
        return ExitCode.Success;
    }
}

// 模板随 npm 包分发：从命令文件位置向上找 package.json 定位包根
function resolveTemplate(language: string): InitTemplate | false {
    const packageRoot = findPackageRoot(import.meta.url);
    if (packageRoot === false) {
        InitTemplateMissing("templates");
        return false;
    }

    const root = nodePath.join(packageRoot, "templates", language);
    if (!nodeFs.statSync(root, { throwIfNoEntry: false })?.isDirectory()) {
        InitTemplateMissing(getDisplayPath(root));
        return false;
    }
    return { root, packageRoot };
}

// 返回 false 表示已报告错误
function resolveTarget(): InitTarget | false {
    if (cliPositional.length > 1) {
        InitMultipleNames();
        return false;
    }

    const isCurrent = cliPositional[0] === ".";
    const position = cliPositional[0] ?? DEFAULT_PROJECT_NAME;
    const dir = isCurrent ? CWD : nodePath.resolve(CWD, position);
    if (cliOptions.force !== true && isDirectoryNotEmpty(dir)) {
        InitDirectoryNotEmpty(getDisplayPath(dir));
        return false;
    }
    return {
        dir,
        isCurrent,
        name: nodePath.basename(dir),
    };
}

function isDirectoryNotEmpty(dir: string) {
    return (
        nodeFs.statSync(dir, { throwIfNoEntry: false })?.isDirectory() &&
        nodeFs.readdirSync(dir).length > 0
    );
}

function restoreDotFiles(dir: string) {
    for (const entry of nodeFs.readdirSync(dir)) {
        if (entry.startsWith("_")) {
            nodeFs.renameSync(nodePath.join(dir, entry), nodePath.join(dir, `.${entry.slice(1)}`));
        }
    }
}

function rewriteTitle(dir: string, name: string) {
    const htmlPath = nodePath.join(dir, "index.html");
    const html = readFileSync(htmlPath);
    writeFileSync(htmlPath, html.replace(/(?<=<title>).*?(?=<\/title>)/, name));
}

function writeAdaptedManifest(dir: string, name: string, manifest: Record<string, unknown>) {
    const pkg = JSON.parse(readFileSync(nodePath.join(dir, "package.json")));
    const adapted = {
        name,
        ...pkg,
        dependencies: {
            ...pkg.dependencies,
            qingkuai: readRange(manifest, true, "qingkuai"),
        },
        devDependencies: {
            ...pkg.devDependencies,
            "@qingkuai/cli": readRange(manifest, false, "version"),
        },
    };
    writeFileSync(nodePath.join(dir, "package.json"), JSON.stringify(adapted, null, 4) + "\n");
}

function readRange(manifest: Record<string, unknown>, isPeer: boolean, field: string) {
    const source = isPeer ? manifest["peerDependencies"] : manifest;
    const value = (source as Record<string, unknown>)?.[field];
    return isString(value) && value ? value : "*";
}

function readManifest(packageRoot: string) {
    return JSON.parse(readFileSync(nodePath.join(packageRoot, "package.json")));
}
