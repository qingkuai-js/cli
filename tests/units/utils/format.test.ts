import { describe, expect, it } from "vitest";

import {
    red,
    yellow,
    wrapText,
    stylePath,
    errorLabel,
    warningLabel,
} from "../../../src/utils/format";
import { ESC } from "../../../src/constants";

describe("wrapText", () => {
    it("wraps text at word boundaries (whitespace carried onto continuation lines)", () => {
        expect(wrapText("aaa bbb ccc", 7)).toEqual(["aaa bbb", " ccc"]);
    });

    it("keeps overlong words intact on a single line", () => {
        expect(wrapText("aaaaaaaa", 3)).toEqual(["aaaaaaaa"]);
    });

    it("excludes ANSI color codes from width and inherits color on continuation lines", () => {
        const lines = wrapText(`${ESC}[31mfoo bar${ESC}[0m`, 3);
        expect(lines).toEqual([`${ESC}[31mfoo`, `${ESC}[31m `, `${ESC}[31mbar${ESC}[0m`]);
    });

    it("returns empty text as a single element", () => {
        expect(wrapText("", 10)).toEqual([""]);
    });
});

describe("style helpers", () => {
    it("appends RESET by default; reset=false is for composition", () => {
        expect(red("x")).toBe(`${ESC}[31mx${ESC}[0m`);
        expect(red("x", false)).toBe(`${ESC}[31mx`);
        expect(yellow("y", false) + red("z")).toContain(ESC);
    });

    it("errorLabel/warningLabel/stylePath produce fully styled output", () => {
        expect(errorLabel).toBe(`${ESC}[31m[Error]${ESC}[0m`);
        expect(warningLabel).toBe(`${ESC}[33m[Warning]${ESC}[0m`);
        expect(stylePath("a/qk.ts")).toContain("a/qk.ts");
        expect(stylePath("a/qk.ts").endsWith(`${ESC}[0m`)).toBe(true);
    });
});
