import { InvalidPropertyException } from "@roastery/terroir/exceptions/domain";
import { describe, expect, it } from "bun:test";
import { OptionalNumberVO } from "./optional-number.value-object";

const context = { name: "views", source: "post" } as const;

describe("OptionalNumberVO", () => {
	it("accepts `undefined`", () => {
		expect(new OptionalNumberVO(undefined, context).value).toBeUndefined();
	});

	it("accepts a real non-negative number", () => {
		expect(new OptionalNumberVO(7, context).value).toBe(7);
	});

	it("rejects a negative number", () => {
		expect(() => new OptionalNumberVO(-1, context)).toThrow(
			InvalidPropertyException,
		);
	});

	it("demos to `undefined`, not `NumberVO`'s `42`", () => {
		expect(OptionalNumberVO.demo(context).value).toBeUndefined();
	});
});
