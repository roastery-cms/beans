import { InvalidPropertyException } from "@roastery/terroir/exceptions/domain";
import { describe, expect, it } from "bun:test";
import { BooleanVO } from "./boolean.value-object";

const context = { name: "published", source: "spec" };

describe("BooleanVO", () => {
	it("wraps true", () => {
		expect(new BooleanVO(true, context).value).toBe(true);
	});

	it("wraps false", () => {
		expect(new BooleanVO(false, context).value).toBe(false);
	});

	it("rejects a non-boolean value", () => {
		expect(() => new BooleanVO("yes" as unknown as boolean, context)).toThrow(
			InvalidPropertyException,
		);
	});

	it("demo() falls back to true", () => {
		expect(BooleanVO.demo(context).value).toBe(true);
	});

	it("truthy() wraps true and falsy() wraps false", () => {
		expect(BooleanVO.truthy(context).value).toBe(true);
		expect(BooleanVO.falsy(context).value).toBe(false);
	});

	it("from() coerces any value with !!", () => {
		expect(BooleanVO.from("yes", context).value).toBe(true);
		expect(BooleanVO.from(1, context).value).toBe(true);
		expect(BooleanVO.from({}, context).value).toBe(true);
		expect(BooleanVO.from(0, context).value).toBe(false);
		expect(BooleanVO.from("", context).value).toBe(false);
		expect(BooleanVO.from(null, context).value).toBe(false);
		expect(BooleanVO.from(undefined, context).value).toBe(false);
	});
});
