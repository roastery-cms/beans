import { describe, expect, it } from "bun:test";
import { InvalidPropertyException } from "@roastery/terroir/exceptions/domain";
import { OptionalPositiveNumberVO } from "./optional-positive-number.value-object";

const context = { name: "views", source: "post" };

describe("OptionalPositiveNumberVO", () => {
	it("accepts `undefined`", () => {
		expect(new OptionalPositiveNumberVO(undefined, context).value).toBe(
			undefined,
		);
	});

	it("accepts a real value", () => {
		expect(new OptionalPositiveNumberVO(7, context).value).toBe(7);
	});

	it("rejects a value outside the schema", () => {
		expect(() => new OptionalPositiveNumberVO(-1 as never, context)).toThrow(
			InvalidPropertyException,
		);
	});

	it("demos to `undefined`, not `PositiveNumberVO`'s `42`", () => {
		expect(OptionalPositiveNumberVO.demo(context).value).toBe(undefined);
	});
});
