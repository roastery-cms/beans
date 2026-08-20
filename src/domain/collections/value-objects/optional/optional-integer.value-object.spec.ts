import { describe, expect, it } from "bun:test";
import { InvalidPropertyException } from "@roastery/terroir/exceptions/domain";
import { OptionalIntegerVO } from "./optional-integer.value-object";

const context = { name: "quantity", source: "order" };

describe("OptionalIntegerVO", () => {
	it("accepts `undefined`", () => {
		expect(new OptionalIntegerVO(undefined, context).value).toBe(undefined);
	});

	it("accepts a real value", () => {
		expect(new OptionalIntegerVO(7, context).value).toBe(7);
	});

	it("still truncates a real value", () => {
		expect(new OptionalIntegerVO(7.9, context).value).toBe(7);
	});

	it("rejects a value the transform cannot repair", () => {
		expect(() => new OptionalIntegerVO(Number.NaN, context)).toThrow(
			InvalidPropertyException,
		);
	});

	it("demos to `undefined`, not `IntegerVO`'s `42`", () => {
		expect(OptionalIntegerVO.demo(context).value).toBe(undefined);
	});
});
