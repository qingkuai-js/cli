export function isString(value: any) {
    return typeof value === "string";
}

export function isNumber(value: any) {
    return typeof value === "number";
}

export function isUndefined(value: any) {
    return typeof value === "undefined";
}

export function isQingkuaiFileName(path: string) {
    return path.endsWith(".qk");
}

export function isNull(value: any): value is null {
    return value === null;
}

export function isNonInfiniteNumber(value: any) {
    return isNumber(value) && Number.isFinite(value);
}

export function isArray<T = any>(value: any): value is T[] {
    return Array.isArray(value);
}

export function isThenable(value: any): value is PromiseLike<unknown> {
    return typeof value?.then === "function";
}
