import { InvalidPropertyException } from "@roastery/terroir/exceptions/domain";
import { describe, expect, it } from "bun:test";
import { OptionalSlugVO } from "./optional-slug.value-object";

const context = { name: "slug", source: "post" } as const;

describe("OptionalSlugVO", () => {
	it("accepts `undefined` untouched by `slugify`", () => {
		expect(new OptionalSlugVO(undefined, context).value).toBeUndefined();
	});

	it("still slugifies a real value before validating, like `SlugVO`", () => {
		expect(new OptionalSlugVO("My Cool Post!", context).value).toBe(
			"my-cool-post",
		);
	});

	it("rejects input whose slugified form is still invalid", () => {
		expect(() => new OptionalSlugVO("", context)).toThrow(
			InvalidPropertyException,
		);
	});

	it('demos to `undefined`, not `SlugVO`\'s canonical `"slug"`', () => {
		expect(OptionalSlugVO.demo(context).value).toBeUndefined();
	});
});
