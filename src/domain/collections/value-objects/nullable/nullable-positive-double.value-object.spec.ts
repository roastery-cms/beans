import { describe, expect, it } from "bun:test";
import { InvalidPropertyException } from "@roastery/terroir/exceptions/domain";
import { NullablePositiveDoubleVO } from "./nullable-positive-double.value-object";

const context = { name: "price", source: "product" };

describe("NullablePositiveDoubleVO", () => {
	it("accepts `null`", () => {
		expect(new NullablePositiveDoubleVO(null, context).value).toBe(null);
	});

	it("accepts a real value", () => {
		expect(new NullablePositiveDoubleVO(7.5, context).value).toBe(7.5);
	});

	it("still rounds a real value to two decimal places", () => {
		expect(new NullablePositiveDoubleVO(7.55678, context).value).toBe(7.56);
	});

	it("rejects a value outside the schema", () => {
		expect(() => new NullablePositiveDoubleVO(-0.5 as never, context)).toThrow(
			InvalidPropertyException,
		);
	});

	it("demos to `null`, not `PositiveDoubleVO`'s `42.5`", () => {
		expect(NullablePositiveDoubleVO.demo(context).value).toBe(null);
	});
});
