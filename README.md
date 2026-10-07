# @qingkuai/cli

The official command line toolchain for [Qingkuai](https://qingkuai.dev) — scaffolding, dev server, build, preview, type declaration emission and formatting for `.qk` projects.

vite, typescript, prettier (with `prettier-plugin-qingkuai`) and `qingkuai-language-service` are bundled at pinned versions and pre-wired into every command, so the toolchain works with zero configuration. The only peer dependency is the `qingkuai` compiler runtime.

## Usage

Create a project (this is all `npm create qingkuai` does):

```bash
npm create qingkuai my-app
cd my-app
npm install && npm run dev
```

Or install the CLI into an existing project:

```bash
npm install -D @qingkuai/cli
npx qingkuai --help
```

## Commands

| Command                      | Description                                                                      |
| ---------------------------- | -------------------------------------------------------------------------------- |
| `qingkuai init [name]`       | Scaffold a new Qingkuai application powered by the CLI toolchain                 |
| `qingkuai check [files...]`  | Perform syntax or type checking on Qingkuai component files and TypeScript files |
| `qingkuai dev`               | Start the vite dev server with HMR for the current application                   |
| `qingkuai build`             | Build a Qingkuai application or library into distributable files via vite        |
| `qingkuai preview`           | Serve the build output directory via vite's preview server                       |
| `qingkuai build-types [dir]` | Type-check and emit declaration files (`.d.ts`) with full tsconfig fidelity      |
| `qingkuai format [files...]` | Format Qingkuai component files or other Prettier-supported files                |

Run `qingkuai <command> --help` for the full list of flags and examples.

## Toolchain re-exports

For advanced setups, the bundled tools are re-exported so that tooling resolves to the same pinned instances the CLI uses:

- `@qingkuai/cli/vite` — vite
- `@qingkuai/cli/typescript` — typescript (CJS)
- `@qingkuai/cli/prettier` — prettier
- `@qingkuai/cli/vite/client` — vite client types

## Documentation

Learn more at [Qingkuai Docs](https://qingkuai.dev), or try it out in the [Playground](https://try.qingkuai.dev).

## License

[MIT](LICENSE) © 2024-present, all contributors to qingkuai
