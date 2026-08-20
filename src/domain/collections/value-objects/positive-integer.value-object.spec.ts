import { describe, expect, it } from "bun:test";
import { InvalidPropertyException } from "@roastery/terroir/exceptions/domain";
import { PositiveIntegerVO } from "./positive-integer.value-object";

const context = { name: "quantity", source: "order" };

describe("PositiveIntegerVO", () => {
	it("accepts a valid value", () => {
		expect(new PositiveIntegerVO(7, context).value).toBe(7);
	});

	it("accepts zero", () => {
		expect(new PositiveIntegerVO(0, context).value).toBe(0);
	});

	it("truncates a float toward zero before validating", () => {
		expect(new PositiveIntegerVO(7.9, context).value).toBe(7);
	});

	it("rejects a value outside the schema", () => {
		expect(() => new PositiveIntegerVO(-1 as never, context)).toThrow(
			InvalidPropertyException,
		);
	});

	it("demos to its declared default", () => {
		expect(PositiveIntegerVO.demo(context).value).toBe(42);
	});
});
