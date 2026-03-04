import { describe, expect, it } from "bun:test";
import { InvalidPropertyException } from "@roastery/terroir/exceptions/domain";
import { generateUUID } from "@/entity/helpers";
import { UuidArrayVO } from "./uuid-array.value-object";

describe("UuidArrayVO", () => {
	it("should create a valid instance with one UUID", () => {
		const uuid = generateUUID();
		const vo = UuidArrayVO.make([uuid], {
			name: "uuids",
			source: "domain",
		});
		expect(vo.value).toEqual([uuid]);
	});

	it("should create a valid instance with multiple UUIDs", () => {
		const uuid1 = generateUUID();
		const uuid2 = generateUUID();
		const vo = UuidArrayVO.make([uuid1, uuid2], {
			name: "uuids",
			source: "domain",
		});
		expect(vo.value).toEqual([uuid1, uuid2]);
	});

	it("should allow empty array if schema permits (assuming minItems default is 0)", () => {
		const vo = UuidArrayVO.make([], {
			name: "uuids",
			source: "domain",
		});
		expect(vo.value).toEqual([]);
	});

	it("should throw InvalidPropertyException when array contains invalid UUID", () => {
		expect(() =>
			UuidArrayVO.make(["invalid-uuid"], { name: "uuids", source: "domain" }),
		).toThrow(InvalidPropertyException);
	});
});
