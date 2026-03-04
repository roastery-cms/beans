import { describe, expect, it } from "bun:test";
import { InvalidPropertyException } from "@roastery/terroir/exceptions/domain";
import { UrlVO } from "./url.value-object";

describe("UrlVO", () => {
	it("should create a valid instance", () => {
		const vo = UrlVO.make("http://example.com/cover.jpg", {
			name: "cover",
			source: "domain",
		});
		expect(vo.value).toBe("http://example.com/cover.jpg");
	});

	it("should throw InvalidPropertyException when value is not a valid URL", () => {
		expect(() =>
			UrlVO.make("invalid-url", { name: "cover", source: "domain" }),
		).toThrow(InvalidPropertyException);
	});
});
