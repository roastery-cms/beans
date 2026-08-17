import { InvalidPropertyException } from "@roastery/terroir/exceptions/domain";
import { describe, expect, it } from "bun:test";
import { NullableSlugVO } from "./nullable-slug.value-object";

const context = { name: "slug", source: "post" } as const;

describe("NullableSlugVO", () => {
	it("accepts `null` untouched by `slugify`", () => {
		expect(new NullableSlugVO(null, context).value).toBeNull();
	});

	it("still slugifies a real value before validating, like `SlugVO`", () => {
		expect(new NullableSlugVO("My Cool Post!", context).value).toBe(
			"my-cool-post",
		);
	});

	it("rejects input whose slugified form is still invalid", () => {
		expect(() => new NullableSlugVO("", context)).toThrow(
			InvalidPropertyException,
		);
	});

	it('demos to `null`, not `SlugVO`\'s canonical `"slug"`', () => {
		expect(NullableSlugVO.demo(context).value).toBeNull();
	});
});
