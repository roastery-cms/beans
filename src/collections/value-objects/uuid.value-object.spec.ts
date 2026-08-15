import { generateUUID } from "@/entity/helpers";
import { InvalidPropertyException } from "@roastery/terroir/exceptions/domain";
import { describe, expect, it } from "bun:test";
import { UuidVO } from "./uuid.value-object";

const context = { name: "id", source: "spec" };

describe("UuidVO", () => {
	it("wraps a valid UUID", () => {
		const id = generateUUID();

		expect(new UuidVO(id, context).value).toBe(id);
	});

	it("rejects a non-UUID value", () => {
		expect(() => new UuidVO("not-a-uuid", context)).toThrow(
			InvalidPropertyException,
		);
	});

	it("generate() wraps a valid, fresh UUID", () => {
		const generated = UuidVO.generate(context);

		expect(generated.value).toMatch(
			/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$/,
		);
	});

	it("generates a different id per call", () => {
		expect(UuidVO.generate(context).value).not.toBe(
			UuidVO.generate(context).value,
		);
	});

	it("demo() also generates a fresh UUID per instance", () => {
		expect(UuidVO.demo(context).value).not.toBe(UuidVO.demo(context).value);
	});
});
