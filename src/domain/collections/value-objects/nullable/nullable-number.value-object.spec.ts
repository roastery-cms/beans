import { InvalidPropertyException } from "@roastery/terroir/exceptions/domain";
import { describe, expect, it } from "bun:test";
import { NullableNumberVO } from "./nullable-number.value-object";

const context = { name: "views", source: "post" } as const;

describe("NullableNumberVO", () => {
	it("accepts `null`", () => {
		expect(new NullableNumberVO(null, context).value).toBeNull();
	});

	it("accepts a real number", () => {
		expect(new NullableNumberVO(7, context).value).toBe(7);
	});

	it("accepts a negative number", () => {
		expect(new NullableNumberVO(-1, context).value).toBe(-1);
	});

	it("rejects a non-number", () => {
		expect(() => new NullableNumberVO("7" as never, context)).toThrow(
			InvalidPropertyException,
		);
	});

	it("demos to `null`, not `NumberVO`'s `42`", () => {
		expect(NullableNumberVO.demo(context).value).toBeNull();
	});
});
