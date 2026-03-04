import { describe, expect, it } from "bun:test";
import { slugify } from "./slugify";

describe("slugify", () => {
	it("should convert a simple string to a slug", () => {
		expect(slugify("Hello World")).toBe("hello-world");
	});

	it("should convert uppercase letters to lowercase", () => {
		expect(slugify("HELLO WORLD")).toBe("hello-world");
	});

	it("should remove accented characters", () => {
		expect(slugify("Café com Leite")).toBe("cafe-com-leite");
	});

	it("should trim leading and trailing whitespace", () => {
		expect(slugify("  hello world  ")).toBe("hello-world");
	});

	it("should remove special characters in strict mode", () => {
		expect(slugify("Hello! @World#")).toBe("hello-world");
	});

	it("should return the same value for an already slugified string", () => {
		expect(slugify("hello-world")).toBe("hello-world");
	});

	it("should return an empty string for an empty input", () => {
		expect(slugify("")).toBe("");
	});
});
