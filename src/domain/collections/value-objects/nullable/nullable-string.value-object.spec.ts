import { describe, expect, it } from "bun:test";
import { NullableStringVO } from "./nullable-string.value-object";

const context = { name: "subtitle", source: "post" } as const;

describe("NullableStringVO", () => {
	it("accepts `null`", () => {
		expect(new NullableStringVO(null, context).value).toBeNull();
	});

	it("accepts an empty string and any other string", () => {
		expect(new NullableStringVO("", context).value).toBe("");
		expect(new NullableStringVO("A subtitle", context).value).toBe(
			"A subtitle",
		);
	});

	it('demos to `null`, not `StringVO`\'s `"string"`', () => {
		expect(NullableStringVO.demo(context).value).toBeNull();
	});
});
