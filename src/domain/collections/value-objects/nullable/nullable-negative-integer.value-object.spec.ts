import { describe, expect, it } from "bun:test";
import { InvalidPropertyException } from "@roastery/terroir/exceptions/domain";
import { NullableNegativeIntegerVO } from "./nullable-negative-integer.value-object";

const context = { name: "adjustment", source: "ledger" };

describe("NullableNegativeIntegerVO", () => {
	it("accepts `null`", () => {
		expect(new NullableNegativeIntegerVO(null, context).value).toBe(null);
	});

	it("accepts a real value", () => {
		expect(new NullableNegativeIntegerVO(-7, context).value).toBe(-7);
	});

	it("still truncates a real value", () => {
		expect(new NullableNegativeIntegerVO(-7.9, context).value).toBe(-7);
	});

	it("rejects a value outside the schema", () => {
		expect(() => new NullableNegativeIntegerVO(1 as never, context)).toThrow(
			InvalidPropertyException,
		);
	});

	it("demos to `null`, not `NegativeIntegerVO`'s `-42`", () => {
		expect(NullableNegativeIntegerVO.demo(context).value).toBe(null);
	});
});
