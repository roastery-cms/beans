import { InvalidPropertyException } from "@roastery/terroir/exceptions/domain";
import { describe, expect, it } from "bun:test";
import { UrlVO } from "./url.value-object";

const context = { name: "cover", source: "spec" };

describe("UrlVO", () => {
	it("wraps a valid HTTP/HTTPS URL", () => {
		expect(new UrlVO("https://example.com/cover.jpg", context).value).toBe(
			"https://example.com/cover.jpg",
		);
	});

	it("rejects a plain path without protocol", () => {
		expect(() => new UrlVO("/cover.jpg", context)).toThrow(
			InvalidPropertyException,
		);
	});

	it("rejects an empty string", () => {
		expect(() => new UrlVO("", context)).toThrow(InvalidPropertyException);
	});

	it("demo() falls back to a valid example URL", () => {
		expect(UrlVO.demo(context).value).toBe("https://example.com/cover.jpg");
	});
});
