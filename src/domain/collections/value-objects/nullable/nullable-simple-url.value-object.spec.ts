import { describe, expect, it } from "bun:test";
import { NullableSimpleUrlVO } from "./nullable-simple-url.value-object";

const context = { name: "cacheUrl", source: "config" } as const;

describe("NullableSimpleUrlVO", () => {
	it("accepts `null`", () => {
		expect(new NullableSimpleUrlVO(null, context).value).toBeNull();
	});

	it("accepts a real any-protocol URI", () => {
		expect(
			new NullableSimpleUrlVO("redis://localhost:6739", context).value,
		).toBe("redis://localhost:6739");
	});

	it("demos to `null`, not `SimpleUrlVO`'s example", () => {
		expect(NullableSimpleUrlVO.demo(context).value).toBeNull();
	});
});
