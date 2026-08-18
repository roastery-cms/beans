import { InvalidPropertyException } from "@roastery/terroir/exceptions/domain";
import { describe, expect, it } from "bun:test";
import { SimpleUrlVO } from "./simple-url.value-object";

const context = { name: "cacheUrl", source: "spec" };

describe("SimpleUrlVO", () => {
	it("wraps a URI of any protocol", () => {
		expect(new SimpleUrlVO("redis://localhost:6739", context).value).toBe(
			"redis://localhost:6739",
		);
	});

	it("wraps an HTTP URL too", () => {
		expect(new SimpleUrlVO("https://example.com", context).value).toBe(
			"https://example.com",
		);
	});

	it("rejects a plain path without protocol", () => {
		expect(() => new SimpleUrlVO("/some/path", context)).toThrow(
			InvalidPropertyException,
		);
	});

	it("demo() falls back to a valid example URI", () => {
		expect(SimpleUrlVO.demo(context).value).toBe("redis://localhost:6739");
	});
});
