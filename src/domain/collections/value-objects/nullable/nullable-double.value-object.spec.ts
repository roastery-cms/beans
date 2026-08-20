import { describe, expect, it } from "bun:test";
import { InvalidPropertyException } from "@roastery/terroir/exceptions/domain";
import { NullableDoubleVO } from "./nullable-double.value-object";

const context = { name: "price", source: "product" };

describe("NullableDoubleVO", () => {
	it("accepts `null`", () => {
		expect(new NullableDoubleVO(null, context).value).toBe(null);
	});

	it("accepts a real value", () => {
		expect(new NullableDoubleVO(7.5, context).value).toBe(7.5);
	});

	it("still rounds a real value to two decimal places", () => {
		expect(new NullableDoubleVO(7.55678, context).value).toBe(7.56);
	});

	it("rejects a value the transform cannot repair", () => {
		expect(() => new NullableDoubleVO(Number.NaN, context)).toThrow(
			InvalidPropertyException,
		);
	});

	it("demos to `null`, not `DoubleVO`'s `42.5`", () => {
		expect(NullableDoubleVO.demo(context).value).toBe(null);
	});
});
