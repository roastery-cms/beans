import { InvalidPropertyException } from "@roastery/terroir/exceptions/domain";
import { describe, expect, it } from "bun:test";
import { SlugVO } from "./slug.value-object";

const context = { name: "slug", source: "spec" };

describe("SlugVO", () => {
	it("slugifies free-form input before validating", () => {
		expect(new SlugVO("My Cool Post!", context).value).toBe("my-cool-post");
	});

	it("keeps an already-valid slug untouched", () => {
		expect(new SlugVO("my-cool-post", context).value).toBe("my-cool-post");
	});

	it("rejects input whose slugified form is still invalid", () => {
		expect(() => new SlugVO("", context)).toThrow(InvalidPropertyException);
	});

	it('demo() falls back to the canonical "slug"', () => {
		expect(SlugVO.demo(context).value).toBe("slug");
	});
});
