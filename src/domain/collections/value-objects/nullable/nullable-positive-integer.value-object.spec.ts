import { describe, expect, it } from "bun:test";
import { InvalidPropertyException } from "@roastery/terroir/exceptions/domain";
import { NullablePositiveIntegerVO } from "./nullable-positive-integer.value-object";

const context = { name: "quantity", source: "order" };

describe("NullablePositiveIntegerVO", () => {
	it("accepts `null`", () => {
		expect(new NullablePositiveIntegerVO(null, context).value).toBe(null);
	});

	it("accepts a real value", () => {
		expect(new NullablePositiveIntegerVO(7, context).value).toBe(7);
	});

	it("still truncates a real value", () => {
		expect(new NullablePositiveIntegerVO(7.9, context).value).toBe(7);
	});

	it("rejects a value outside the schema", () => {
		expect(() => new NullablePositiveIntegerVO(-1 as never, context)).toThrow(
			InvalidPropertyException,
		);
	});

	it("demos to `null`, not `PositiveIntegerVO`'s `42`", () => {
		expect(NullablePositiveIntegerVO.demo(context).value).toBe(null);
	});
});
