export enum ExitCode {
    Success = 0,
    Failure = 1,
}

export enum ViteCommand {
    Dev = "serve",
    Build = "build",
    Preview = "preview",
}

export enum ViteMode {
    Production = "production",
    Development = "development",
}

export const ESC = "\x1b";
export const UTF8 = "utf-8";
export const CWD = process.cwd();
export const DEFAULT_PROJECT_NAME = "qingkuai-app";
export const TERMINAL_WIDTH: number = process.stdout.columns || 80;
