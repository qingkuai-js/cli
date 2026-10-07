import type { Command } from "#type-declarations";

import nodePath from "node:path";

import * as prettierPlugin from "prettier-plugin-qingkuai";

import { cliOptions } from "../state";
import { ExitCode } from "../constants";
import { getInputFiles } from "../runtime";
import { isNull, isString } from "../utils/assert";
import { FormatWouldFormat } from "../messages/warn";
import { mapCliToPrettierOptions } from "../options/prettier";
import { format as prettierFormat, resolveConfig } from "prettier";
import { FormatFailed, FormatNoFilesFound } from "../messages/error";
import { getDisplayPath, getFileExtension, readFileSync, writeFileSync } from "../utils/file";

export class FormatCommand implements Command {
    async execute(): Promise<ExitCode> {
        const inputFiles = getInputFiles(path => {
            switch (getFileExtension(path)) {
                case ".qk":
                case ".js":
                case ".jsx":
                case ".mjs":
                case ".cjs":
                case ".ts":
                case ".tsx":
                case ".css":
                case ".sass":
                case ".less":
                case ".scss":
                case ".html":
                case ".json":
                case ".md":
                case ".yaml":
                case ".yml":
                case ".graphql":
                case ".flow":
                case ".htm":
                case ".xhtml":
                case ".sss": {
                    return true;
                }
                default: {
                    const base = nodePath.basename(path);
                    return base === ".prettierrc" || base === ".qingkuairc";
                }
            }
        });
        if (inputFiles.size === 0) {
            FormatNoFilesFound();
            return ExitCode.Failure;
        }

        let hasUnformatted = false;
        const checkOnly = !!cliOptions.check;
        const writeFiles = !!cliOptions.write;
        const cliPrettierOptions = mapCliToPrettierOptions();
        for (const filePath of inputFiles) {
            const source = readFileSync(filePath);
            try {
                let config = await resolveConfig(filePath, {
                    config: isString(cliOptions.config) ? cliOptions.config : undefined,
                });
                if (isNull(config) && nodePath.basename(filePath) === ".qingkuairc") {
                    config = {
                        parser: "json",
                    };
                }
                const prettierOptions = {
                    ...config,
                    ...cliPrettierOptions,
                    filepath: filePath,
                    plugins: [prettierPlugin as any],
                };
                const formatted = await prettierFormat(source, prettierOptions);
                if (formatted === source) {
                    continue;
                }
                hasUnformatted = true;

                if (checkOnly) {
                    FormatWouldFormat(getDisplayPath(filePath));
                } else if (writeFiles) {
                    writeFileSync(filePath, formatted);
                } else {
                    console.log(formatted);
                }
            } catch (err: any) {
                FormatFailed(getDisplayPath(filePath), err.message, err.codeFrame);
                return ExitCode.Failure;
            }
        }

        if (checkOnly && hasUnformatted) {
            return ExitCode.Failure;
        }

        return ExitCode.Success;
    }
}
