import { describe, expect, it } from "bun:test";
import { InvalidPropertyException } from "@roastery/terroir/exceptions/domain";
import { OptionalNegativeDoubleVO } from "./optional-negative-double.value-object";

const context = { name: "discount", source: "invoice" };

describe("OptionalNegativeDoubleVO", () => {
	it("accepts `undefined`", () => {
		expect(new OptionalNegativeDoubleVO(undefined, context).value).toBe(
			undefined,
		);
	});

	it("accepts a real value", () => {
		expect(new OptionalNegativeDoubleVO(-7.5, context).value).toBe(-7.5);
	});

	it("still rounds a real value to two decimal places", () => {
		expect(new OptionalNegativeDoubleVO(-7.55678, context).value).toBe(-7.56);
	});

	it("rejects a value outside the schema", () => {
		expect(() => new OptionalNegativeDoubleVO(0.5 as never, context)).toThrow(
			InvalidPropertyException,
		);
	});

	it("demos to `undefined`, not `NegativeDoubleVO`'s `-42.5`", () => {
		expect(OptionalNegativeDoubleVO.demo(context).value).toBe(undefined);
	});
});
