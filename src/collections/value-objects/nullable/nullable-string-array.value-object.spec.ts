import { describe, expect, it } from "bun:test";
import { NullableStringArrayVO } from "./nullable-string-array.value-object";

const context = { name: "tags", source: "post" } as const;

describe("NullableStringArrayVO", () => {
	it("accepts `null`", () => {
		expect(new NullableStringArrayVO(null, context).value).toBeNull();
	});

	it("accepts an empty array and a real array", () => {
		expect(new NullableStringArrayVO([], context).value).toEqual([]);
		expect(new NullableStringArrayVO(["ts", "ddd"], context).value).toEqual([
			"ts",
			"ddd",
		]);
	});

	it("demos to `null`, not `StringArrayVO`'s `[]`", () => {
		expect(NullableStringArrayVO.demo(context).value).toBeNull();
	});
});
