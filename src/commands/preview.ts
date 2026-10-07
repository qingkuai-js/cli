import type { Command } from "#type-declarations";

import { preview } from "vite";

import nodeFs from "node:fs";
import nodePath from "node:path";

import { cliOptions } from "../state";
import { getDisplayPath } from "../utils/file";
import { PreviewDistNotFound } from "../messages/error";
import { CWD, ExitCode, ViteCommand } from "../constants";
import { resolveConfigFile, loadUserViteConfig } from "../configs/vite";
import { mapCliToServerOptions, resolveViteMode } from "../options/vite";

export class PreviewCommand implements Command {
    async execute(): Promise<ExitCode> {
        const configFile = resolveConfigFile(cliOptions.config);
        if (configFile === false) {
            return ExitCode.Failure;
        }

        try {
            const userConfig = await loadUserViteConfig(configFile, ViteCommand.Preview);
            const outDir = nodePath.resolve(CWD, userConfig.build?.outDir ?? "dist");
            if (!nodeFs.statSync(outDir, { throwIfNoEntry: false })?.isDirectory()) {
                PreviewDistNotFound(getDisplayPath(outDir));
                return ExitCode.Failure;
            }
            await preview({
                ...userConfig,
                root: CWD,
                configFile: false,
                mode: resolveViteMode(ViteCommand.Preview),
                preview: { ...userConfig.preview, ...mapCliToServerOptions() },
            });
            await new Promise(() => {});
        } catch (err) {
            console.error(err);
            return ExitCode.Failure;
        }
        return ExitCode.Success;
    }
}
