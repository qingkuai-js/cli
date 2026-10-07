// 统一的 ANSI 终端样式工具。
// 集中管理所有颜色和样式，避免项目中散落 \x1b[...m 字面量。
//
// 所有样式函数签名：fn(text, reset = true)
// - reset = true（默认）：自动追加 RESET，适合直接输出
// - reset = false：不追加 RESET，适合组合多个样式

import { ESC } from "../constants";
import { ansiRE, ansiColorRE, whitespaceRE } from "../regular";

const CSI = "\x1b[";
const RESET = `${CSI}0m`;
const BOLD = `${CSI}1m`;
const UNDERLINE = `${CSI}4m`;
const RED = `${CSI}31m`;
const YELLOW = `${CSI}33m`;
const GRAY = `${CSI}90m`;
const PARAM = `${CSI}38;2;253;147;83m`;
const QINGKUAI = `${CSI}38;2;28;151;243m`;

export const errorLabel = red("[Error]");
export const warningLabel = yellow("[Warning]");

export function styleParam(text: string): string {
    return `${BOLD}${PARAM}${text}${RESET}`;
}

export function stylePath(text: string): string {
    return `${BOLD}${UNDERLINE}${QINGKUAI}${text}${RESET}`;
}

export function red(text: string, reset = true): string {
    return reset ? `${RED}${text}${RESET}` : `${RED}${text}`;
}

export function yellow(text: string, reset = true): string {
    return reset ? `${YELLOW}${text}${RESET}` : `${YELLOW}${text}`;
}

export function gray(text: string, reset = true): string {
    return reset ? `${GRAY}${text}${RESET}` : `${GRAY}${text}`;
}

export function cyan(text: string, reset = true): string {
    return reset ? `${QINGKUAI}${text}${RESET}` : `${QINGKUAI}${text}`;
}

export function bold(text: string, reset = true): string {
    return reset ? `${BOLD}${text}${RESET}` : `${BOLD}${text}`;
}

export function underline(text: string, reset = true): string {
    return reset ? `${UNDERLINE}${text}${RESET}` : `${UNDERLINE}${text}`;
}

export function orange(text: string, reset = true): string {
    return reset ? `${PARAM}${text}${RESET}` : `${PARAM}${text}`;
}

/**
 * 将文本按可见宽度在词边界折行。
 * ANSI 颜色码不计入宽度，续行自动继承上一行的颜色。
 *
 * @param text     待折行文本（可含 ANSI 码）
 * @param maxWidth 每行最大可见宽度
 * @returns        折行后的文本片段（不含行前缀）
 */
export function wrapText(text: string, maxWidth: number) {
    let currentLine = "";
    let currentWidth = 0;

    const lines: string[] = [];
    const words = text.split(whitespaceRE);

    for (const word of words) {
        const visibleWidth = [...word.replace(ansiRE, "")].length;
        if (currentWidth + visibleWidth > maxWidth && currentWidth > 0) {
            lines.push(currentLine);
            const inheritColor = getLastColor(currentLine);
            currentLine = inheritColor;
            currentWidth = 0;
        }
        currentLine += word;
        currentWidth += visibleWidth;
    }

    if (currentLine) {
        lines.push(currentLine);
    }

    return lines.length > 0 ? lines : [text];
}

/** 获取字符串末尾最后一个颜色码 */
function getLastColor(str: string): string {
    let lastColor = "";
    const codes = str.match(ansiRE) ?? [];
    for (const code of codes) {
        if (code === `${ESC}[0m`) {
            lastColor = "";
        } else if (ansiColorRE.test(code)) {
            lastColor = code;
        }
    }
    return lastColor;
}
