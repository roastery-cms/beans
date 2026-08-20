import { describe, expect, it } from "bun:test";
import { InvalidPropertyException } from "@roastery/terroir/exceptions/domain";
import { NegativeIntegerVO } from "./negative-integer.value-object";

const context = { name: "adjustment", source: "ledger" };

describe("NegativeIntegerVO", () => {
	it("accepts a valid value", () => {
		expect(new NegativeIntegerVO(-7, context).value).toBe(-7);
	});

	it("accepts zero", () => {
		expect(new NegativeIntegerVO(0, context).value).toBe(0);
	});

	it("truncates a float toward zero before validating", () => {
		expect(new NegativeIntegerVO(-7.9, context).value).toBe(-7);
	});

	it("rejects a value outside the schema", () => {
		expect(() => new NegativeIntegerVO(1 as never, context)).toThrow(
			InvalidPropertyException,
		);
	});

	it("demos to its declared default", () => {
		expect(NegativeIntegerVO.demo(context).value).toBe(-42);
	});
});
