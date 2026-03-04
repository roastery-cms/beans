import { describe, expect, it } from "bun:test";
import { InvalidPropertyException } from "@roastery/terroir/exceptions/domain";
import { DefinedStringVO } from "./defined-string.value-object";

describe("DefinedStringVO", () => {
	it("should create a valid instance", () => {
		const vo = DefinedStringVO.make("test", {
			name: "test",
			source: "domain",
		});
		expect(vo.value).toBe("test");
	});

	it("should throw InvalidPropertyException when value is empty", () => {
		expect(() =>
			DefinedStringVO.make("", { name: "test", source: "domain" }),
		).toThrow(InvalidPropertyException);
	});
});
