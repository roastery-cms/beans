import { InvalidPropertyException } from "@roastery/terroir/exceptions/domain";
import { describe, expect, it } from "bun:test";
import { OptionalDateTimeVO } from "./optional-date-time.value-object";

const context = { name: "publishedAt", source: "post" } as const;

describe("OptionalDateTimeVO", () => {
	it("accepts `undefined`", () => {
		expect(new OptionalDateTimeVO(undefined, context).value).toBeUndefined();
	});

	it("accepts a real ISO timestamp", () => {
		const iso = "2026-08-07T10:00:00.000Z";

		expect(new OptionalDateTimeVO(iso, context).value).toBe(iso);
	});

	it("rejects a non-ISO string", () => {
		expect(() => new OptionalDateTimeVO("not a date", context)).toThrow(
			InvalidPropertyException,
		);
	});

	it("demos to `undefined`, not the current-instant thunk", () => {
		expect(OptionalDateTimeVO.demo(context).value).toBeUndefined();
	});
});
