export interface CliResult {
    code: number | null;
    stdout: string;
    stderr: string;
    output: string;
}

export interface ServerHandle {
    output: () => string;
    stop: () => Promise<void>;
}
