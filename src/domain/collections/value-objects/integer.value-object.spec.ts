import { describe, expect, it } from "bun:test";
import { InvalidPropertyException } from "@roastery/terroir/exceptions/domain";
import { IntegerVO } from "./integer.value-object";

const context = { name: "quantity", source: "order" };

describe("IntegerVO", () => {
	it("accepts a valid value", () => {
		expect(new IntegerVO(7, context).value).toBe(7);
	});

	it("accepts zero", () => {
		expect(new IntegerVO(0, context).value).toBe(0);
	});

	it("truncates a float toward zero before validating", () => {
		expect(new IntegerVO(7.9, context).value).toBe(7);
	});

	it("rejects a value the transform cannot repair", () => {
		expect(() => new IntegerVO(Number.NaN, context)).toThrow(
			InvalidPropertyException,
		);
	});

	it("demos to its declared default", () => {
		expect(IntegerVO.demo(context).value).toBe(42);
	});
});
