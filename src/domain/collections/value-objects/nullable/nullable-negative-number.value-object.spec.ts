import { describe, expect, it } from "bun:test";
import { InvalidPropertyException } from "@roastery/terroir/exceptions/domain";
import { NullableNegativeNumberVO } from "./nullable-negative-number.value-object";

const context = { name: "balance", source: "account" };

describe("NullableNegativeNumberVO", () => {
	it("accepts `null`", () => {
		expect(new NullableNegativeNumberVO(null, context).value).toBe(null);
	});

	it("accepts a real value", () => {
		expect(new NullableNegativeNumberVO(-7, context).value).toBe(-7);
	});

	it("rejects a value outside the schema", () => {
		expect(() => new NullableNegativeNumberVO(1 as never, context)).toThrow(
			InvalidPropertyException,
		);
	});

	it("demos to `null`, not `NegativeNumberVO`'s `-42`", () => {
		expect(NullableNegativeNumberVO.demo(context).value).toBe(null);
	});
});
