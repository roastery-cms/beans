import { describe, expect, it } from "bun:test";
import { OptionalStringArrayVO } from "./optional-string-array.value-object";

const context = { name: "tags", source: "post" } as const;

describe("OptionalStringArrayVO", () => {
	it("accepts `undefined`", () => {
		expect(new OptionalStringArrayVO(undefined, context).value).toBeUndefined();
	});

	it("accepts an empty array and a real array", () => {
		expect(new OptionalStringArrayVO([], context).value).toEqual([]);
		expect(new OptionalStringArrayVO(["ts", "ddd"], context).value).toEqual([
			"ts",
			"ddd",
		]);
	});

	it("demos to `undefined`, not `StringArrayVO`'s `[]`", () => {
		expect(OptionalStringArrayVO.demo(context).value).toBeUndefined();
	});
});
