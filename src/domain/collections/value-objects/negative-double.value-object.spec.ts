import { describe, expect, it } from "bun:test";
import { InvalidPropertyException } from "@roastery/terroir/exceptions/domain";
import { NegativeDoubleVO } from "./negative-double.value-object";

const context = { name: "discount", source: "invoice" };

describe("NegativeDoubleVO", () => {
	it("accepts a valid value", () => {
		expect(new NegativeDoubleVO(-7.5, context).value).toBe(-7.5);
	});

	it("accepts zero", () => {
		expect(new NegativeDoubleVO(0, context).value).toBe(0);
	});

	it("rounds to two decimal places before validating", () => {
		expect(new NegativeDoubleVO(-7.55678, context).value).toBe(-7.56);
	});

	it("rejects a value outside the schema", () => {
		expect(() => new NegativeDoubleVO(0.5 as never, context)).toThrow(
			InvalidPropertyException,
		);
	});

	it("demos to its declared default", () => {
		expect(NegativeDoubleVO.demo(context).value).toBe(-42.5);
	});
});
