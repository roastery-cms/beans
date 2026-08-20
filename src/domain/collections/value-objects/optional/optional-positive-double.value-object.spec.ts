import { describe, expect, it } from "bun:test";
import { InvalidPropertyException } from "@roastery/terroir/exceptions/domain";
import { OptionalPositiveDoubleVO } from "./optional-positive-double.value-object";

const context = { name: "price", source: "product" };

describe("OptionalPositiveDoubleVO", () => {
	it("accepts `undefined`", () => {
		expect(new OptionalPositiveDoubleVO(undefined, context).value).toBe(
			undefined,
		);
	});

	it("accepts a real value", () => {
		expect(new OptionalPositiveDoubleVO(7.5, context).value).toBe(7.5);
	});

	it("still rounds a real value to two decimal places", () => {
		expect(new OptionalPositiveDoubleVO(7.55678, context).value).toBe(7.56);
	});

	it("rejects a value outside the schema", () => {
		expect(() => new OptionalPositiveDoubleVO(-0.5 as never, context)).toThrow(
			InvalidPropertyException,
		);
	});

	it("demos to `undefined`, not `PositiveDoubleVO`'s `42.5`", () => {
		expect(OptionalPositiveDoubleVO.demo(context).value).toBe(undefined);
	});
});
