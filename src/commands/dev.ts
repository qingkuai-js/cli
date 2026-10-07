import type { Command } from "#type-declarations";

import * as vite from "vite";

import { cliOptions } from "../state";
import { CWD, ExitCode, ViteCommand } from "../constants";
import { styleViteStartupBanner } from "../utils/format";
import { mapCliToServerOptions, resolveViteMode } from "../options/vite";
import { resolveConfigFile, loadUserViteConfig, withBuiltinQingkuaiPlugin } from "../configs/vite";

export class DevCommand implements Command {
    async execute(): Promise<ExitCode> {
        const configFile = resolveConfigFile(cliOptions.config);
        if (configFile === false) {
            return ExitCode.Failure;
        }

        try {
            const mode = resolveViteMode(ViteCommand.Dev);
            const userConfig = await loadUserViteConfig(configFile, ViteCommand.Dev);
            const server = await vite.createServer({
                ...userConfig,
                root: CWD,
                configFile: false,
                mode,
                plugins: withBuiltinQingkuaiPlugin(userConfig),
                css: { devSourcemap: true, ...userConfig.css },
                server: { ...userConfig.server, ...mapCliToServerOptions() },
            });
            await server.listen();
            server.config.logger.info(
                styleViteStartupBanner(vite.version, mode, Math.ceil(performance.now())),
                { clear: process.stdout.bytesWritten === 0 && process.stderr.bytesWritten === 0 },
            );
            server.printUrls();
            await new Promise(() => {});
        } catch (err) {
            console.error(err);
            return ExitCode.Failure;
        }
        return ExitCode.Success;
    }
}
