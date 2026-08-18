import { describe, expect, it } from "bun:test";
import { OptionalStringVO } from "./optional-string.value-object";

const context = { name: "subtitle", source: "post" } as const;

describe("OptionalStringVO", () => {
	it("accepts `undefined`", () => {
		expect(new OptionalStringVO(undefined, context).value).toBeUndefined();
	});

	it("accepts an empty string and any other string", () => {
		expect(new OptionalStringVO("", context).value).toBe("");
		expect(new OptionalStringVO("A subtitle", context).value).toBe(
			"A subtitle",
		);
	});

	it('demos to `undefined`, not `StringVO`\'s `"string"`', () => {
		expect(OptionalStringVO.demo(context).value).toBeUndefined();
	});
});
