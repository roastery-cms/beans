import { describe, expect, it } from "bun:test";
import { InvalidPropertyException } from "@roastery/terroir/exceptions/domain";
import { DateTimeVO } from "./date-time.value-object";

describe("DateTimeVO", () => {
	it("should create a valid instance", () => {
		const validDate = new Date().toISOString();
		const vo = DateTimeVO.make(validDate, {
			name: "createdAt",
			source: "domain",
		});
		expect(vo.value).toBe(validDate);
	});

	it("should throw InvalidPropertyException when value is not a valid ISO date", () => {
		expect(() =>
			DateTimeVO.make("invalid-date-string", {
				name: "createdAt",
				source: "domain",
			}),
		).toThrow(InvalidPropertyException);
	});

	it("should create an instance with the current date via now()", () => {
		const before = new Date().toISOString();
		const vo = DateTimeVO.now({ name: "createdAt", source: "domain" });
		const after = new Date().toISOString();
		expect(vo.value >= before).toBe(true);
		expect(vo.value <= after).toBe(true);
	});
});
