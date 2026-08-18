import { InvalidPropertyException } from "@roastery/terroir/exceptions/domain";
import { describe, expect, it } from "bun:test";
import { NullableUrlVO } from "./nullable-url.value-object";

const context = { name: "cover", source: "post" } as const;

describe("NullableUrlVO", () => {
	it("accepts `null`", () => {
		expect(new NullableUrlVO(null, context).value).toBeNull();
	});

	it("accepts a real HTTP(S) URL", () => {
		expect(
			new NullableUrlVO("https://example.com/cover.jpg", context).value,
		).toBe("https://example.com/cover.jpg");
	});

	it("rejects a non-HTTP(S) URL", () => {
		expect(() => new NullableUrlVO("redis://localhost:6739", context)).toThrow(
			InvalidPropertyException,
		);
	});

	it("demos to `null`, not `UrlVO`'s example", () => {
		expect(NullableUrlVO.demo(context).value).toBeNull();
	});
});
