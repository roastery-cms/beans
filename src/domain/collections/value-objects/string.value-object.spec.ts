import { InvalidPropertyException } from "@roastery/terroir/exceptions/domain";
import { describe, expect, it } from "bun:test";
import { StringVO } from "./string.value-object";

const context = { name: "name", source: "spec" };

describe("StringVO", () => {
	it("wraps the string it was given", () => {
		expect(new StringVO("alan", context).value).toBe("alan");
	});

	it("accepts an empty string — the schema constrains no length", () => {
		expect(new StringVO("", context).value).toBe("");
	});

	it("rejects a value that is not a string", () => {
		expect(() => new StringVO(42 as unknown as string, context)).toThrow(
			InvalidPropertyException,
		);
	});

	it('demo() falls back to "string"', () => {
		expect(StringVO.demo(context).value).toBe("string");
	});
});
