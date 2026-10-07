import type TS from "typescript";

import type { ExitCode } from "./constants";
import type { InlineConfig, Plugin } from "vite";
export type { CompileOptions, CompileIntermediateOptions };
import type { CompileOptions, CompileIntermediateOptions } from "qingkuai/compiler";

export interface CommandContext {
    positional: string[];
    args: StrUnknown;
}

export interface Command {
    execute(): MaybePromise<ExitCode>;
}

export interface CommandOption {
    flag: string;
    description: string;
    type: CommandOptionType;
    short?: string;
}

export interface HelpOption {
    long: string;
    description: string;
    default?: string;
    oneOf?: string[];
    short?: string;
    noValue?: boolean;
    valueName?: string;
    multiple?: boolean;
    type?: "boolean" | "string" | "number";
}

export interface CommandEntry {
    description: string;
    examples: string[];
    options: HelpOption[];
    load: () => Promise<Command>;
}

export interface InitTemplate {
    root: string;
    packageRoot: string;
}

export interface InitTarget {
    dir: string;
    name: string;
    isCurrent: boolean;
}

export interface ViteBuildError {
    code?: unknown;
    errors?: unknown;
    frame?: unknown;
    id?: unknown;
    message?: unknown;
    plugin?: unknown;
    loc?: Record<"column" | "file" | "line", unknown>;
}

export interface DiagnosticEntry {
    category: "error" | "warning";
    filePath: string;
    message: string;
    line: number;
    column: number;
    endLine: number;
    endColumn: number;
    source: DiagnosticSource;
    code?: number | string;
}

export interface DiagnosticFormatterOptions {
    cwd?: string;
    oneline?: boolean;
}

export interface DiagnosticCollector {
    outputMessages: string[];
    pushDiagnostic: (entry: DiagnosticEntry) => void;
    flush: () => void;
}

export interface MappedDiagnostic {
    filePath: string;
    line: number;
    column: number;
    code: number;
    message: string;
    category: "error" | "warning";
    endLine?: number;
    endColumn?: number;
}

export interface QkProjectOptions {
    cwd: string;
    inputFiles: string[];
    tsconfigPath?: string;
    cliOptions?: Partial<CompileOptions> & StrUnknown;
}

export interface ResolveConfigOptions {
    ts: typeof TS;
    projectRoot: string;
    tsconfigPath?: string;
    cliOverrides?: StrUnknown;
}

export interface QkFileInfoSnapshot {
    source: string;
    code: string;
    isTS: boolean;
    version: number;
    getSourceIndex: (interIndex: number) => number;
    getInterIndex: (sourceIndex: number) => number;
}

export interface QkLanguageServiceHostState {
    host: TS.LanguageServiceHost;
    setLanguageService: (service: TS.LanguageService) => void;
    confirmTypesForFile: (filePath: string) => boolean;
    confirmTypesForAll: () => boolean;
    getVirtualQkFilePath: (filePath: string) => string;
    getSourceQkFilePath: (filePath: string) => string;
    getQkFileInfo: (filePath: string) => QkFileInfoSnapshot | undefined;
}

export interface CompileMessage {
    type: "error" | "warning";
    value: {
        code: number;
        message: string;
        stack?: string;
        loc?: Location;
        description?: string;
    };
}

export interface CompileResult {
    code: string;
    messages: CompileMessage[];
    mappings?: string;
    scriptDescriptor?: {
        isTS?: boolean;
    };
}

export interface QkProject {
    readonly ts: typeof TS;
    readonly rootDir: string;
    readonly compilerOptions: TS.CompilerOptions;
    readonly tsconfigPath: string | undefined;
    getProgram(): TS.Program | undefined;
    checkFile(filePath: string): MappedDiagnostic[];
    emitDeclarations(options?: {
        writeFile?: TS.WriteFileCallback;
        onlyFiles?: string[];
    }): TS.EmitResult;
    getQkFileInfo(filePath: string): QkFileInfoSnapshot | undefined;
    dispose(): void;
}

export type ViteServerOptionsFragment = Pick<
    NonNullable<ViteServerConfig>,
    "port" | "host" | "open"
>;
export type MaybePromise<T> = T | Promise<T>;
export type QingkuaiPluginFactory = () => Plugin;
export type StrUnknown = Record<string, unknown>;
export type ArbitraryFunc = (...args: any) => any;
export type ViteBildConfig = InlineConfig["build"];
export type DiagnosticSource = "ts" | "qk" | "vite";
export type ViteServerConfig = InlineConfig["server"];
export type AnyObject = Record<string | number | symbol, any>;
export type CommandOptionType = "boolean" | "string" | "number" | "array";
