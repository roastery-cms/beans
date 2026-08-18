import { InvalidPropertyException } from "@roastery/terroir/exceptions/domain";
import { describe, expect, it } from "bun:test";
import { DateTimeVO } from "./date-time.value-object";

const context = { name: "createdAt", source: "spec" };

describe("DateTimeVO", () => {
	it("wraps a valid ISO 8601 timestamp", () => {
		const iso = "2026-08-07T10:00:00.000Z";

		expect(new DateTimeVO(iso, context).value).toBe(iso);
	});

	it("rejects a non-ISO value", () => {
		expect(() => new DateTimeVO("not-a-date", context)).toThrow(
			InvalidPropertyException,
		);
	});

	it("demo() falls back to a valid, current timestamp", () => {
		const before = Date.now();
		const stamped = Date.parse(DateTimeVO.demo(context).value);

		expect(stamped).toBeGreaterThanOrEqual(before);
		expect(stamped).toBeLessThanOrEqual(Date.now());
	});

	it("now() wraps the current instant", () => {
		const before = Date.now();
		const stamped = Date.parse(DateTimeVO.now(context).value);

		expect(stamped).toBeGreaterThanOrEqual(before);
		expect(stamped).toBeLessThanOrEqual(Date.now());
	});
});
