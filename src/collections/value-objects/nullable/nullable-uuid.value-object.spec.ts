import { generateUUID } from "@/entity/helpers";
import { InvalidPropertyException } from "@roastery/terroir/exceptions/domain";
import { describe, expect, it } from "bun:test";
import { NullableUuidVO } from "./nullable-uuid.value-object";

const context = { name: "parentId", source: "post" } as const;

describe("NullableUuidVO", () => {
	it("accepts `null`", () => {
		expect(new NullableUuidVO(null, context).value).toBeNull();
	});

	it("accepts a real UUID", () => {
		const id = generateUUID();

		expect(new NullableUuidVO(id, context).value).toBe(id);
	});

	it("rejects a non-UUID string", () => {
		expect(() => new NullableUuidVO("not-a-uuid", context)).toThrow(
			InvalidPropertyException,
		);
	});

	it("demos to `null`, not `UuidVO`'s fresh-UUID thunk", () => {
		expect(NullableUuidVO.demo(context).value).toBeNull();
	});
});
