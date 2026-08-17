import { describe, expect, it } from "bun:test";
import { OptionalBooleanVO } from "./optional-boolean.value-object";

const context = { name: "featured", source: "post" } as const;

describe("OptionalBooleanVO", () => {
	it("accepts `undefined`", () => {
		expect(new OptionalBooleanVO(undefined, context).value).toBeUndefined();
	});

	it("accepts a real boolean", () => {
		expect(new OptionalBooleanVO(true, context).value).toBe(true);
		expect(new OptionalBooleanVO(false, context).value).toBe(false);
	});

	it("demos to `undefined`, not `BooleanVO`'s `true`", () => {
		expect(OptionalBooleanVO.demo(context).value).toBeUndefined();
	});
});
