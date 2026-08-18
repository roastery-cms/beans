import { describe, expect, it } from "bun:test";
import { NullableBooleanVO } from "./nullable-boolean.value-object";

const context = { name: "featured", source: "post" } as const;

describe("NullableBooleanVO", () => {
	it("accepts `null`", () => {
		expect(new NullableBooleanVO(null, context).value).toBeNull();
	});

	it("accepts a real boolean", () => {
		expect(new NullableBooleanVO(true, context).value).toBe(true);
		expect(new NullableBooleanVO(false, context).value).toBe(false);
	});

	it("demos to `null`, not `BooleanVO`'s `true`", () => {
		expect(NullableBooleanVO.demo(context).value).toBeNull();
	});
});
