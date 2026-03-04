import { describe, expect, it } from "bun:test";
import { InvalidPropertyException } from "@roastery/terroir/exceptions/domain";
import { generateUUID } from "@/entity/helpers";
import { UuidVO } from "./uuid.value-object";

describe("UuidVO", () => {
	it("should create a valid instance", () => {
		const uuid = generateUUID();
		const vo = UuidVO.make(uuid, { name: "id", source: "domain" });
		expect(vo.value).toBe(uuid);
	});

	it("should throw InvalidPropertyException when value is not a valid UUID", () => {
		expect(() =>
			UuidVO.make("invalid-uuid", { name: "id", source: "domain" }),
		).toThrow(InvalidPropertyException);
	});

	it("should generate a valid UUID via generate()", () => {
		const vo = UuidVO.generate({ name: "id", source: "domain" });
		expect(typeof vo.value).toBe("string");
		expect(vo.value.length).toBeGreaterThan(0);
	});
});
