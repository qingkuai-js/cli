import { ESC } from "./constants";

export const newLineRE = /\r?\n/;
export const whitespaceRE = /(\s+)/;
export const globCharsRE = /[*?{}[\]]/;
export const leadingWhitespaceRE = /^\s*/;
export const kebabCharRE = /-([a-zA-Z0-9])/g;

export const versionRE = /^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/;
export const versionRangeRE = /^([\^~]?)(\d+)\.(\d+)\.(\d+)$/;

export const sourceMappingURLRE = /\/\/# sourceMappingURL=.+$/m;
export const cannotFindPackageRE = /Cannot find package ['"]([^'"]+)['"]/;

export const ansiRE = new RegExp(`${ESC}\\[[0-9;]*m`, "g");
export const ansiColorRE = new RegExp(`^${ESC}\\[(?:3[0-9]|9[0-9]|38|48)`);

export const viteErrorFrameRE = /\n\s*╭─\[/;
export const viteErrorFrameHeaderRE = /╭─\[\s*(.+?):(\d+):(\d+)\s*\]/;
