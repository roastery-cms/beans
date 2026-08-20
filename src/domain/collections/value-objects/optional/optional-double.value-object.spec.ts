import { describe, expect, it } from "bun:test";
import { InvalidPropertyException } from "@roastery/terroir/exceptions/domain";
import { OptionalDoubleVO } from "./optional-double.value-object";

const context = { name: "price", source: "product" };

describe("OptionalDoubleVO", () => {
	it("accepts `undefined`", () => {
		expect(new OptionalDoubleVO(undefined, context).value).toBe(undefined);
	});

	it("accepts a real value", () => {
		expect(new OptionalDoubleVO(7.5, context).value).toBe(7.5);
	});

	it("still rounds a real value to two decimal places", () => {
		expect(new OptionalDoubleVO(7.55678, context).value).toBe(7.56);
	});

	it("rejects a value the transform cannot repair", () => {
		expect(() => new OptionalDoubleVO(Number.NaN, context)).toThrow(
			InvalidPropertyException,
		);
	});

	it("demos to `undefined`, not `DoubleVO`'s `42.5`", () => {
		expect(OptionalDoubleVO.demo(context).value).toBe(undefined);
	});
});
