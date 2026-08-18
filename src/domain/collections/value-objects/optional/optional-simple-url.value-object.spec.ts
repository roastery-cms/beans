import { describe, expect, it } from "bun:test";
import { OptionalSimpleUrlVO } from "./optional-simple-url.value-object";

const context = { name: "cacheUrl", source: "config" } as const;

describe("OptionalSimpleUrlVO", () => {
	it("accepts `undefined`", () => {
		expect(new OptionalSimpleUrlVO(undefined, context).value).toBeUndefined();
	});

	it("accepts a real any-protocol URI", () => {
		expect(
			new OptionalSimpleUrlVO("redis://localhost:6739", context).value,
		).toBe("redis://localhost:6739");
	});

	it("demos to `undefined`, not `SimpleUrlVO`'s example", () => {
		expect(OptionalSimpleUrlVO.demo(context).value).toBeUndefined();
	});
});
