import { InvalidPropertyException } from "@roastery/terroir/exceptions/domain";
import { describe, expect, it } from "bun:test";
import { StringArrayVO } from "./string-array.value-object";

const context = { name: "tags", source: "spec" };

describe("StringArrayVO", () => {
	it("wraps an array of strings", () => {
		expect(new StringArrayVO(["ts", "ddd"], context).value).toEqual([
			"ts",
			"ddd",
		]);
	});

	it("accepts an empty array", () => {
		expect(new StringArrayVO([], context).value).toEqual([]);
	});

	it("rejects a non-string element", () => {
		expect(
			() => new StringArrayVO([1] as unknown as string[], context),
		).toThrow(InvalidPropertyException);
	});

	it("demo() falls back to an empty array", () => {
		expect(StringArrayVO.demo(context).value).toEqual([]);
	});
});
