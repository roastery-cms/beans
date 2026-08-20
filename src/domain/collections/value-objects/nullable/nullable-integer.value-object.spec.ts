import { describe, expect, it } from "bun:test";
import { InvalidPropertyException } from "@roastery/terroir/exceptions/domain";
import { NullableIntegerVO } from "./nullable-integer.value-object";

const context = { name: "quantity", source: "order" };

describe("NullableIntegerVO", () => {
	it("accepts `null`", () => {
		expect(new NullableIntegerVO(null, context).value).toBe(null);
	});

	it("accepts a real value", () => {
		expect(new NullableIntegerVO(7, context).value).toBe(7);
	});

	it("still truncates a real value", () => {
		expect(new NullableIntegerVO(7.9, context).value).toBe(7);
	});

	it("rejects a value the transform cannot repair", () => {
		expect(() => new NullableIntegerVO(Number.NaN, context)).toThrow(
			InvalidPropertyException,
		);
	});

	it("demos to `null`, not `IntegerVO`'s `42`", () => {
		expect(NullableIntegerVO.demo(context).value).toBe(null);
	});
});
