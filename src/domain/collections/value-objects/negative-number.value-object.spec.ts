import { describe, expect, it } from "bun:test";
import { InvalidPropertyException } from "@roastery/terroir/exceptions/domain";
import { NegativeNumberVO } from "./negative-number.value-object";

const context = { name: "balance", source: "account" };

describe("NegativeNumberVO", () => {
	it("accepts a valid value", () => {
		expect(new NegativeNumberVO(-7, context).value).toBe(-7);
	});

	it("accepts zero", () => {
		expect(new NegativeNumberVO(0, context).value).toBe(0);
	});

	it("rejects a value outside the schema", () => {
		expect(() => new NegativeNumberVO(1 as never, context)).toThrow(
			InvalidPropertyException,
		);
	});

	it("demos to its declared default", () => {
		expect(NegativeNumberVO.demo(context).value).toBe(-42);
	});
});
