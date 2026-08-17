import { InvalidPropertyException } from "@roastery/terroir/exceptions/domain";
import { describe, expect, it } from "bun:test";
import { OptionalUrlVO } from "./optional-url.value-object";

const context = { name: "cover", source: "post" } as const;

describe("OptionalUrlVO", () => {
	it("accepts `undefined`", () => {
		expect(new OptionalUrlVO(undefined, context).value).toBeUndefined();
	});

	it("accepts a real HTTP(S) URL", () => {
		expect(
			new OptionalUrlVO("https://example.com/cover.jpg", context).value,
		).toBe("https://example.com/cover.jpg");
	});

	it("rejects a non-HTTP(S) URL", () => {
		expect(() => new OptionalUrlVO("redis://localhost:6739", context)).toThrow(
			InvalidPropertyException,
		);
	});

	it("demos to `undefined`, not `UrlVO`'s example", () => {
		expect(OptionalUrlVO.demo(context).value).toBeUndefined();
	});
});
