import { InvalidPropertyException } from "@roastery/terroir/exceptions/domain";
import { describe, expect, it } from "bun:test";
import { NullableDateTimeVO } from "./nullable-date-time.value-object";

const context = { name: "deletedAt", source: "post" } as const;

describe("NullableDateTimeVO", () => {
	it("accepts `null`", () => {
		expect(new NullableDateTimeVO(null, context).value).toBeNull();
	});

	it("accepts a real ISO timestamp", () => {
		const iso = "2026-08-07T10:00:00.000Z";

		expect(new NullableDateTimeVO(iso, context).value).toBe(iso);
	});

	it("rejects a non-ISO string", () => {
		expect(() => new NullableDateTimeVO("not a date", context)).toThrow(
			InvalidPropertyException,
		);
	});

	it("demos to `null`, not the current-instant thunk", () => {
		expect(NullableDateTimeVO.demo(context).value).toBeNull();
	});
});
