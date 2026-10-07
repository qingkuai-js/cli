import { errorLabel, stylePath } from "../utils/format";

export function UnexpectedError(err: unknown) {
    console.error(err);
}

export function MissingCommand() {
    consoleErrorLabel(
        "Command is required. Use 'qingkuai <command> [options] [files...]' or '--help/-h'.",
    );
}

export function InitDirectoryNotEmpty(dir: string) {
    consoleErrorLabel(
        `Target directory is not empty: ${stylePath(dir)}. Use '--force' to write into it.`,
    );
}

export function InitMultipleNames() {
    consoleErrorLabel("The init command accepts at most one project name.");
}

export function InitTemplateMissing(dir: string) {
    consoleErrorLabel(
        `Template directory is missing: ${stylePath(dir)}. The installation may be corrupted — try reinstalling @qingkuai/cli.`,
    );
}

export function CheckNoProcessableFiles() {
    consoleErrorLabel("no processable files found");
}

export function FormatNoFilesFound() {
    consoleErrorLabel("no files found");
}

export function FormatFailed(filePath: string, message: string, codeFrame?: string) {
    const firstLine = (message || "unknown").split("\n")[0];
    console.error(`${stylePath(filePath)} - ${errorLabel}: ${firstLine}${codeFrame || ""}`);
}

export function ProjectConfigParseFailed(configFile: string, message: string) {
    console.error(`${errorLabel}: failed to parse ${stylePath(configFile)}: ${message}`);
}

export function BuildFailed(message: string) {
    consoleErrorLabel(message);
}

export function BuildEntryNotFound(entry: string) {
    consoleErrorLabel(`Entry file does not exist: ${stylePath(entry)}.`);
}

export function BuildMultipleEntries() {
    consoleErrorLabel("The build command accepts at most one entry file.");
}

export function BuildConfigNotFound(configFile: string) {
    consoleErrorLabel(`Vite config file does not exist: ${stylePath(configFile)}.`);
}

export function BuildInvalidFormat(invalid: string[], supported: readonly string[]) {
    consoleErrorLabel(
        `Invalid build format: ${invalid.length > 0 ? invalid.join(", ") : "(empty)"}. Supported formats: ${supported.join(", ")}.`,
    );
}

export function MissingDependencies(missing: string[]) {
    consoleErrorLabel(
        `Missing dependencies: ${missing.join(", ")}. They are bundled with @qingkuai/cli as fixed versions — try reinstalling @qingkuai/cli.`,
    );
}

export function BuildEntryRequired() {
    consoleErrorLabel(
        `No entry found. Create an index.html in the current directory, add a vite config file, or specify an entry file, e.g. 'qingkuai build src/App.qk'.`,
    );
}

export function PreviewDistNotFound(distDir: string) {
    consoleErrorLabel(
        `Preview output directory does not exist: ${stylePath(distDir)}. Run 'qingkuai build' first.`,
    );
}

function consoleErrorLabel(msg: string) {
    console.error(errorLabel + ": " + msg);
}
