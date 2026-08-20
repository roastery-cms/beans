import { describe, expect, it } from "bun:test";
import { InvalidPropertyException } from "@roastery/terroir/exceptions/domain";
import { NullablePositiveNumberVO } from "./nullable-positive-number.value-object";

const context = { name: "views", source: "post" };

describe("NullablePositiveNumberVO", () => {
	it("accepts `null`", () => {
		expect(new NullablePositiveNumberVO(null, context).value).toBe(null);
	});

	it("accepts a real value", () => {
		expect(new NullablePositiveNumberVO(7, context).value).toBe(7);
	});

	it("rejects a value outside the schema", () => {
		expect(() => new NullablePositiveNumberVO(-1 as never, context)).toThrow(
			InvalidPropertyException,
		);
	});

	it("demos to `null`, not `PositiveNumberVO`'s `42`", () => {
		expect(NullablePositiveNumberVO.demo(context).value).toBe(null);
	});
});
