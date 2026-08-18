import { generateUUID } from "@/domain/entity/helpers";
import { describe, expect, it } from "bun:test";
import { OptionalUuidArrayVO } from "./optional-uuid-array.value-object";

const context = { name: "authorIds", source: "post" } as const;

describe("OptionalUuidArrayVO", () => {
	it("accepts `undefined`", () => {
		expect(new OptionalUuidArrayVO(undefined, context).value).toBeUndefined();
	});

	it("accepts an empty array and an array of UUIDs", () => {
		const id = generateUUID();

		expect(new OptionalUuidArrayVO([], context).value).toEqual([]);
		expect(new OptionalUuidArrayVO([id], context).value).toEqual([id]);
	});

	it("demos to `undefined`, not `UuidArrayVO`'s `[]`", () => {
		expect(OptionalUuidArrayVO.demo(context).value).toBeUndefined();
	});
});
