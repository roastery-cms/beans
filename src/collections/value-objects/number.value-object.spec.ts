import { InvalidPropertyException } from "@roastery/terroir/exceptions/domain";
import { describe, expect, it } from "bun:test";
import { NumberVO } from "./number.value-object";

const context = { name: "views", source: "spec" };

describe("NumberVO", () => {
	it("wraps a positive number", () => {
		expect(new NumberVO(7, context).value).toBe(7);
	});

	it("wraps zero", () => {
		expect(new NumberVO(0, context).value).toBe(0);
	});

	it("rejects a negative number", () => {
		expect(() => new NumberVO(-1, context)).toThrow(InvalidPropertyException);
	});

	it("demo() falls back to 42", () => {
		expect(NumberVO.demo(context).value).toBe(42);
	});
});
