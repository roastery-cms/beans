import { describe, expect, it } from "bun:test";
import { InvalidPropertyException } from "@roastery/terroir/exceptions/domain";
import { DoubleVO } from "./double.value-object";

const context = { name: "price", source: "product" };

describe("DoubleVO", () => {
	it("accepts a valid value", () => {
		expect(new DoubleVO(7.5, context).value).toBe(7.5);
	});

	it("accepts zero", () => {
		expect(new DoubleVO(0, context).value).toBe(0);
	});

	it("rounds to two decimal places before validating", () => {
		expect(new DoubleVO(7.55678, context).value).toBe(7.56);
	});

	it("rejects a value the transform cannot repair", () => {
		expect(() => new DoubleVO(Number.NaN, context)).toThrow(
			InvalidPropertyException,
		);
	});

	it("demos to its declared default", () => {
		expect(DoubleVO.demo(context).value).toBe(42.5);
	});
});
