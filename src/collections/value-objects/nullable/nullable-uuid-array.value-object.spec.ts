import { generateUUID } from "@/entity/helpers";
import { describe, expect, it } from "bun:test";
import { NullableUuidArrayVO } from "./nullable-uuid-array.value-object";

const context = { name: "authorIds", source: "post" } as const;

describe("NullableUuidArrayVO", () => {
	it("accepts `null`", () => {
		expect(new NullableUuidArrayVO(null, context).value).toBeNull();
	});

	it("accepts an empty array and an array of UUIDs", () => {
		const id = generateUUID();

		expect(new NullableUuidArrayVO([], context).value).toEqual([]);
		expect(new NullableUuidArrayVO([id], context).value).toEqual([id]);
	});

	it("demos to `null`, not `UuidArrayVO`'s `[]`", () => {
		expect(NullableUuidArrayVO.demo(context).value).toBeNull();
	});
});
