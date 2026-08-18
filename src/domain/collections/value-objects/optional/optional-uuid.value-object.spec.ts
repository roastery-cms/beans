import { generateUUID } from "@/domain/entity/helpers";
import { InvalidPropertyException } from "@roastery/terroir/exceptions/domain";
import { describe, expect, it } from "bun:test";
import { OptionalUuidVO } from "./optional-uuid.value-object";

const context = { name: "parentId", source: "post" } as const;

describe("OptionalUuidVO", () => {
	it("accepts `undefined`", () => {
		expect(new OptionalUuidVO(undefined, context).value).toBeUndefined();
	});

	it("accepts a real UUID", () => {
		const id = generateUUID();

		expect(new OptionalUuidVO(id, context).value).toBe(id);
	});

	it("rejects a non-UUID string", () => {
		expect(() => new OptionalUuidVO("not-a-uuid", context)).toThrow(
			InvalidPropertyException,
		);
	});

	it("demos to `undefined`, not `UuidVO`'s fresh-UUID thunk", () => {
		expect(OptionalUuidVO.demo(context).value).toBeUndefined();
	});
});
