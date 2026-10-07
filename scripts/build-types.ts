import nodeFs from "node:fs";
import nodeUrl from "node:url";
import nodePath from "node:path";

import { util as qingkuaiUtil } from "qingkuai/compiler";
import { Extractor, ExtractorConfig } from "@microsoft/api-extractor";

const dirPath = nodePath.dirname(nodeUrl.fileURLToPath(import.meta.url));
const projectRoot = nodePath.resolve(dirPath, "..");
const typesDir = nodePath.join(projectRoot, "dist/types");
nodeFs.mkdirSync(typesDir, { recursive: true });

Extractor.invoke(
    ExtractorConfig.prepare({
        configObject: {
            dtsRollup: {
                enabled: true,
                publicTrimmedFilePath: resolveWithProjectRoot("dist/types/index.d.ts"),
            },
            compiler: {
                tsconfigFilePath: resolveWithProjectRoot("tsconfig.json"),
            },
            projectFolder: projectRoot,
            mainEntryPointFilePath: resolveWithProjectRoot("dist/temp-types/src/index.d.ts"),
        },
        configObjectFullPath: undefined,
        packageJsonFullPath: resolveWithProjectRoot("package.json"),
    }),
    {
        localBuild: true,
    },
);
nodeFs.writeFileSync(
    resolveWithProjectRoot("dist/types/client.d.ts"),
    '/// <reference types="vite/client" />\n',
);
nodeFs.writeFileSync(
    resolveWithProjectRoot("dist/types/typescript.d.cts"),
    'import typescript = require("typescript");\nexport = typescript;\n',
);
nodeFs.writeFileSync(
    resolveWithProjectRoot("dist/types/prettier.d.ts"),
    qingkuaiUtil.formatSourceCode(`
        export * from "prettier";

        interface QingkuaiPrettierOptions {
            spaceAroundInterpolation?: boolean;
            selfCloseEmptySlotTags?: boolean;
            componentTagFormatPreference?: "camel" | "kebab";
            componentAttributeFormatPreference?: "camel" | "kebab";
        }

        declare module "prettier" {
            interface Options extends QingkuaiPrettierOptions {}
        }
    `),
);
nodeFs.writeFileSync(resolveWithProjectRoot("dist/types/vite.d.ts"), 'export * from "vite";\n');

function resolveWithProjectRoot(...paths: string[]): string {
    return nodePath.resolve(projectRoot, ...paths);
}
