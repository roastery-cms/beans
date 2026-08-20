import { describe, expect, it } from "bun:test";
import { InvalidPropertyException } from "@roastery/terroir/exceptions/domain";
import { OptionalPositiveIntegerVO } from "./optional-positive-integer.value-object";

const context = { name: "quantity", source: "order" };

describe("OptionalPositiveIntegerVO", () => {
	it("accepts `undefined`", () => {
		expect(new OptionalPositiveIntegerVO(undefined, context).value).toBe(
			undefined,
		);
	});

	it("accepts a real value", () => {
		expect(new OptionalPositiveIntegerVO(7, context).value).toBe(7);
	});

	it("still truncates a real value", () => {
		expect(new OptionalPositiveIntegerVO(7.9, context).value).toBe(7);
	});

	it("rejects a value outside the schema", () => {
		expect(() => new OptionalPositiveIntegerVO(-1 as never, context)).toThrow(
			InvalidPropertyException,
		);
	});

	it("demos to `undefined`, not `PositiveIntegerVO`'s `42`", () => {
		expect(OptionalPositiveIntegerVO.demo(context).value).toBe(undefined);
	});
});
