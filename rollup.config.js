import esbuild from "rollup-plugin-esbuild";

import { defineConfig } from "rollup";

// 构建上游工具重导出文件的插件
const passthroughEntries = {
    name: "emit-passthrough-entries",
    generateBundle() {
        this.emitFile({
            type: "asset",
            fileName: "prettier.js",
            source: 'export * from "prettier";\n',
        });
        this.emitFile({
            type: "asset",
            fileName: "typescript.cjs",
            source: 'module.exports = require("typescript");\n',
        });
        this.emitFile({ type: "asset", fileName: "vite.js", source: 'export * from "vite";\n' });
    },
};

export default defineConfig({
    input: "./src/index.ts",
    output: {
        dir: "dist",
        format: "esm",
        entryFileNames: "[name].js",
        banner: "#!/usr/bin/env node",
        chunkFileNames: chunk => {
            return (chunk.isDynamicEntry ? "commands" : "shared") + "/[name].js";
        },
    },
    onwarn(warning) {
        if (warning.code === "CIRCULAR_DEPENDENCY") {
            return;
        }
    },
    external: [],
    plugins: [esbuild(), passthroughEntries],
});
