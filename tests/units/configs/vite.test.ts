import { describe, expect, it } from "vitest";

import { withBuiltinQingkuaiPlugin } from "../../../src/configs/vite";

const BUILTIN_NAME = "qingkuai-compiler";
const fake = (name: string) => ({ name });

async function reveal(value: unknown): Promise<unknown[]> {
    if (value && typeof (value as PromiseLike<unknown>).then === "function") {
        return reveal(await (value as PromiseLike<unknown>));
    }
    if (Array.isArray(value)) {
        const inner = await Promise.all(value.map(reveal));
        return inner.flat(Infinity).filter(item => item);
    }
    return value ? [value] : [];
}

async function finalNames(plugins: unknown) {
    const result = withBuiltinQingkuaiPlugin({ plugins } as never);
    return (await reveal(result)).map(item => (item as { name: string }).name);
}

describe("withBuiltinQingkuaiPlugin", () => {
    it("removes same-named plugins across every official PluginOption form", async () => {
        const names = await finalNames([
            fake("user-a"),
            fake(BUILTIN_NAME),
            [fake("lv1-a"), [fake(BUILTIN_NAME)]],
            [[[fake(BUILTIN_NAME)]]],
            Promise.resolve(fake(BUILTIN_NAME)),
            Promise.resolve([fake("deep-a"), fake(BUILTIN_NAME)]),
            {
                then(resolve: (value: unknown) => void) {
                    resolve(fake(BUILTIN_NAME));
                },
            },
            false,
            null,
        ]);

        expect(names).toEqual(["user-a", "lv1-a", "deep-a", BUILTIN_NAME]);
    });

    it("keeps regular plugins inside promises and nested arrays intact", async () => {
        const names = await finalNames([
            Promise.resolve(fake("from-promise")),
            [[fake("from-nested")]],
        ]);
        expect(names).toEqual(["from-promise", "from-nested", BUILTIN_NAME]);
    });

    it("yields only the builtin plugin when plugins are absent or undefined", async () => {
        expect(await finalNames(undefined)).toEqual([BUILTIN_NAME]);
        expect(await finalNames([])).toEqual([BUILTIN_NAME]);
    });

    it("appends exactly one builtin plugin at the end", async () => {
        const names = await finalNames([fake("a"), fake("b")]);
        expect(names.filter(name => name === BUILTIN_NAME)).toHaveLength(1);
        expect(names[names.length - 1]).toBe(BUILTIN_NAME);
    });
});
