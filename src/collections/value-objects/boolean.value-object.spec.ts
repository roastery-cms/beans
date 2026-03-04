import { describe, expect, it } from "bun:test";
import { BooleanVO } from "./boolean.value-object";

describe("BooleanVO", () => {
	const info = { name: "active", source: "domain" };

	it("should create a valid true instance", () => {
		const vo = BooleanVO.make(true, info);
		expect(vo.value).toBe(true);
	});

	it("should create a valid false instance", () => {
		const vo = BooleanVO.make(false, info);
		expect(vo.value).toBe(false);
	});

	it("should create truthy instance with truthy static method", () => {
		const vo = BooleanVO.truthy(info);
		expect(vo.value).toBe(true);
	});

	it("should create falsy instance with falsy static method", () => {
		const vo = BooleanVO.falsy(info);
		expect(vo.value).toBe(false);
	});

	it("should create instance from unknown values using 'from'", () => {
		expect(BooleanVO.from(1, info).value).toBe(true);
		expect(BooleanVO.from("hello", info).value).toBe(true);
		expect(BooleanVO.from(0, info).value).toBe(false);
		expect(BooleanVO.from(null, info).value).toBe(false);
	});
});
