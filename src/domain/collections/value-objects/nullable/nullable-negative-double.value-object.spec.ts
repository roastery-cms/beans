import { describe, expect, it } from "bun:test";
import { InvalidPropertyException } from "@roastery/terroir/exceptions/domain";
import { NullableNegativeDoubleVO } from "./nullable-negative-double.value-object";

const context = { name: "discount", source: "invoice" };

describe("NullableNegativeDoubleVO", () => {
	it("accepts `null`", () => {
		expect(new NullableNegativeDoubleVO(null, context).value).toBe(null);
	});

	it("accepts a real value", () => {
		expect(new NullableNegativeDoubleVO(-7.5, context).value).toBe(-7.5);
	});

	it("still rounds a real value to two decimal places", () => {
		expect(new NullableNegativeDoubleVO(-7.55678, context).value).toBe(-7.56);
	});

	it("rejects a value outside the schema", () => {
		expect(() => new NullableNegativeDoubleVO(0.5 as never, context)).toThrow(
			InvalidPropertyException,
		);
	});

	it("demos to `null`, not `NegativeDoubleVO`'s `-42.5`", () => {
		expect(NullableNegativeDoubleVO.demo(context).value).toBe(null);
	});
});
