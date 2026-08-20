import { describe, expect, it } from "bun:test";
import { InvalidPropertyException } from "@roastery/terroir/exceptions/domain";
import { PositiveNumberVO } from "./positive-number.value-object";

const context = { name: "views", source: "post" };

describe("PositiveNumberVO", () => {
	it("accepts a valid value", () => {
		expect(new PositiveNumberVO(7, context).value).toBe(7);
	});

	it("accepts zero", () => {
		expect(new PositiveNumberVO(0, context).value).toBe(0);
	});

	it("rejects a value outside the schema", () => {
		expect(() => new PositiveNumberVO(-1 as never, context)).toThrow(
			InvalidPropertyException,
		);
	});

	it("demos to its declared default", () => {
		expect(PositiveNumberVO.demo(context).value).toBe(42);
	});
});
