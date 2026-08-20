import { describe, expect, it } from "bun:test";
import { InvalidPropertyException } from "@roastery/terroir/exceptions/domain";
import { OptionalNegativeIntegerVO } from "./optional-negative-integer.value-object";

const context = { name: "adjustment", source: "ledger" };

describe("OptionalNegativeIntegerVO", () => {
	it("accepts `undefined`", () => {
		expect(new OptionalNegativeIntegerVO(undefined, context).value).toBe(
			undefined,
		);
	});

	it("accepts a real value", () => {
		expect(new OptionalNegativeIntegerVO(-7, context).value).toBe(-7);
	});

	it("still truncates a real value", () => {
		expect(new OptionalNegativeIntegerVO(-7.9, context).value).toBe(-7);
	});

	it("rejects a value outside the schema", () => {
		expect(() => new OptionalNegativeIntegerVO(1 as never, context)).toThrow(
			InvalidPropertyException,
		);
	});

	it("demos to `undefined`, not `NegativeIntegerVO`'s `-42`", () => {
		expect(OptionalNegativeIntegerVO.demo(context).value).toBe(undefined);
	});
});
