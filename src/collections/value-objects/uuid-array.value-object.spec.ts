import { generateUUID } from "@/entity/helpers";
import { InvalidPropertyException } from "@roastery/terroir/exceptions/domain";
import { describe, expect, it } from "bun:test";
import { UuidArrayVO } from "./uuid-array.value-object";

const context = { name: "authorIds", source: "spec" };

describe("UuidArrayVO", () => {
	it("wraps a single-UUID array", () => {
		const id = generateUUID();

		expect(new UuidArrayVO([id], context).value).toEqual([id]);
	});

	it("wraps multiple UUIDs", () => {
		const ids = [generateUUID(), generateUUID()];

		expect(new UuidArrayVO(ids, context).value).toEqual(ids);
	});

	it("accepts an empty array", () => {
		expect(new UuidArrayVO([], context).value).toEqual([]);
	});

	it("rejects an element that is not a UUID", () => {
		expect(() => new UuidArrayVO(["not-a-uuid"], context)).toThrow(
			InvalidPropertyException,
		);
	});

	it("demo() falls back to an empty array", () => {
		expect(UuidArrayVO.demo(context).value).toEqual([]);
	});
});
