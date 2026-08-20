import { describe, expect, it } from "bun:test";
import { InvalidPropertyException } from "@roastery/terroir/exceptions/domain";
import { OptionalNegativeNumberVO } from "./optional-negative-number.value-object";

const context = { name: "balance", source: "account" };

describe("OptionalNegativeNumberVO", () => {
	it("accepts `undefined`", () => {
		expect(new OptionalNegativeNumberVO(undefined, context).value).toBe(
			undefined,
		);
	});

	it("accepts a real value", () => {
		expect(new OptionalNegativeNumberVO(-7, context).value).toBe(-7);
	});

	it("rejects a value outside the schema", () => {
		expect(() => new OptionalNegativeNumberVO(1 as never, context)).toThrow(
			InvalidPropertyException,
		);
	});

	it("demos to `undefined`, not `NegativeNumberVO`'s `-42`", () => {
		expect(OptionalNegativeNumberVO.demo(context).value).toBe(undefined);
	});
});
