import type { AnyObject } from "#type-declarations";

import nodePath from "node:path";

import { CWD } from "../constants";
import { kebabCharRE, versionRE, versionRangeRE } from "../regular";

export function getShownPath(path: string) {
    if (path.startsWith(CWD)) {
        return nodePath.relative(CWD, path);
    }
    return path;
}

export function traverseObject<T extends AnyObject>(
    o: T,
    callback: (key: keyof T, value: T[keyof T], index: number) => void,
) {
    const keys = Object.keys(o);
    for (let i = 0; i < keys.length; i++) {
        callback(keys[i], o[keys[i]], i);
    }
}

export function joinWithNewLine(strs: string[], lineCount = 1) {
    return strs.join("\n".repeat(Math.floor(Math.max(lineCount, 0))));
}

export function kebab2Camel(s: string) {
    return s.replace(kebabCharRE, (_, char: string) => char.toUpperCase());
}

// 判断版本是否落在声明的支持范围内
export function isSupportedVersion(version: string, range: string) {
    const rangeMatch = versionRangeRE.exec(range);
    if (!rangeMatch) {
        return true;
    }

    const versionMatch = versionRE.exec(version);
    if (!versionMatch) {
        return true;
    }

    const [, vMajor, vMinor, vPatch] = versionMatch;
    const [, prefix, major, minor, patch] = rangeMatch;
    if (!prefix) {
        return vMajor === major && vMinor === minor && vPatch === patch;
    }
    if (vMajor !== major) {
        return false;
    }
    if (prefix === "~") {
        return vMinor === minor && +vPatch >= +patch;
    }
    if (major === "0") {
        return vMinor === minor && +vPatch >= +patch;
    }
    return +vMinor > +minor || (vMinor === minor && +vPatch >= +patch);
}
