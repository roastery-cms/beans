import { describe, expect, it } from "bun:test";
import { InvalidPropertyException } from "@roastery/terroir/exceptions/domain";
import { SlugVO } from "./slug.value-object";

describe("SlugVO", () => {
	it("should create a valid slug from a string", () => {
		const slug = SlugVO.make("My Title", {
			name: "slug",
			source: "domain",
		});
		expect(slug.value).toBe("my-title");
	});

	it("should keep an already valid slug", () => {
		const slug = SlugVO.make("my-title", {
			name: "slug",
			source: "domain",
		});
		expect(slug.value).toBe("my-title");
	});

	it("should throw InvalidPropertyException for invalid value", () => {
		expect(() => SlugVO.make("", { name: "slug", source: "domain" })).toThrow(
			InvalidPropertyException,
		);
	});
});
